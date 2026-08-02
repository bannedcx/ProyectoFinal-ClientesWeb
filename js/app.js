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

    handleRoute() {
        const hash = window.location.hash || '#dashboard';
        const container = document.getElementById('app-container');
        if (!container) return;
        
        container.innerHTML = ''; 

        const parts = hash.split('/');
        const route = parts[0];
        const param = parts[1] ? parseInt(parts[1]) : null;

        if (!this.activeLeagueId && route !== '#leagues') {
            window.location.hash = '#leagues';
            return;
        }

        switch (route) {
            case '#dashboard':
                renderDashboard(container);
                break;
            case '#leagues':
                renderLeagues(container);
                break;
            case '#teams':
                renderTeams(container);
                break;
            case '#players':
                renderPlayers(container);
                break;
            case '#matches':
                renderMatches(container);
                break;
            case '#match':
                if (param) renderMatchDetail(container, param);
                else window.location.hash = '#matches';
                break;
            case '#stats':
                renderStats(container);
                break;
            default:
                window.location.hash = '#dashboard';
                break;
        }
        
        this.updateNavHighlight(route);
    },

    updateNavHighlight(currentRoute) {
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentRoute) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
