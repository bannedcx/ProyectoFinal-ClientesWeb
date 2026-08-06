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
