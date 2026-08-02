import { DB } from './db.js';

export const BackupManager = {
    async exportDatabase() {
        try {
            const data = await DB.executeTransaction(['leagues', 'teams', 'players', 'matches', 'events'], 'readonly', async (txn) => {
                const getStoreData = (storeName) => new Promise((res, rej) => {
                    const req = txn.objectStore(storeName).getAll();
                    req.onsuccess = () => res(req.result);
                    req.onerror = () => rej(req.error);
                });

                return {
                    leagues: await getStoreData('leagues'),
                    teams: await getStoreData('teams'),
                    players: await getStoreData('players'),
                    matches: await getStoreData('matches'),
                    events: await getStoreData('events')
                };
            });

            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `leaguehub_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            throw new Error("Error al exportar los datos.");
        }
    },

    async importDatabase(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (!data.leagues || !data.teams || !data.players || !data.matches || !data.events) {
                        throw new Error("El archivo JSON no tiene la estructura válida de LeagueHub.");
                    }
