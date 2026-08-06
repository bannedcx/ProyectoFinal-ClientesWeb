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
