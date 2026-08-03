export const DB = {
    dbName: 'LeagueHubDB',
    version: 1,
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('leagues')) db.createObjectStore('leagues', { keyPath: 'id', autoIncrement: true });
                if (!db.objectStoreNames.contains('teams')) {
                    const store = db.createObjectStore('teams', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('leagueId', 'leagueId', { unique: false });
                }
                if (!db.objectStoreNames.contains('players')) {
                    const store = db.createObjectStore('players', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('teamId', 'teamId', { unique: false });
                }
                if (!db.objectStoreNames.contains('matches')) {
                    const store = db.createObjectStore('matches', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('leagueId', 'leagueId', { unique: false });
                }
                if (!db.objectStoreNames.contains('events')) {
                    const store = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('matchId', 'matchId', { unique: false });
                    store.createIndex('playerId', 'playerId', { unique: false });
                    store.createIndex('teamId', 'teamId', { unique: false });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(true);
            };

            request.onerror = () => reject('Error iniciando IndexedDB');
        });
    },

    async executeTransaction(storeNames, mode, callback) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeNames, mode);
            let resultData;

            transaction.oncomplete = () => resolve(resultData);
            transaction.onerror = (e) => reject(e.target.error);
            transaction.onabort = () => reject(new Error("Transacción abortada"));

            try {
                const result = callback(transaction);
                if (result instanceof Promise) {
                    result.then(data => { resultData = data; }).catch(err => {
                        reject(err);
                        transaction.abort();
                    });
                } else {
                    resultData = result;
                }
            } catch (error) {
                reject(error);
            }
        });
    }
};
