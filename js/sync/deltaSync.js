// js/sync.js
import { GitHubAPI } from '/js/core/githubClient.js';
import { DBStore } from '/js/storage/indexedDB.js';

export class SyncEngine {
    static isSyncing = false;
    static syncInterval = null;

    static startBackgroundSync(intervalMs = 30000) {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.pullDeltaSync();
            }
        }, intervalMs);
    }

    static stopBackgroundSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // Triggered on page load to pull changes and patch IndexedDB
    static async pullDeltaSync() {
        if (!navigator.onLine || this.isSyncing) return; // Skip if offline or already syncing

        this.isSyncing = true;
        let hasChanges = false;
        try {
            const remoteSha = await GitHubAPI.getLatestCommit();
            if (!remoteSha) return; // empty repo

            const localSha = await DBStore.getMeta('lastCommitSha');

            if (localSha === remoteSha) {
                console.log("Local cache is up to date.");
                return; // Nothing to do
            }

            if (!localSha) {
                // Initial cold start sync
                console.log("No local sha found. Fetching initial master files...");
                hasChanges = await this.fetchEntireRepoState(remoteSha);
            } else {
                // Delta sync using Compare endpoint
                console.log("New commits found on remote. Running Delta Compare...");
                const comparison = await GitHubAPI.compareCommits(localSha, remoteSha);

                if (comparison && comparison.files && comparison.files.length > 0) {
                    await this.applyDeltaCommits(comparison.files);
                    hasChanges = true;
                }
            }

            await DBStore.setMeta('lastCommitSha', remoteSha);

            // Dispatch event to UI so the editor updates without reload
            if (hasChanges) {
                document.dispatchEvent(new CustomEvent('sync-completed'));
            }

        } catch (e) {
            console.error("Delta Sync Failed", e);
        } finally {
            this.isSyncing = false;
        }
    }

    // Falls back to fetching just index.json + missing files if needed
    static async fetchEntireRepoState(remoteSha) {
        // We assume index.json holds the structural truth.
        const metaStr = await GitHubAPI.getFileContent('metadata/index.json');
        if (metaStr) {
            try {
                const meta = JSON.parse(metaStr);
                await DBStore.setMeta('index', meta);
                return true;
            } catch (e) {
                console.error("Failed to parse index.json from remote", e);
                return false;
            }
        }
        return false;
    }

    // Incrementally patches the IndexedDB store with the changed files
    static async applyDeltaCommits(changedFiles) {
        for (const file of changedFiles) {
            try {
                if (file.filename === 'metadata/index.json') {
                    if (file.status !== 'removed') {
                        const content = await GitHubAPI.getFileContent(file.filename);
                        if (content) {
                            await DBStore.setMeta('index', JSON.parse(content));
                        }
                    }
                }
                else if (file.filename.startsWith('notes/') || file.filename.startsWith('n/')) {
                    // It's a note file
                    const noteId = file.filename.split('/').pop().replace('.md', '');
                    if (file.status === 'removed') {
                        await DBStore.deleteNote(noteId);
                    } else {
                        const content = await GitHubAPI.getFileContent(file.filename);
                        if (content) {
                            const existingNote = await DBStore.getNote(noteId) || { id: noteId, _unmapped: true };
                            existingNote.content = content;
                            await DBStore.putNote(existingNote);
                        }
                    }
                }
            } catch (err) {
                console.error(`Failed to apply delta for file ${file.filename}`, err);
            }
        }
    }

    // Pushes pending mutations stored in the IndexedDB offline queue
    static async pushSyncQueue() {
        if (!navigator.onLine) return;

        try {
            const queue = await DBStore.getSyncQueue();
            if (queue.length === 0) return;

            console.log(`Pushing ${queue.length} items from offline queue...`);

            const filesToCommit = [];
            // De-duplicate if multiple updates happened to the same file
            const fileMap = new Map();

            for (const task of queue) {
                // Task payload normally contains the string content or null for deletion
                // { type: 'UPDATE_FILE', path: 'n/...', content: "..." }
                fileMap.set(task.payload.path, task.payload.content);
            }

            for (const [path, content] of fileMap.entries()) {
                filesToCommit.push({ path, content });
            }

            const newCommitSha = await GitHubAPI.commitBatch(`Device auto-sync (${filesToCommit.length} updates)`, filesToCommit);

            // Advance local SHA to match our new commit
            await DBStore.setMeta('lastCommitSha', newCommitSha);
            await DBStore.clearSyncQueue();

            console.log("Sync push successful.");

        } catch (e) {
            if (e.message.includes('409 Conflict')) {
                console.error("Conflict detected during sync queue flush.");
                // Note: Emitting to UI to trigger conflict module (Phase 7)
                document.dispatchEvent(new CustomEvent('conflict-detected'));
            } else {
                console.error("Push Sync Failed", e);
            }
        }
    }
}
