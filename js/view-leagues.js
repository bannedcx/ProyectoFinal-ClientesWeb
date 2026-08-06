import { DB } from './db.js';
import { SportsConfig } from './sports-terms.js';
import { App } from './app.js';
import { TournamentEngine } from './tournament-engine.js';
import { BackupManager } from './backup.js';

export const renderLeagues = async (container) => {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
            <h2>Gestión de Ligas</h2>
            <div style="display: flex; gap: 1rem;">
                <button id="btn-export" class="btn" style="background: #2980b9;">📥 Exportar Data</button>
                <label class="btn" style="background: #8e44ad; cursor: pointer;">
                    📤 Importar Data
                    <input type="file" id="file-import" accept=".json" style="display: none;">
                </label>
                <button id="btn-new-league" class="btn btn-accent">+ Crear Liga</button>
            </div>
        </div>
        <div id="leagues-grid" class="card-grid">
            <loading-state></loading-state>
        </div>

        <div id="modal-league" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 1000; align-items: center; justify-content: center;">
            <div class="card" style="width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                <h3 style="margin-bottom: 1.5rem;">Nueva Liga</h3>
                <form id="form-league">
                    <div class="form-group">
                        <label>Nombre de la Liga *</label>
                        <input type="text" id="league-name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Deporte *</label>
                        <select id="league-sport" class="form-control" required>
                            <option value="football">Fútbol ⚽</option>
                            <option value="basketball">Básquetbol 🏀</option>
                            <option value="volleyball">Voleibol 🏐</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Temporada *</label>
                        <input type="text" id="league-season" class="form-control" placeholder="Ej: 2026-I" required>
                    </div>
                    <div class="form-group">
                        <label>Modalidad de Torneo *</label>
                        <select id="league-modality" class="form-control" required>
                            <option value="liga">Liga (Todos contra todos)</option>
                            <option value="eliminacion">Eliminación Directa (Bracket)</option>
                        </select>
                    </div>
                    
                    <div class="form-group" id="config-liga">
                        <label>Formato de enfrentamiento</label>
                        <select id="league-rounds" class="form-control">
                            <option value="1">Una vuelta</option>
                            <option value="2">Ida y vuelta</option>
                        </select>
                    </div>
                    <div class="form-group" id="config-eliminacion" style="display: none;">
                        <label>Número de Equipos</label>
                        <select id="league-teams-count" class="form-control">
                            <option value="4">4 Equipos</option>
                            <option value="8">8 Equipos</option>
                            <option value="16">16 Equipos</option>
                        </select>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                        <button type="button" id="btn-cancel-modal" class="btn" style="background: var(--text-muted);">Cancelar</button>
                        <button type="submit" id="btn-save-league" class="btn btn-accent">Guardar Liga</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const grid = document.getElementById('leagues-grid');
    const modal = document.getElementById('modal-league');
    const form = document.getElementById('form-league');
    const modalitySelect = document.getElementById('league-modality');
    const btnSaveLeague = document.getElementById('btn-save-league');
    
    modalitySelect.addEventListener('change', (e) => {
        const isLiga = e.target.value === 'liga';
        document.getElementById('config-liga').style.display = isLiga ? 'flex' : 'none';
        document.getElementById('config-eliminacion').style.display = isLiga ? 'none' : 'flex';
    });

    document.getElementById('btn-new-league').onclick = () => modal.style.display = 'flex';
    document.getElementById('btn-cancel-modal').onclick = () => {
        modal.style.display = 'none';
        form.reset();
        modalitySelect.dispatchEvent(new Event('change')); 
    };

    const loadLeagues = async () => {
        try {
            const result = await DB.executeTransaction(['leagues'], 'readonly', (txn) => {
                const store = txn.objectStore('leagues');
                return new Promise((resolve, reject) => {
                    const request = store.getAll();
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            });

            grid.innerHTML = '';
            
            if (result.length === 0) {
                grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center;">No hay ligas creadas. ¡Crea la primera!</p>';
                return;
            }

            result.forEach(league => {
                const card = document.createElement('div');
                card.className = 'card';
                card.style.borderTop = `4px solid ${SportsConfig[league.sport].colors.primary}`;
                const isActive = App.activeLeagueId === league.id;
                
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <h3 style="margin: 0; color: var(--text-main);">${league.name}</h3>
                        ${isActive ? '<span style="background: var(--accent-color); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">ACTIVA</span>' : ''}
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">
                        ${SportsConfig[league.sport].icon} ${SportsConfig[league.sport].name} | ${league.season}
                    </p>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">
                        Modalidad: ${league.modality === 'liga' ? 'Todos vs Todos' : 'Eliminación Directa'}
                    </p>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${!isActive ? `<button class="btn btn-activate" data-id="${league.id}" style="flex: 1; background: #27ae60;">Activar</button>` : ''}
                        ${!league.isGenerated ? `<button class="btn btn-generate" data-id="${league.id}" style="flex: 1; background: #f39c12;">Generar Torneo</button>` : ''}
                        <button class="btn btn-delete" data-id="${league.id}" style="background: #e74c3c; width: 100%; margin-top: 0.5rem;">Borrar</button>
                    </div>
                `;
                grid.appendChild(card);
            });

            grid.querySelectorAll('.btn-activate').forEach(btn => {
                btn.onclick = (e) => App.setActiveLeague(parseInt(e.target.dataset.id));
            });

            grid.querySelectorAll('.btn-generate').forEach(btn => {
                btn.onclick = async (e) => {
                    try {
                        await TournamentEngine.generate(parseInt(e.target.dataset.id));
                        ToastNotification.show('Torneo generado exitosamente. Revisa la vista de Partidos.');
                        loadLeagues(); 
                    } catch (err) {
                        ToastNotification.show(err.message, 'error');
                    }
                };
            });

            grid.querySelectorAll('.btn-delete').forEach(btn => {
                btn.onclick = async (e) => {
                    const id = parseInt(e.target.dataset.id);
                    // Ahora sí va a funcionar el popup porque ya lo arreglamos en components.js
                    const confirmed = await ConfirmDialog.request('¿Eliminar Liga?', 'Se borrarán todos sus equipos, jugadores y partidos. Esta acción no se puede deshacer.');
                    if (confirmed) deleteLeague(id);
                };
            });

        } catch (error) {
            grid.innerHTML = '<p style="color: red;">Error cargando las ligas.</p>';
        }
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        // Bloqueo Anti-Spam
        btnSaveLeague.disabled = true;
        btnSaveLeague.textContent = 'Guardando...';
        
        const newLeague = {
            name: document.getElementById('league-name').value.trim(),
            sport: document.getElementById('league-sport').value,
            season: document.getElementById('league-season').value.trim(),
            modality: modalitySelect.value,
            config: modalitySelect.value === 'liga' 
                ? { rounds: parseInt(document.getElementById('league-rounds').value) }
                : { teamCount: parseInt(document.getElementById('league-teams-count').value) },
            createdAt: new Date().toISOString(),
            isGenerated: false
        };

        try {
            await DB.executeTransaction(['leagues'], 'readwrite', (txn) => {
                txn.objectStore('leagues').add(newLeague);
            });
            ToastNotification.show('Liga creada exitosamente');
            modal.style.display = 'none';
            form.reset();
            modalitySelect.dispatchEvent(new Event('change'));
            await loadLeagues();
        } catch (error) {
            ToastNotification.show('Error al guardar', 'error');
        } finally {
            // Soltar el botón
            btnSaveLeague.disabled = false;
            btnSaveLeague.textContent = 'Guardar Liga';
        }
    };

    const deleteLeague = async (id) => {
        try {
            await DB.executeTransaction(['leagues', 'teams', 'players', 'matches', 'events'], 'readwrite', (txn) => {
                txn.objectStore('leagues').delete(id);
                
                const teamIndex = txn.objectStore('teams').index('leagueId');
                teamIndex.openCursor(IDBKeyRange.only(id)).onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) { cursor.delete(); cursor.continue(); }
                };
                
                const matchIndex = txn.objectStore('matches').index('leagueId');
                matchIndex.openCursor(IDBKeyRange.only(id)).onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) { cursor.delete(); cursor.continue(); }
                };
            });

            ToastNotification.show('Liga eliminada correctamente');
            
            // Protección contra bugs de borrado
            if (App.activeLeagueId === id) {
                App.setActiveLeague(null);
            } else {
                loadLeagues();
            }
        } catch (error) {
            ToastNotification.show('Error al eliminar la liga', 'error');
        }
    };

    document.getElementById('btn-export').onclick = async () => {
        try {
            await BackupManager.exportDatabase();
            ToastNotification.show('Base de datos exportada con éxito');
        } catch (error) {
            ToastNotification.show('Error al exportar', 'error');
        }
    };

    document.getElementById('file-import').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const confirmed = await ConfirmDialog.request('¿Restaurar copia de seguridad?', 'Esto borrará todos los datos actuales y los reemplazará por los del archivo. ¿Continuar?');
        
        if (confirmed) {
            try {
                await BackupManager.importDatabase(file);
                ToastNotification.show('Datos restaurados correctamente');
                App.setActiveLeague(null);
                loadLeagues();
            } catch (error) {
                ToastNotification.show('Error: Archivo inválido o corrupto', 'error');
            }
        }
        e.target.value = ''; 
    };

    loadLeagues();
};
