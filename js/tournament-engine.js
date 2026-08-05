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
