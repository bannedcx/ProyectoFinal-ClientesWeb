import { DB } from './db.js';
import { App } from './app.js';
import { SportsConfig } from './sports-terms.js';

export const renderDashboard = async (container) => {
    if (!App.activeLeagueId) return;

    container.innerHTML = `
        <div id="dash-header" style="margin-bottom: 2rem; border-bottom: 2px solid var(--border-color); padding-bottom: 1rem;">
            <loading-state></loading-state>
        </div>
        
        <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 2rem;">
            <div class="card" style="flex: 1; min-width: 250px;" id="card-last-match">
                <h4 style="color: var(--text-muted); margin-bottom: 1rem;">Último Resultado</h4>
                <div id="content-last-match">Cargando...</div>
            </div>
            <div class="card" style="flex: 1; min-width: 250px;" id="card-next-match">
                <h4 style="color: var(--text-muted); margin-bottom: 1rem;">Próximo Partido</h4>
                <div id="content-next-match">Cargando...</div>
            </div>
        </div>

        <h3 style="margin-bottom: 1rem;">Resumen de la Liga</h3>
        <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
            <div class="card" style="flex: 1; min-width: 300px;"><canvas id="chart-win-rate"></canvas></div>
            <div class="card" style="flex: 1; min-width: 300px;"><canvas id="chart-goals-trend"></canvas></div>
            <div class="card" style="flex: 1; min-width: 300px;"><canvas id="chart-top-teams"></canvas></div>
        </div>
    `;

    try {
        const data = await DB.executeTransaction(['leagues', 'teams', 'matches'], 'readonly', async (txn) => {
            const l = await new Promise(res => txn.objectStore('leagues').get(App.activeLeagueId).onsuccess = e => res(e.target.result));
            const t = await new Promise(res => txn.objectStore('teams').index('leagueId').getAll(IDBKeyRange.only(App.activeLeagueId)).onsuccess = e => res(e.target.result));
            const m = await new Promise(res => txn.objectStore('matches').index('leagueId').getAll(IDBKeyRange.only(App.activeLeagueId)).onsuccess = e => res(e.target.result));
            return { l, t, m };
        });

        // 1. Cabecera dinámica
        const config = SportsConfig[data.l.sport];
        document.getElementById('dash-header').innerHTML = `
            <h1 style="color: var(--text-main); margin-bottom: 0.5rem;">${data.l.name}</h1>
            <span style="background: ${config.colors.primary}; color: white; padding: 4px 12px; border-radius: 15px; font-size: 0.9rem;">
                ${config.icon} ${config.name} | Temporada ${data.l.season}
            </span>
        `;

        // 2. Partidos
        const finishedMatches = data.m.filter(x => x.status === 'Finalizado').sort((a, b) => new Date(b.date) - new Date(a.date));
        const scheduledMatches = data.m.filter(x => x.status === 'Programado').sort((a, b) => new Date(a.date) - new Date(b.date));

        const getTeamName = id => data.t.find(team => team.id === id)?.name || '???';

        const lastMatchContainer = document.getElementById('content-last-match');
        if (finishedMatches.length > 0) {
            const m = finishedMatches[0];
            lastMatchContainer.innerHTML = `
                <div style="text-align: center;">
                    <h2 style="margin: 0; color: var(--accent-color); font-size: 2rem;">${m.score.home} - ${m.score.away}</h2>
                    <p style="margin: 0.5rem 0; font-weight: bold;">${getTeamName(m.homeTeamId)} vs ${getTeamName(m.awayTeamId)}</p>
                    <a href="#match/${m.id}" class="btn" style="font-size: 0.8rem;">Ver Detalle</a>
                </div>
            `;
        } else {
            lastMatchContainer.innerHTML = `<p style="color: var(--text-muted);">No hay partidos jugados.</p>`;
        }

        const nextMatchContainer = document.getElementById('content-next-match');
        if (scheduledMatches.length > 0) {
            const m = scheduledMatches[0];
            nextMatchContainer.innerHTML = `
                <div style="text-align: center;">
                    <p style="margin: 0.5rem 0; font-weight: bold;">${getTeamName(m.homeTeamId)} vs ${getTeamName(m.awayTeamId)}</p>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">${new Date(m.date).toLocaleString()}</p>
                    <a href="#match/${m.id}" class="btn" style="font-size: 0.8rem;">Ir al partido</a>
                </div>
            `;
        } else {
            nextMatchContainer.innerHTML = `<p style="color: var(--text-muted);">No hay partidos programados en el calendario.</p>`;
        }

        // 3. Gráficos (Chart.js)
        const sortedTeams = [...data.t].sort((a, b) => b.stats.points - a.stats.points);
        
        // Gráfico 4: Distribución de Resultados (Torta)
        let totalW = 0, totalD = 0, totalL = 0;
        data.t.forEach(team => { totalW += team.stats.won; totalD += team.stats.drawn; totalL += team.stats.lost; });
        
        new Chart(document.getElementById('chart-win-rate'), {
            type: 'pie',
            data: {
                labels: ['Victorias locales/visitantes', 'Empates'],
                datasets: [{ data: [totalW, (totalD/2)], backgroundColor: ['#27ae60', '#f39c12'] }]
            },
            options: { plugins: { title: { display: true, text: 'Distribución Global de Resultados' } } }
        });

        // Gráfico 5: Top Equipos por Puntos (Barras)
        new Chart(document.getElementById('chart-top-teams'), {
            type: 'bar',
            data: {
                labels: sortedTeams.slice(0, 5).map(t => t.name),
                datasets: [{ label: 'Puntos', data: sortedTeams.slice(0, 5).map(t => t.stats.points), backgroundColor: config.colors.primary }]
            },
            options: { plugins: { title: { display: true, text: 'Top 5 Equipos Actuales' } } }
        });

        // Gráfico 6: Puntos a favor del Top 5 (Líneas polares)
        new Chart(document.getElementById('chart-goals-trend'), {
            type: 'polarArea',
            data: {
                labels: sortedTeams.slice(0, 5).map(t => t.name),
                datasets: [{ label: config.terms.pointsFor, data: sortedTeams.slice(0, 5).map(t => t.stats.pointsFor), backgroundColor: sortedTeams.slice(0, 5).map(t => t.color2) }]
            },
            options: { plugins: { title: { display: true, text: `${config.terms.pointsFor} del Top 5` } } }
        });

    } catch (error) {
        container.innerHTML += '<p style="color: red;">Error cargando el dashboard.</p>';
    }
};
