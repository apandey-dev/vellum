// js/db.js

export class DBStore {
    static dbName = 'VellumOfflineDB';
    static dbVersion = 1;
    static dbInstance = null;

    static async init() {
        if (this.dbInstance) return this.dbInstance;

        return new Promise((resolve, reject) => {
            let request;
            try {
                request = indexedDB.open(this.dbName, this.dbVersion);
            } catch (err) {
                // IndexedDB not available (private browsing mode, storage blocked)
                console.error('[DBStore] IndexedDB unavailable:', err);
                document.dispatchEvent(new CustomEvent('db-error', { detail: { reason: 'unavailable' } }));
                return reject(err);
            }

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

                // Detect unexpected database closures (e.g. version mismatch)
                this.dbInstance.onversionchange = () => {
                    this.dbInstance.close();
                    this.dbInstance = null;
                    document.dispatchEvent(new CustomEvent('db-error', { detail: { reason: 'version-change' } }));
                };

                resolve(this.dbInstance);
            };

            request.onerror = (event) => {
                const err = event.target.error;
                console.error('[DBStore] Failed to open IndexedDB:', err);
                document.dispatchEvent(new CustomEvent('db-error', { detail: { reason: 'open-failed', error: err?.message } }));
                reject(err);
            };

            request.onblocked = () => {
                console.warn('[DBStore] IndexedDB open blocked — another tab may have an older version open.');
                document.dispatchEvent(new CustomEvent('db-error', { detail: { reason: 'blocked' } }));
            };
        });
    }

    /**
     * Recovery helper: wipes all local cached data so the app can re-sync from GitHub.
     * Called by the db-error recovery modal.
     */
    static async clearAllLocalData() {
        try {
            if (this.dbInstance) {
                this.dbInstance.close();
                this.dbInstance = null;
            }
            await new Promise((resolve, reject) => {
                const req = indexedDB.deleteDatabase(this.dbName);
                req.onsuccess = resolve;
                req.onerror = () => reject(req.error);
            });
            console.warn('[DBStore] Local database cleared. Reload to re-sync from GitHub.');
        } catch (err) {
            console.error('[DBStore] Failed to clear local database:', err);
        }
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

    /**
     * Bulk-write multiple notes in a single IndexedDB transaction.
     * Use when applying delta sync results to avoid N separate transactions.
     */
    static async putNotesBulk(noteObjects) {
        if (!noteObjects.length) return;
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('notes', 'readwrite');
            const store = tx.objectStore('notes');
            let pending = noteObjects.length;
            for (const note of noteObjects) {
                const req = store.put(note);
                req.onsuccess = () => { if (--pending === 0) resolve(); };
                req.onerror = () => reject(req.error);
            }
            tx.onerror = () => reject(tx.error);
        });
    }

    /**
     * Bulk-delete multiple notes in a single IndexedDB transaction.
     */
    static async deleteNotesBulk(ids) {
        if (!ids.length) return;
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('notes', 'readwrite');
            const store = tx.objectStore('notes');
            let pending = ids.length;
            for (const id of ids) {
                const req = store.delete(id);
                req.onsuccess = () => { if (--pending === 0) resolve(); };
                req.onerror = () => reject(req.error);
            }
            tx.onerror = () => reject(tx.error);
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
        const note = await this.getNote(id);
        if (!note) return null;
        const meta = await this.getMeta('index') || { notesIndex: {} };
        const indexEntry = meta.notesIndex[id] || {};
        return {
            ...note,
            folder_id: indexEntry.folder || null,
            title: indexEntry.title || note.title || 'Untitled',
            is_pinned: indexEntry.is_pinned || false,
            updated_at: indexEntry.updated || note.updated_at || Date.now(),
            order_index: note.order_index || 0,
            is_public: indexEntry.is_public || false,
            public_id: indexEntry.public_id || null,
            gist_id: indexEntry.gist_id || null,
            public_url: indexEntry.public_url || null,
        };
    }

    /**
     * Returns a metadata-only list of notes for the sidebar.
     * Does NOT load note content blobs — critical for 10k+ collections.
     * UI renders chips from this; content is only loaded when a note is opened.
     */
    static async getAggregatedNotesLazy() {
        const meta = await this.getMeta('index') || { notesIndex: {}, folders: {} };
        const entries = Object.entries(meta.notesIndex || {});
        return entries.map(([id, idx]) => ({
            id,
            title: idx.title || 'Untitled',
            folder_id: idx.folder || null,
            is_pinned: idx.is_pinned || false,
            updated_at: idx.updated || 0,
            order_index: idx.order_index || 0,
            is_public: idx.is_public || false,
            public_url: idx.public_url || null,
        }));
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
