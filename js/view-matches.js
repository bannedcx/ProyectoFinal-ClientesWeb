import { DB } from './db.js';
import { App } from './app.js';

export const renderMatches = async (container) => {
    if (!App.activeLeagueId) return;

    let league = null;
    let teams = [];
    let allMatches = [];

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h2>Gestión de Partidos</h2>
            <button id="btn-new-match" class="btn btn-accent" style="display: none;">+ Programar Partido</button>
        </div>
        
        <!-- Filtros (Cumple requerimiento 4.7.1) -->
        <div class="card" style="margin-bottom: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
            <select id="filter-status" class="form-control" style="flex: 1; min-width: 150px;">
                <option value="">Todos los estados</option>
                <option value="Programado">Programados</option>
                <option value="Finalizado">Finalizados</option>
            </select>
            <select id="filter-team" class="form-control" style="flex: 1; min-width: 150px;">
                <option value="">Todos los equipos</option>
            </select>
            <input type="date" id="filter-date" class="form-control" style="flex: 1; min-width: 150px;">
        </div>

        <div id="matches-grid" style="display: flex; flex-direction: column; gap: 1rem;">
            <loading-state></loading-state>
        </div>

        <!-- Modal Formulario (Solo aplica para modalidad 'Liga') -->
        <div id="modal-match" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 1000; align-items: center; justify-content: center;">
            <div class="card" style="width: 100%; max-width: 500px;">
                <h3 style="margin-bottom: 1.5rem;">Programar Partido</h3>
                <form id="form-match">
                    <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label>Equipo Local *</label>
                            <select id="match-home" class="form-control" required></select>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Equipo Visitante *</label>
                            <select id="match-away" class="form-control" required></select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Fecha y Hora *</label>
                        <input type="datetime-local" id="match-date" class="form-control" required>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                        <button type="button" id="btn-cancel-match" class="btn" style="background: var(--text-muted);">Cancelar</button>
                        <button type="submit" class="btn btn-accent">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const grid = document.getElementById('matches-grid');
    const modal = document.getElementById('modal-match');
    const form = document.getElementById('form-match');
    const filterStatus = document.getElementById('filter-status');
    const filterTeam = document.getElementById('filter-team');
    const filterDate = document.getElementById('filter-date');
    const selectHome = document.getElementById('match-home');
    const selectAway = document.getElementById('match-away');
    const btnNewMatch = document.getElementById('btn-new-match');

    // 1. Cargar contexto inicial (Liga y Equipos)
    const loadContext = async () => {
        try {
            const data = await DB.executeTransaction(['leagues', 'teams'], 'readonly', (txn) => {
                return Promise.all([
                    new Promise((res, rej) => {
                        const req = txn.objectStore('leagues').get(App.activeLeagueId);
                        req.onsuccess = () => res(req.result);
                        req.onerror = () => rej(req.error);
                    }),
                    new Promise((res, rej) => {
                        const req = txn.objectStore('teams').index('leagueId').getAll(IDBKeyRange.only(App.activeLeagueId));
                        req.onsuccess = () => res(req.result);
                        req.onerror = () => rej(req.error);
                    })
                ]);
            });

            league = data[0];
            teams = data[1];

            // RNF: Habilitar creación manual SOLO si es modalidad "Liga"
            if (league.modality === 'liga') {
                btnNewMatch.style.display = 'block';
                populateTeamSelects();
            }

            loadMatches();
        } catch (error) {
            grid.innerHTML = '<p style="color: red;">Error cargando contexto de la liga.</p>';
        }
    };

    const populateTeamSelects = () => {
        let options = '<option value="">Selecciona un equipo...</option>';
        teams.forEach(t => options += `<option value="${t.id}">${t.name}</option>`);
        
        selectHome.innerHTML = options;
        selectAway.innerHTML = options;
        
        // El filtro de equipos también se alimenta de aquí
        let filterOptions = '<option value="">Todos los equipos</option>';
        teams.forEach(t => filterOptions += `<option value="${t.id}">${t.name}</option>`);
        filterTeam.innerHTML = filterOptions;
    };

    // 2. Cargar Partidos desde BD
    const loadMatches = async () => {
        try {
            allMatches = await DB.executeTransaction(['matches'], 'readonly', (txn) => {
                return new Promise((res, rej) => {
                    const req = txn.objectStore('matches').index('leagueId').getAll(IDBKeyRange.only(App.activeLeagueId));
                    req.onsuccess = () => res(req.result);
                    req.onerror = () => rej(req.error);
                });
            });
            
            // Ordenar por fecha descendente por defecto
            allMatches.sort((a, b) => new Date(b.date) - new Date(a.date));
            applyFilters();
        } catch (error) {
            grid.innerHTML = '<p style="color: red;">Error cargando partidos.</p>';
        }
    };

    // 3. Renderizado y Filtros combinados
    const applyFilters = () => {
        const status = filterStatus.value;
        const teamId = filterTeam.value ? parseInt(filterTeam.value) : null;
        const dateStr = filterDate.value; // Formato YYYY-MM-DD

        const filtered = allMatches.filter(m => {
            const matchDate = m.date.split('T')[0];
            return (status ? m.status === status : true) &&
                   (teamId ? (m.homeTeamId === teamId || m.awayTeamId === teamId) : true) &&
                   (dateStr ? matchDate === dateStr : true);
        });

        renderGrid(filtered);
    };

    filterStatus.addEventListener('change', applyFilters);
    filterTeam.addEventListener('change', applyFilters);
    filterDate.addEventListener('change', applyFilters);

    const renderGrid = (matchesToRender) => {
        grid.innerHTML = '';

        if (matchesToRender.length === 0) {
            grid.innerHTML = '<div class="card"><p style="color: var(--text-muted); text-align: center; margin: 0;">No hay partidos registrados con estos filtros.</p></div>';
            return;
        }

        matchesToRender.forEach(match => {
            const home = teams.find(t => t.id === match.homeTeamId);
            const away = teams.find(t => t.id === match.awayTeamId);
            if (!home || !away) return; // Protección de integridad

            const card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = 'display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: transform 0.2s;';
            card.onmouseover = () => card.style.transform = 'translateY(-2px)';
            card.onmouseout = () => card.style.transform = 'translateY(0)';
            
            // Al hacer clic, navega al detalle del partido
            card.onclick = (e) => {
                if (!e.target.classList.contains('btn-delete-match')) {
                    window.location.hash = `#match/${match.id}`;
                }
            };

            const dateObj = new Date(match.date);
            const formattedDate = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // RNF: Mostrar ronda si es eliminación directa
            const roundBadge = league.modality === 'eliminacion' && match.round 
                ? `<span style="background: var(--text-main); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-bottom: 0.5rem; display: inline-block;">${match.round}</span>` 
                : '';

            const scoreDisplay = match.status === 'Finalizado' 
                ? `<h2 style="margin: 0; color: var(--accent-color);">${match.score.home} - ${match.score.away}</h2>`
                : `<span style="font-weight: bold; color: var(--text-muted);">VS</span>`;

            card.innerHTML = `
                <div style="flex: 1; text-align: right;">
                    <h3 style="margin: 0; color: var(--text-main);">${home.name}</h3>
                </div>
                <div style="flex: 1; text-align: center; padding: 0 1rem; border-left: 1px solid #eee; border-right: 1px solid #eee; margin: 0 1rem;">
                    ${roundBadge}
                    ${scoreDisplay}
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">${formattedDate}</div>
                    <div style="font-size: 0.8rem; font-weight: bold; color: ${match.status === 'Finalizado' ? '#27ae60' : '#f39c12'}; margin-top: 0.25rem;">
                        ${match.status.toUpperCase()}
                    </div>
                </div>
                <div style="flex: 1; text-align: left;">
                    <h3 style="margin: 0; color: var(--text-main);">${away.name}</h3>
                </div>
                
                ${league.modality === 'liga' && match.status === 'Programado' ? `
                    <button class="btn btn-delete-match" data-id="${match.id}" style="background: transparent; color: #e74c3c; border: 1px solid #e74c3c; padding: 0.25rem 0.5rem; position: absolute; right: 1rem; top: 1rem;">X</button>
                ` : ''}
            `;
            grid.appendChild(card);
        });

        // Evento de borrado (Solo visible y aplicable para Liga -> Programados)
        grid.querySelectorAll('.btn-delete-match').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const id = parseInt(e.target.dataset.id);
                const confirmed = await ConfirmDialog.request('¿Eliminar Partido?', 'Solo se pueden eliminar partidos programados.');
                if (confirmed) deleteMatch(id);
            };
        });
    };

    // 4. Crear Partido (Validaciones exigidas por el documento)
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const homeId = parseInt(selectHome.value);
        const awayId = parseInt(selectAway.value);
        const dateVal = document.getElementById('match-date').value;

        if (homeId === awayId) {
            ToastNotification.show('Un equipo no puede jugar contra sí mismo', 'error');
            return;
        }

        // Validar que no exista un partido idéntico (mismos equipos, misma fecha)
        const isDuplicate = allMatches.some(m => 
            ((m.homeTeamId === homeId && m.awayTeamId === awayId) || (m.homeTeamId === awayId && m.awayTeamId === homeId)) &&
            m.date === dateVal
        );

        if (isDuplicate) {
            ToastNotification.show('Ya existe este encuentro en esa fecha exacta', 'error');
            return;
        }

        const newMatch = {
            leagueId: App.activeLeagueId,
            homeTeamId: homeId,
            awayTeamId: awayId,
            date: dateVal,
            status: 'Programado',
            score: { home: 0, away: 0 }
        };

        try {
            await DB.executeTransaction(['matches'], 'readwrite', (txn) => {
                txn.objectStore('matches').add(newMatch);
            });
            ToastNotification.show('Partido programado');
            modal.style.display = 'none';
            form.reset();
            loadMatches(); // Recarga la cuadrícula
        } catch (error) {
            ToastNotification.show('Error al guardar el partido', 'error');
        }
    };

    const deleteMatch = async (id) => {
        try {
            await DB.executeTransaction(['matches'], 'readwrite', (txn) => {
                txn.objectStore('matches').delete(id);
            });
            ToastNotification.show('Partido eliminado');
            loadMatches();
        } catch (error) {
            ToastNotification.show('Error al eliminar', 'error');
        }
    };

    // Eventos UI de Modal
    btnNewMatch.onclick = () => {
        if (teams.length < 2) {
            ToastNotification.show('Necesitas al menos 2 equipos registrados', 'error');
            return;
        }
        modal.style.display = 'flex';
    };
    document.getElementById('btn-cancel-match').onclick = () => {
        modal.style.display = 'none';
        form.reset();
    };

    loadContext();
};
