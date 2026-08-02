import { DB } from './db.js';
import './components.js';
import { renderDashboard } from './view-dashboard.js';
import { renderLeagues } from './view-leagues.js';
import { renderTeams } from './view-teams.js';
import { renderPlayers } from './view-players.js';
import { renderMatches } from './view-matches.js';
import { renderMatchDetail } from './view-match-detail.js';
import { renderStats } from './view-stats.js';

export const App = {
    activeLeagueId: localStorage.getItem('activeLeagueId') ? parseInt(localStorage.getItem('activeLeagueId')) : null,

    async init() {
        try {
            await DB.init();
            window.addEventListener('hashchange', () => this.handleRoute());
            this.handleRoute();
        } catch (error) {
            const container = document.getElementById('app-container');
            if (container) container.innerHTML = '<p style="color: red; padding: 2rem; text-align: center;">Error crítico cargando la base de datos.</p>';
        }
    },

    setActiveLeague(leagueId) {
        this.activeLeagueId = leagueId;
        if (leagueId) {
            localStorage.setItem('activeLeagueId', leagueId);
        } else {
            localStorage.removeItem('activeLeagueId');
        }
        window.location.hash = '#dashboard';
    },
