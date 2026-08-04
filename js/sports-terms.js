export const SportsConfig = {
    football: {
        id: 'football',
        name: 'Fútbol',
        icon: '⚽',
        terms: {
            event: 'Gol',
            pointsFor: 'GF', 
            pointsAgainst: 'GC', 
            scorersRanking: 'Goleadores',
            individualScore: 'Goles anotados'
        },
        colors: {
            primary: '#27ae60', 
            accent: '#f1c40f'
        }
    },
    basketball: {
        id: 'basketball',
        name: 'Básquetbol',
        icon: '🏀',
        terms: {
            event: 'Canasta', 
            pointsFor: 'PF', 
            pointsAgainst: 'PC', 
            scorersRanking: 'Encestadores', 
            individualScore: 'Canastas encestadas'
        },
        colors: {
            primary: '#e67e22',
            accent: '#d35400'
        }
    },
    volleyball: {
        id: 'volleyball',
        name: 'Voleibol',
        icon: '🏐',
        terms: {
            event: 'Punto', 
            pointsFor: 'PF', 
            pointsAgainst: 'PC', 
            scorersRanking: 'Anotadores', 
            individualScore: 'Puntos anotados'
        },
        colors: {
            primary: '#2980b9',
            accent: '#ecf0f1'
        }
    }
};

export const getSportConfig = (sportId) => {
    return SportsConfig[sportId] || SportsConfig['football'];
};
