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
