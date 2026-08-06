import { DB } from './db.js';
import { App } from './app.js';

export const renderPlayers = async (container) => {
    if (!App.activeLeagueId) return;

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h2>Jugadores</h2>
            <button id="btn-new-player" class="btn btn-accent">+ Registrar Jugador</button>
        </div>
        
        <!-- Panel de Filtros -->
        <div class="card" style="margin-bottom: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
            <input type="text" id="filter-name" class="form-control" placeholder="Buscar por nombre..." style="flex: 1; min-width: 200px;">
            <select id="filter-team" class="form-control" style="flex: 1; min-width: 150px;">
                <option value="">Todos los equipos</option>
            </select>
            <select id="filter-position" class="form-control" style="flex: 1; min-width: 150px;">
                <option value="">Todas las posiciones</option>
            </select>
        </div>

        <div id="players-grid" class="card-grid">
            <loading-state></loading-state>
        </div>

        <!-- Modal Formulario -->
        <div id="modal-player" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 1000; align-items: center; justify-content: center;">
            <div class="card" style="width: 100%; max-width: 450px;">
                <h3 style="margin-bottom: 1.5rem;">Nuevo Jugador</h3>
                <form id="form-player">
                    <div class="form-group">
                        <label>Equipo *</label>
                        <select id="player-team" class="form-control" required></select>
                    </div>
                    <div class="form-group">
                        <label>Nombre Completo *</label>
                        <input type="text" id="player-name" class="form-control" required>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label>Número *</label>
                            <input type="number" id="player-number" class="form-control" min="0" max="99" required>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Posición</label>
                            <input type="text" id="player-position" class="form-control" placeholder="Ej: Delantero">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>URL Foto (Opcional)</label>
                        <input type="url" id="player-photo" class="form-control" placeholder="https://...">
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
                        <button type="button" id="btn-cancel-player" class="btn" style="background: var(--text-muted);">Cancelar</button>
                        <button type="submit" class="btn btn-accent">Guardar Jugador</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const grid = document.getElementById('players-grid');
    const modal = document.getElementById('modal-player');
    const form = document.getElementById('form-player');
    const filterName = document.getElementById('filter-name');
    const filterTeam = document.getElementById('filter-team');
    const filterPosition = document.getElementById('filter-position');
    const selectTeam = document.getElementById('player-team');

    let allPlayers = [];
    let leagueTeams = [];
    let debounceTimer; // Controlador para evitar saturar la búsqueda por texto

    document.getElementById('btn-new-player').onclick = () => {
        if (leagueTeams.length === 0) {
            ToastNotification.show('Debes crear un equipo primero', 'error');
            return;
        }
        modal.style.display = 'flex';
    };
    
    document.getElementById('btn-cancel-player').onclick = () => {
        modal.style.display = 'none';
        form.reset();
    };

    // 1. Obtener equipos de la liga activa y sus respectivos jugadores
    const loadData = async () => {
        try {
            const data = await DB.executeTransaction(['teams', 'players'], 'readonly', (txn) => {
                const teamStore = txn.objectStore('teams');
                const playerStore = txn.objectStore('players');
                
                return Promise.all([
                    new Promise((res, rej) => {
                        const req = teamStore.index('leagueId').getAll(IDBKeyRange.only(App.activeLeagueId));
                        req.onsuccess = () => res(req.result);
                        req.onerror = () => rej(req.error);
                    }),
                    new Promise((res, rej) => {
                        const req = playerStore.getAll();
                        req.onsuccess = () => res(req.result);
                        req.onerror = () => rej(req.error);
                    })
                ]);
            });

            leagueTeams = data[0];
            const teamIds = leagueTeams.map(t => t.id);
            allPlayers = data[1].filter(p => teamIds.includes(p.teamId)); // Filtro relacional

            populateSelects();
            renderGrid(allPlayers);
        } catch (error) {
            grid.innerHTML = '<p style="color: red;">Error cargando datos.</p>';
        }
    };

    // 2. Llenar los `<select>` de equipos y posiciones
    const populateSelects = () => {
        selectTeam.innerHTML = '';
        filterTeam.innerHTML = '<option value="">Todos los equipos</option>';
        
        leagueTeams.forEach(team => {
            const opt = `<option value="${team.id}">${team.name}</option>`;
            selectTeam.innerHTML += opt;
            filterTeam.innerHTML += opt;
        });

        const positions = [...new Set(allPlayers.map(p => p.position).filter(Boolean))];
        filterPosition.innerHTML = '<option value="">Todas las posiciones</option>';
        positions.forEach(pos => filterPosition.innerHTML += `<option value="${pos}">${pos}</option>`);
    };

    // 3. Pintar cuadrícula aplicando los filtros si existen
    const renderGrid = (playersToRender) => {
        grid.innerHTML = '';

        if (playersToRender.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center;">No se encontraron jugadores.</p>';
            return;
        }

        playersToRender.forEach(player => {
            const team = leagueTeams.find(t => t.id === player.teamId);
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <div style="width: 50px; height: 50px; border-radius: 50%; background: #eee; overflow: hidden; display: flex; justify-content: center; align-items: center;">
                        ${player.photo ? `<img src="${player.photo}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span style="color: #999; font-size: 1.5rem;">👤</span>`}
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-main);">${player.name}</h3>
                        <p style="margin: 0; color: var(--text-muted); font-size: 0.85rem;">${team ? team.name : 'Sin equipo'}</p>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <span style="font-weight: bold; color: var(--accent-color);">#${player.number}</span>
                    <span style="color: var(--text-muted);">${player.position || '-'}</span>
                </div>
                <button class="btn btn-delete-player" data-id="${player.id}" style="width: 100%; margin-top: 1rem; background: #e74c3c; padding: 0.35rem;">Eliminar</button>
            `;
            grid.appendChild(card);
        });

        // Evento de eliminación
        grid.querySelectorAll('.btn-delete-player').forEach(btn => {
            btn.onclick = (e) => deletePlayer(parseInt(e.target.dataset.id));
        });
    };

    // 4. Lógica de Filtros Combinados (Debounce de 300ms)
    const applyFilters = () => {
        const text = filterName.value.toLowerCase();
        const teamId = filterTeam.value ? parseInt(filterTeam.value) : null;
        const position = filterPosition.value;

        const filtered = allPlayers.filter(p => {
            return p.name.toLowerCase().includes(text) &&
                   (teamId ? p.teamId === teamId : true) &&
                   (position ? p.position === position : true);
        });
        renderGrid(filtered);
    };

    filterName.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilters, 300);
    });
    filterTeam.addEventListener('change', applyFilters);
    filterPosition.addEventListener('change', applyFilters);

    // 5. Guardar
    form.onsubmit = async (e) => {
        e.preventDefault();
        const newPlayer = {
            teamId: parseInt(document.getElementById('player-team').value),
            name: document.getElementById('player-name').value.trim(),
            number: parseInt(document.getElementById('player-number').value),
            position: document.getElementById('player-position').value.trim(),
            photo: document.getElementById('player-photo').value.trim(),
            stats: { played: 0, goals: 0 }
        };

        try {
            await DB.executeTransaction(['players'], 'readwrite', (txn) => {
                txn.objectStore('players').add(newPlayer);
            });
            ToastNotification.show('Jugador registrado');
            modal.style.display = 'none';
            form.reset();
            loadData();
        } catch (error) {
            ToastNotification.show('Error al guardar el jugador', 'error');
        }
    };

    // 6. Eliminar (Con protección de integridad de eventos)
    const deletePlayer = async (id) => {
        try {
            const hasEvents = await DB.executeTransaction(['events'], 'readonly', (txn) => {
                return new Promise((resolve, reject) => {
                    const req = txn.objectStore('events').index('playerId').getAll(IDBKeyRange.only(id));
                    req.onsuccess = () => resolve(req.result.length > 0);
                    req.onerror = () => reject(req.error);
                });
            });

            if (hasEvents) {
                ToastNotification.show('Bloqueado: El jugador ya tiene anotaciones', 'error');
                return;
            }

            const confirmed = await ConfirmDialog.request('¿Eliminar Jugador?', 'Esta acción no se puede deshacer.');
            if (confirmed) {
                await DB.executeTransaction(['players'], 'readwrite', (txn) => {
                    txn.objectStore('players').delete(id);
                });
                ToastNotification.show('Jugador eliminado');
                loadData();
            }
        } catch (error) {
            ToastNotification.show('Error al eliminar', 'error');
        }
    };

    loadData();
};
