// js/db.js

export class DBStore {
    static dbName = 'VellumOfflineDB';
    static dbVersion = 1;
    static dbInstance = null;

    static async init() {
        if (this.dbInstance) return this.dbInstance;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // metadataStore holds index.json and lastCommitSha mapping
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata');
                }

                // notesStore holds physical note objects mapped by their file SHA / ID
                if (!db.objectStoreNames.contains('notes')) {
                    db.createObjectStore('notes', { keyPath: 'id' });
                }

                // offlineQueue holds pending mutations awaiting git commit sync
                if (!db.objectStoreNames.contains('offlineQueue')) {
                    db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = (event) => {
                this.dbInstance = event.target.result;
                resolve(this.dbInstance);
            };

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    // --- Key/Value Store Actions (Metadata) ---
    static async getMeta(key) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('metadata', 'readonly');
            const store = tx.objectStore('metadata');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    static async setMeta(key, value) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('metadata', 'readwrite');
            const store = tx.objectStore('metadata');
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error); // 409 etc
        });
    }

    // --- Notes Store ---
    static async getNote(id) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('notes', 'readonly');
            const store = tx.objectStore('notes');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    static async putNote(noteObj) {
        // noteObj = { id: 'uuid', content: '...', title: '...', folder: '...', path: '...', updated: ts }
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('notes', 'readwrite');
            const store = tx.objectStore('notes');
            const request = store.put(noteObj);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    static async deleteNote(id) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('notes', 'readwrite');
            const store = tx.objectStore('notes');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    static async getAllNotes() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('notes', 'readonly');
            const store = tx.objectStore('notes');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // --- Aggregated Data Helpers (Replaces in-memory arrays) ---
    static async getFoldersArray() {
        const meta = await this.getMeta('index') || { folders: {} };
        return Object.entries(meta.folders || {}).map(([id, f]) => ({ id, name: f.name }));
    }

    static async getAggregatedNotes() {
        const allNotes = await this.getAllNotes();
        const meta = await this.getMeta('index') || { notesIndex: {} };

        const notes = allNotes.map(n => {
            const indexEntry = meta.notesIndex[n.id] || {};
            return {
                ...n,
                folder_id: indexEntry.folder || null,
                title: indexEntry.title || n.title || 'Untitled',
                is_pinned: indexEntry.is_pinned || false,
                updated_at: indexEntry.updated || n.updated_at || Date.now(),
                order_index: n.order_index || 0,
                is_public: indexEntry.is_public || false,
                public_id: indexEntry.public_id || null
            };
        });

        notes.sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
            return (a.order_index || 0) - (b.order_index || 0);
        });

        return notes;
    }

    static async getAggregatedNoteById(id) {
        const notes = await this.getAggregatedNotes();
        return notes.find(n => n.id === id);
    }

    // --- Sync Queue Actions ---
    static async addSyncTask(task) {
        // task = { type: 'NOTE_UPDATE'|'NOTE_DELETE'|'INDEX_UPDATE', payload: {} }
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('offlineQueue', 'readwrite');
            const store = tx.objectStore('offlineQueue');
            const request = store.add(task);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    static async getSyncQueue() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('offlineQueue', 'readonly');
            const store = tx.objectStore('offlineQueue');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    static async clearSyncQueue() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('offlineQueue', 'readwrite');
            const store = tx.objectStore('offlineQueue');
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    static async deleteSyncTask(taskId) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('offlineQueue', 'readwrite');
            const store = tx.objectStore('offlineQueue');
            const request = store.delete(taskId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}
