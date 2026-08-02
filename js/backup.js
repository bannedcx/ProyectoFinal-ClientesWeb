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
