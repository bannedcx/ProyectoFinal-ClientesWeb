import { DB } from './db.js';
import { App } from './app.js';

export const renderTeams = async (container) => {
    if (!App.activeLeagueId) return;

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h2>Equipos de la Liga</h2>
            <button id="btn-new-team" class="btn btn-accent">+ Registrar Equipo</button>
        </div>
        <div id="teams-grid" class="card-grid">
            <loading-state></loading-state>
        </div>

        <!-- Modal para crear equipo -->
        <div id="modal-team" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 1000; align-items: center; justify-content: center;">
            <div class="card" style="width: 100%; max-width: 400px;">
                <h3 style="margin-bottom: 1.5rem;">Nuevo Equipo</h3>
                <form id="form-team">
                    <div class="form-group">
                        <label>Nombre del Equipo *</label>
                        <input type="text" id="team-name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Ciudad / Sede</label>
                        <input type="text" id="team-city" class="form-control">
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <div class="form-group" style="flex: 1;">
                            <label>Color Principal</label>
                            <input type="color" id="team-color1" class="form-control" value="#3498db" style="height: 40px; padding: 0;">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Color Secundario</label>
                            <input type="color" id="team-color2" class="form-control" value="#2c3e50" style="height: 40px; padding: 0;">
                        </div>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
                        <button type="button" id="btn-cancel-team" class="btn" style="background: var(--text-muted);">Cancelar</button>
                        <button type="submit" class="btn btn-accent">Guardar Equipo</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const grid = document.getElementById('teams-grid');
    const modal = document.getElementById('modal-team');
    const form = document.getElementById('form-team');

    document.getElementById('btn-new-team').onclick = () => modal.style.display = 'flex';
    document.getElementById('btn-cancel-team').onclick = () => {
        modal.style.display = 'none';
        form.reset();
    };

    const loadTeams = async () => {
        try {
            const teams = await DB.executeTransaction(['teams'], 'readonly', (txn) => {
                const store = txn.objectStore('teams');
                const index = store.index('leagueId');
                return new Promise((resolve, reject) => {
                    const request = index.getAll(IDBKeyRange.only(App.activeLeagueId));
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            });

            grid.innerHTML = '';

            if (teams.length === 0) {
                grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center;">No hay equipos registrados en esta liga.</p>';
                return;
            }

            teams.forEach(team => {
                const card = document.createElement('div');
                card.className = 'card';
                const initial = team.name.charAt(0).toUpperCase();
                
                card.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div style="width: 50px; height: 50px; border-radius: 8px; background: linear-gradient(135deg, ${team.color1}, ${team.color2}); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5rem;">
                            ${initial}
                        </div>
                        <div>
                            <h3 style="margin: 0; color: var(--text-main);">${team.name}</h3>
                            <span style="color: var(--text-muted); font-size: 0.85rem;">${team.city || 'Sin sede'}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
                        <button class="btn btn-delete-team" data-id="${team.id}" style="width: 100%; background: #e74c3c;">Eliminar Equipo</button>
                    </div>
                `;
                grid.appendChild(card);
            });

            grid.querySelectorAll('.btn-delete-team').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = parseInt(e.target.dataset.id);
                    const confirmed = await ConfirmDialog.request('¿Eliminar Equipo?', 'Se borrará el equipo y todos sus jugadores. Esta acción no se puede deshacer.');
                    if (confirmed) deleteTeam(id);
                };
            });

        } catch (error) {
            console.error(error);
            grid.innerHTML = '<p style="color: red;">Error cargando los equipos.</p>';
        }
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const newTeam = {
            leagueId: App.activeLeagueId,
            name: document.getElementById('team-name').value.trim(),
            city: document.getElementById('team-city').value.trim(),
            color1: document.getElementById('team-color1').value,
            color2: document.getElementById('team-color2').value,
            stats: { played: 0, won: 0, drawn: 0, lost: 0, pointsFor: 0, pointsAgainst: 0, points: 0 } // Contadores en 0
        };

        try {
            await DB.executeTransaction(['teams'], 'readwrite', (txn) => {
                txn.objectStore('teams').add(newTeam);
            });
            
            ToastNotification.show('Equipo registrado exitosamente');
            modal.style.display = 'none';
            form.reset();
            loadTeams();
        } catch (error) {
            ToastNotification.show('Error al guardar el equipo', 'error');
        }
    };

    const deleteTeam = async (id) => {
        try {
            await DB.executeTransaction(['teams', 'players'], 'readwrite', (txn) => {
                txn.objectStore('teams').delete(id);
                
                const playerIndex = txn.objectStore('players').index('teamId');
                playerIndex.openCursor(IDBKeyRange.only(id)).onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                };
            });
            
            ToastNotification.show('Equipo eliminado');
            loadTeams();
        } catch (error) {
            ToastNotification.show('Error al eliminar', 'error');
        }
    };

    loadTeams();
};
