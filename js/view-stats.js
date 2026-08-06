import { DB } from './db.js';
import { App } from './app.js';
import { SportsConfig } from './sports-terms.js';

export const renderStats = async (container) => {
    if (!App.activeLeagueId) return;

    container.innerHTML = `
        <div style="margin-bottom: 2rem;">
            <h2>Estadísticas Generales</h2>
        </div>
        
        <div class="card" style="margin-bottom: 2rem; overflow-x: auto;">
            <h3 style="margin-bottom: 1rem;">Tabla de Posiciones</h3>
            <table style="width: 100%; border-collapse: collapse; min-width: 600px;" id="standings-table">
                <thead>
                    <tr style="background: var(--bg-color); border-bottom: 2px solid var(--border-color); text-align: center;">
                        <th style="padding: 1rem; text-align: left;">Pos</th>
                        <th style="padding: 1rem; text-align: left;">Equipo</th>
                        <th title="Partidos Jugados">PJ</th>
                        <th title="Partidos Ganados">PG</th>
                        <th title="Partidos Empatados">PE</th>
                        <th title="Partidos Perdidos">PP</th>
                        <th id="lbl-pf" title="A favor">PF</th>
                        <th id="lbl-pc" title="En contra">PC</th>
                        <th title="Diferencia">DIF</th>
                        <th>PTS</th>
                    </tr>
                </thead>
                <tbody id="standings-body"></tbody>
            </table>
        </div>

        <div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 2rem;">
            <div class="card" style="flex: 1; min-width: 300px;">
                <h3 style="margin-bottom: 1rem;" id="lbl-top-scorers">Top 10 Anotadores</h3>
                <div id="top-scorers-list"></div>
            </div>
            <div class="card" style="flex: 1; min-width: 300px;">
                <canvas id="chart-scorers"></canvas>
            </div>
        </div>

        <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
            <div class="card" style="flex: 1; min-width: 300px;"><canvas id="chart-team-points"></canvas></div>
            <div class="card" style="flex: 1; min-width: 300px;"><canvas id="chart-team-efficiency"></canvas></div>
        </div>
    `;

    try {
        const data = await DB.executeTransaction(['leagues', 'teams', 'players'], 'readonly', async (txn) => {
            const l = await new Promise(res => txn.objectStore('leagues').get(App.activeLeagueId).onsuccess = e => res(e.target.result));
            const t = await new Promise(res => txn.objectStore('teams').index('leagueId').getAll(IDBKeyRange.only(App.activeLeagueId)).onsuccess = e => res(e.target.result));
            
            const allP = await new Promise(res => txn.objectStore('players').getAll().onsuccess = e => res(e.target.result));
            const p = allP.filter(player => t.some(team => team.id === player.teamId));
            
            return { l, t, p };
        });

        const terminology = SportsConfig[data.l.sport].terms;
        
        // Adaptación de terminología (Cumple 1.3.1)
        document.getElementById('lbl-pf').textContent = terminology.pointsFor;
        document.getElementById('lbl-pc').textContent = terminology.pointsAgainst;
        document.getElementById('lbl-top-scorers').textContent = `Top 10 ${terminology.scorersRanking}`;

        // 1. Lógica de Tabla de Posiciones
        const sortedTeams = [...data.t].sort((a, b) => {
            if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points; // 1. Puntos
            const diffA = a.stats.pointsFor - a.stats.pointsAgainst;
            const diffB = b.stats.pointsFor - b.stats.pointsAgainst;
            if (diffB !== diffA) return diffB - diffA; // 2. Diferencia
            return b.stats.pointsFor - a.stats.pointsFor; // 3. A favor
        });

        const tbody = document.getElementById('standings-body');
        sortedTeams.forEach((team, index) => {
            const diff = team.stats.pointsFor - team.stats.pointsAgainst;
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #eee; text-align: center;">
                    <td style="padding: 0.75rem; text-align: left; font-weight: bold;">${index + 1}</td>
                    <td style="padding: 0.75rem; text-align: left;">
                        <a href="#team/${team.id}" style="color: var(--text-main); text-decoration: none; font-weight: 500;">${team.name}</a>
                    </td>
                    <td>${team.stats.played}</td>
                    <td>${team.stats.won}</td>
                    <td>${team.stats.drawn}</td>
                    <td>${team.stats.lost}</td>
                    <td>${team.stats.pointsFor}</td>
                    <td>${team.stats.pointsAgainst}</td>
                    <td style="color: ${diff > 0 ? '#27ae60' : diff < 0 ? '#e74c3c' : 'inherit'}">${diff > 0 ? '+'+diff : diff}</td>
                    <td style="font-weight: bold; color: var(--accent-color); font-size: 1.1rem;">${team.stats.points}</td>
                </tr>
            `;
        });

        // 2. Lógica Top 10 Jugadores
        const topPlayers = [...data.p].sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 10);
        const scorersList = document.getElementById('top-scorers-list');
        
        if (topPlayers.length === 0 || topPlayers[0].stats.goals === 0) {
            scorersList.innerHTML = `<p style="color: var(--text-muted);">No hay anotaciones registradas aún.</p>`;
        } else {
            topPlayers.forEach((p, i) => {
                if(p.stats.goals === 0) return;
                const team = data.t.find(t => t.id === p.teamId);
                scorersList.innerHTML += `
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                        <span><b>${i+1}.</b> <a href="#player/${p.id}" style="text-decoration: none; color: var(--text-main);">${p.name}</a> <span style="font-size: 0.8rem; color: var(--text-muted);">(${team.name})</span></span>
                        <span style="font-weight: bold; color: var(--accent-color);">${p.stats.goals}</span>
                    </div>
                `;
            });
        }

        // 3. Renderizado de Gráficos (Chart.js)
        const teamNames = sortedTeams.map(t => t.name);
        
        // Gráfico 1: Goles/Puntos por jugador (Barras Horizontales)
        new Chart(document.getElementById('chart-scorers'), {
            type: 'bar',
            data: {
                labels: topPlayers.filter(p => p.stats.goals > 0).map(p => p.name),
                datasets: [{ label: terminology.individualScore, data: topPlayers.filter(p => p.stats.goals > 0).map(p => p.stats.goals), backgroundColor: SportsConfig[data.l.sport].colors.primary }]
            },
            options: { indexAxis: 'y', plugins: { title: { display: true, text: `Top ${terminology.scorersRanking}` } } }
        });

        // Gráfico 2: Puntos de Equipos (Doughnut)
        new Chart(document.getElementById('chart-team-points'), {
            type: 'doughnut',
            data: {
                labels: teamNames,
                datasets: [{ data: sortedTeams.map(t => t.stats.points), backgroundColor: sortedTeams.map(t => t.color1) }]
            },
            options: { plugins: { title: { display: true, text: 'Distribución de Puntos en la Liga' } } }
        });

        // Gráfico 3: Comparativa a Favor vs En Contra (Radar)
        new Chart(document.getElementById('chart-team-efficiency'), {
            type: 'radar',
            data: {
                labels: teamNames,
                datasets: [
                    { label: terminology.pointsFor, data: sortedTeams.map(t => t.stats.pointsFor), borderColor: '#27ae60', backgroundColor: 'rgba(39, 174, 96, 0.2)' },
                    { label: terminology.pointsAgainst, data: sortedTeams.map(t => t.stats.pointsAgainst), borderColor: '#e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.2)' }
                ]
            },
            options: { plugins: { title: { display: true, text: 'Eficiencia Ofensiva / Defensiva' } } }
        });

    } catch (error) {
        container.innerHTML = '<p style="color: red;">Error cargando estadísticas.</p>';
    }
};
