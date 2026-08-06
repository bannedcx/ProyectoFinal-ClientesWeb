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
