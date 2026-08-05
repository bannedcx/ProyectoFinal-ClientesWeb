import { DB } from './db.js';

export const TournamentEngine = {
    async generate(leagueId) {
        try {
            const data = await DB.executeTransaction(['leagues', 'teams'], 'readonly', async (txn) => {
                const l = await new Promise(res => txn.objectStore('leagues').get(leagueId).onsuccess = e => res(e.target.result));
                const t = await new Promise(res => txn.objectStore('teams').index('leagueId').getAll(IDBKeyRange.only(leagueId)).onsuccess = e => res(e.target.result));
                return { league: l, teams: t };
            });

            if (data.league.modality === 'liga') {
                if (data.teams.length < 2) throw new Error("Se requieren al menos 2 equipos.");
                await this.generateRoundRobin(data.league, data.teams);
            } else {
                const required = data.league.config.teamCount;
                if (data.teams.length !== required) throw new Error(`Se requieren exactamente ${required} equipos. Tienes ${data.teams.length}.`);
                await this.generateBracket(data.league, data.teams);
            }

            await DB.executeTransaction(['leagues'], 'readwrite', txn => {
                data.league.isGenerated = true;
                txn.objectStore('leagues').put(data.league);
            });

            return true;
        } catch (error) {
            throw error;
        }
    },

    async generateRoundRobin(league, teams) {
        let teamIds = teams.map(t => t.id);
        if (teamIds.length % 2 !== 0) teamIds.push(null); 

        const totalRounds = teamIds.length - 1;
        const matches = [];
        let currentDate = new Date();

        for (let round = 0; round < totalRounds; round++) {
            currentDate.setDate(currentDate.getDate() + 2);
            
            for (let i = 0; i < teamIds.length / 2; i++) {
                const home = teamIds[i];
                const away = teamIds[teamIds.length - 1 - i];
                
                if (home !== null && away !== null) {
                    matches.push({
                        leagueId: league.id,
                        homeTeamId: home,
                        awayTeamId: away,
                        date: currentDate.toISOString().slice(0, 16),
                        status: 'Programado',
                        score: { home: 0, away: 0 }
                    });
                }
            }
            teamIds.splice(1, 0, teamIds.pop());
        }

        if (league.config.rounds === 2) {
            const returnMatches = matches.map(m => {
                currentDate.setDate(currentDate.getDate() + 2);
                return { ...m, homeTeamId: m.awayTeamId, awayTeamId: m.homeTeamId, date: currentDate.toISOString().slice(0, 16) };
            });
            matches.push(...returnMatches);
        }

        await DB.executeTransaction(['matches'], 'readwrite', txn => {
            const store = txn.objectStore('matches');
            matches.forEach(m => store.add(m));
        });
    },

    async generateBracket(league, teams) {
        const shuffled = [...teams].sort(() => Math.random() - 0.5); // Sorteo aleatorio
        const matches = [];
        let currentDate = new Date();
        
        const numTeams = teams.length;
        const totalRounds = Math.log2(numTeams);
        const roundNames = { 4: ['Semifinal', 'Final'], 8: ['Cuartos', 'Semifinal', 'Final'], 16: ['Octavos', 'Cuartos', 'Semifinal', 'Final'] };
        const labels = roundNames[numTeams];

        for (let r = 0; r < totalRounds; r++) {
            currentDate.setDate(currentDate.getDate() + 3);
            const matchesInRound = numTeams / Math.pow(2, r + 1);

            for (let i = 0; i < matchesInRound; i++) {
                const isFirstRound = r === 0;
                matches.push({
                    leagueId: league.id,
                    homeTeamId: isFirstRound ? shuffled[i*2].id : null,
                    awayTeamId: isFirstRound ? shuffled[i*2 + 1].id : null,
                    date: currentDate.toISOString().slice(0, 16),
                    status: 'Programado',
                    score: { home: 0, away: 0 },
                    round: labels[r],
                    bracketKey: `R${r}-M${i}`, 
                    nextMatchKey: r < totalRounds - 1 ? `R${r+1}-M${Math.floor(i/2)}` : null, 
                    nextSlot: i % 2 === 0 ? 'homeTeamId' : 'awayTeamId'
                });
            }
        }

        await DB.executeTransaction(['matches'], 'readwrite', txn => {
            const store = txn.objectStore('matches');
            matches.forEach(m => store.add(m));
        });
    }
};
