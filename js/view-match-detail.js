import { DB } from './db.js';
import { SportsConfig } from './sports-terms.js';

export const renderMatchDetail = async (container, matchId) => {
    let match, league, homeTeam, awayTeam, players = [], events = [];
    let terminology;

    container.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <button id="btn-back" class="btn" style="background: var(--text-muted);">← Volver a Partidos</button>
        </div>
        <div id="match-header" class="card" style="text-align: center; margin-bottom: 2rem;">
            <loading-state></loading-state>
        </div>
        
        <div id="events-section" style="display: none;">
            <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                <div class="card" style="flex: 1; min-width: 300px;">
                    <h3 id="lbl-add-event" style="margin-bottom: 1rem;">Registrar Anotación</h3>
                    <form id="form-event" style="display: flex; flex-direction: column; gap: 1rem;">
                        <select id="event-team" class="form-control" required></select>
                        <select id="event-player" class="form-control" required>
                            <option value="">Seleccione un equipo primero</option>
                        </select>
                        <input type="number" id="event-minute" class="form-control" placeholder="Minuto (Opcional)" min="1" max="120">
                        <button type="submit" class="btn btn-accent" id="btn-add-event">Agregar</button>
                    </form>
                    <hr style="margin: 1.5rem 0; border: 0; border-top: 1px solid var(--border-color);">
                    <div id="events-list"></div>
                </div>

                <div class="card" style="flex: 1; min-width: 300px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                    <div id="action-area"></div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-back').onclick = () => window.history.back();

    const header = document.getElementById('match-header');
    const eventsSection = document.getElementById('events-section');
    const formEvent = document.getElementById('form-event');
    const selectTeam = document.getElementById('event-team');
    const selectPlayer = document.getElementById('event-player');
    const eventsList = document.getElementById('events-list');
    const actionArea = document.getElementById('action-area');

    const loadMatchData = async () => {
        try {
            const data = await DB.executeTransaction(['matches', 'leagues', 'teams', 'players', 'events'], 'readonly', (txn) => {
                return Promise.all([
                    new Promise(res => txn.objectStore('matches').get(matchId).onsuccess = e => res(e.target.result)),
                    new Promise(res => {
                        const req = txn.objectStore('events').index('matchId').getAll(IDBKeyRange.only(matchId));
                        req.onsuccess = e => res(e.target.result);
                    })
                ]).then(async ([m, evts]) => {
                    if (!m) throw new Error("Partido no encontrado");
                    match = m;
                    events = evts;
                    
                    const lg = await new Promise(res => txn.objectStore('leagues').get(m.leagueId).onsuccess = e => res(e.target.result));
                    
                    const p1 = m.homeTeamId ? new Promise(res => txn.objectStore('teams').get(m.homeTeamId).onsuccess = e => res(e.target.result)) : Promise.resolve({ id: null, name: 'Por definir', stats: {} });
                    const p2 = m.awayTeamId ? new Promise(res => txn.objectStore('teams').get(m.awayTeamId).onsuccess = e => res(e.target.result)) : Promise.resolve({ id: null, name: 'Por definir', stats: {} });
                    
                    const [hT, aT] = await Promise.all([p1, p2]);
                    const allP = await new Promise(res => txn.objectStore('players').getAll().onsuccess = e => res(e.target.result));
                    const pList = allP.filter(p => p.teamId === hT.id || p.teamId === aT.id);
                    
                    return { lg, hT, aT, pList };
                });
            });

            league = data.lg;
            homeTeam = data.hT;
            awayTeam = data.aT;
            players = data.pList;
            terminology = SportsConfig[league.sport].terms;

            renderUI();
        } catch (error) {
            header.innerHTML = '<p style="color: red;">Error cargando el partido.</p>';
        }
    };

    const renderUI = () => {
        eventsSection.style.display = (homeTeam.id && awayTeam.id) ? 'block' : 'none';
        
        const homeScore = events.filter(e => e.teamId === homeTeam.id).length;
        const awayScore = events.filter(e => e.teamId === awayTeam.id).length;

        header.innerHTML = `
            <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">
                ${new Date(match.date).toLocaleString()} | ${league.modality === 'eliminacion' && match.round ? match.round : 'Temporada Regular'}
            </div>
            <div style="display: flex; justify-content: center; align-items: center; gap: 2rem;">
                <h2 style="margin: 0; flex: 1; text-align: right; color: var(--text-main);">${homeTeam.name}</h2>
                <div style="font-size: 3rem; font-weight: bold; color: var(--accent-color); background: #eee; padding: 0.5rem 1.5rem; border-radius: 8px;">
                    ${homeScore} - ${awayScore}
                </div>
                <h2 style="margin: 0; flex: 1; text-align: left; color: var(--text-main);">${awayTeam.name}</h2>
            </div>
            <div style="margin-top: 1rem; font-weight: bold; color: ${match.status === 'Finalizado' ? '#27ae60' : '#f39c12'};">
                ${match.status.toUpperCase()}
            </div>
        `;

        if (match.status === 'Programado' && homeTeam.id && awayTeam.id) {
            formEvent.style.display = 'flex';
            document.getElementById('lbl-add-event').textContent = `Registrar ${terminology.event}`;
            
            selectTeam.innerHTML = `
                <option value="">Seleccione el equipo...</option>
                <option value="${homeTeam.id}">${homeTeam.name}</option>
                <option value="${awayTeam.id}">${awayTeam.name}</option>
            `;
            
            actionArea.innerHTML = `
                <h3 style="margin-bottom: 1rem;">Cerrar Partido</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">Al finalizar, se actualizarán las tablas de posiciones y estadísticas.</p>
                <button id="btn-finalize" class="btn btn-accent" style="font-size: 1.1rem; padding: 1rem 2rem; background: #27ae60;">Finalizar Partido</button>
            `;
            document.getElementById('btn-finalize').onclick = finalizeMatch;
        } else if (match.status === 'Finalizado') {
            formEvent.style.display = 'none';
            actionArea.innerHTML = `
                <h3 style="margin-bottom: 1rem;">Partido Cerrado</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">Las estadísticas ya fueron sumadas a la liga.</p>
                <button id="btn-undo" class="btn" style="background: #e74c3c;">Deshacer Partido</button>
            `;
            document.getElementById('btn-undo').onclick = undoMatch;
        }

        renderEventsList();
    };

    const renderEventsList = () => {
        eventsList.innerHTML = '';
        if (events.length === 0) {
            eventsList.innerHTML = `<p style="color: var(--text-muted); font-style: italic;">No hay ${terminology.event.toLowerCase()}s registrados.</p>`;
            return;
        }

        events.forEach(ev => {
            const p = players.find(x => x.id === ev.playerId);
            const t = ev.teamId === homeTeam.id ? homeTeam : awayTeam;
            eventsList.innerHTML += `
                <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f1f1f1;">
                    <span><b>${p ? p.name : 'Desconocido'}</b> (${t.name})</span>
                    <span>Min ${ev.minute || '-'} ${match.status === 'Programado' ? `<button class="btn-del-evt" data-id="${ev.id}" style="color: red; background: none; border: none; cursor: pointer; margin-left: 10px;">✖</button>` : ''}</span>
                </div>
            `;
        });

        document.querySelectorAll('.btn-del-evt').forEach(btn => {
            btn.onclick = async (e) => {
                const id = parseInt(e.target.dataset.id);
                await DB.executeTransaction(['events'], 'readwrite', txn => txn.objectStore('events').delete(id));
                loadMatchData();
            };
        });
    };

    selectTeam.addEventListener('change', () => {
        const tId = parseInt(selectTeam.value);
        selectPlayer.innerHTML = '<option value="">Seleccione jugador...</option>';
        players.filter(p => p.teamId === tId).forEach(p => {
            selectPlayer.innerHTML += `<option value="${p.id}">#${p.number} - ${p.name}</option>`;
        });
    });

    formEvent.onsubmit = async (e) => {
        e.preventDefault();
        const newEvent = {
            matchId: match.id,
            teamId: parseInt(selectTeam.value),
            playerId: parseInt(selectPlayer.value),
            minute: document.getElementById('event-minute').value || null,
            type: terminology.event
        };
        await DB.executeTransaction(['events'], 'readwrite', txn => txn.objectStore('events').add(newEvent));
        formEvent.reset();
        selectPlayer.innerHTML = '<option value="">Seleccione un equipo primero</option>';
        loadMatchData();
    };

    const finalizeMatch = async () => {
        const homeScore = events.filter(e => e.teamId === homeTeam.id).length;
        const awayScore = events.filter(e => e.teamId === awayTeam.id).length;

        if (league.modality === 'eliminacion' && homeScore === awayScore) {
            ToastNotification.show('En eliminación directa no hay empates. Añade una anotación de desempate.', 'error');
            return;
        }

        const confirmed = await ConfirmDialog.request('¿Finalizar Partido?', 'Se sumarán los puntos y estadísticas. Esta acción se puede deshacer luego.');
        if (!confirmed) return;

        try {
            await DB.executeTransaction(['matches', 'teams', 'players'], 'readwrite', (txn) => {
                const matchStore = txn.objectStore('matches');
                const teamStore = txn.objectStore('teams');
                const playerStore = txn.objectStore('players');

                match.status = 'Finalizado';
                match.score = { home: homeScore, away: awayScore };
                matchStore.put(match);

                let hPts = 0, aPts = 0;
                if (homeScore > awayScore) { homeTeam.stats.won++; awayTeam.stats.lost++; hPts = 3; }
                else if (homeScore < awayScore) { awayTeam.stats.won++; homeTeam.stats.lost++; aPts = 3; }
                else { homeTeam.stats.drawn++; awayTeam.stats.drawn++; hPts = 1; aPts = 1; }

                homeTeam.stats.played++; homeTeam.stats.pointsFor += homeScore; homeTeam.stats.pointsAgainst += awayScore; homeTeam.stats.points += hPts;
                teamStore.put(homeTeam);

                awayTeam.stats.played++; awayTeam.stats.pointsFor += awayScore; awayTeam.stats.pointsAgainst += homeScore; awayTeam.stats.points += aPts;
                teamStore.put(awayTeam);

                const scorersIds = [...new Set(events.map(e => e.playerId))];
                scorersIds.forEach(id => {
                    const p = players.find(x => x.id === id);
                    if (p) {
                        p.stats.played++; 
                        p.stats.goals += events.filter(e => e.playerId === id).length;
                        playerStore.put(p);
                    }
                });

                if (league.modality === 'eliminacion' && match.nextMatchKey) {
                    const reqMatches = matchStore.index('leagueId').getAll(IDBKeyRange.only(league.id));
                    reqMatches.onsuccess = (e) => {
                        const allM = e.target.result;
                        const nextMatch = allM.find(m => m.bracketKey === match.nextMatchKey);
                        if (nextMatch) {
                            nextMatch[match.nextSlot] = homeScore > awayScore ? homeTeam.id : awayTeam.id;
                            matchStore.put(nextMatch);
                        }
                    };
                }
            });

            ToastNotification.show('Partido finalizado correctamente');
            loadMatchData();
        } catch (error) {
            ToastNotification.show('Error en la transacción', 'error');
        }
    };

    const undoMatch = async () => {
        try {
            await DB.executeTransaction(['matches', 'teams', 'players'], 'readwrite', (txn) => {
                return new Promise((resolve, reject) => {
                    if (league.modality === 'eliminacion' && match.nextMatchKey) {
                        const reqMatches = txn.objectStore('matches').index('leagueId').getAll(IDBKeyRange.only(league.id));
                        reqMatches.onsuccess = (e) => {
                            const allM = e.target.result;
                            const nextMatch = allM.find(m => m.bracketKey === match.nextMatchKey);
                            if (nextMatch && nextMatch.status === 'Finalizado') {
                                reject(new Error('No se puede deshacer. El partido de la siguiente ronda ya finalizó.'));
                                return;
                            }
                            if (nextMatch) {
                                nextMatch[match.nextSlot] = null;
                                txn.objectStore('matches').put(nextMatch);
                            }
                            resolve(proceedWithUndo(txn));
                        };
                    } else {
                        resolve(proceedWithUndo(txn));
                    }
                });
            });

            ToastNotification.show('Partido revertido a Programado');
            loadMatchData();
        } catch (error) {
            ToastNotification.show(error.message || 'Error al revertir', 'error');
        }
    };

    const proceedWithUndo = (txn) => {
        const matchStore = txn.objectStore('matches');
        const teamStore = txn.objectStore('teams');
        const playerStore = txn.objectStore('players');

        const homeScore = match.score.home;
        const awayScore = match.score.away;

        match.status = 'Programado';
        match.score = { home: 0, away: 0 };
        matchStore.put(match);

        let hPts = 0, aPts = 0;
        if (homeScore > awayScore) { homeTeam.stats.won--; awayTeam.stats.lost--; hPts = 3; }
        else if (homeScore < awayScore) { awayTeam.stats.won--; homeTeam.stats.lost--; aPts = 3; }
        else { homeTeam.stats.drawn--; awayTeam.stats.drawn--; hPts = 1; aPts = 1; }

        homeTeam.stats.played--; homeTeam.stats.pointsFor -= homeScore; homeTeam.stats.pointsAgainst -= awayScore; homeTeam.stats.points -= hPts;
        teamStore.put(homeTeam);

        awayTeam.stats.played--; awayTeam.stats.pointsFor -= awayScore; awayTeam.stats.pointsAgainst -= homeScore; awayTeam.stats.points -= aPts;
        teamStore.put(awayTeam);

        const scorersIds = [...new Set(events.map(e => e.playerId))];
        scorersIds.forEach(id => {
            const p = players.find(x => x.id === id);
            if (p) {
                p.stats.played--; 
                p.stats.goals -= events.filter(e => e.playerId === id).length;
                playerStore.put(p);
            }
        });
    };

    loadMatchData();
};
