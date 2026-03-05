// js/sync/conflictResolver.js
// Note-level Conflict Resolution System
//
// Triggers when: local commit SHA ≠ remote commit SHA
// Resolution options:
//   1. Keep Local  — push local content to GitHub (force on latest SHA)
//   2. Keep Remote — overwrite IndexedDB with GitHub version
//   3. Auto-merge  — attempt simple line-based merge; fall back to dual-save

import { DBStore } from '/js/storage/indexedDB.js';
import { GitHubAPI } from '/js/core/githubClient.js';
import { pushNoteUpdate, pushMetaUpdate } from '/js/notes/noteCRUD.js';
import { SyncEngine } from '/js/sync/deltaSync.js';

// ==================== CONFLICT STORE ====================
// Tracks active conflicts keyed by noteId
// { noteId: { localContent, remoteContent, path, title } }
const _activeConflicts = new Map();

export class ConflictResolver {

    /**
     * Check whether a specific note has a pending local edit that conflicts
     * with what is in the remote repo. Called by deltaSync before applying
     * a remote change to a note that has an unsync'd local version.
     *
     * @param {string} noteId
     * @param {string} remoteContent - Content fetched from GitHub
     * @returns {boolean} true if a conflict exists and was registered
     */
    static async checkNoteConflict(noteId, remoteContent) {
        const localNote = await DBStore.getNote(noteId);
        if (!localNote) return false;

        // If local content matches remote, no conflict
        if ((localNote.content || '') === remoteContent) return false;

        // Check if this note has any pending queue entries (unsync'd edits)
        const queue = await DBStore.getSyncQueue();
        const hasPendingEdit = queue.some(task =>
            task.payload?.path?.includes(noteId)
        );

        if (!hasPendingEdit) return false;

        // A real conflict: local unsync'd edit + remote diverged
        const meta = await DBStore.getMeta('index');
        const notePath = meta?.notesIndex?.[noteId]?.path || `notes/${noteId.charAt(0)}/${noteId.charAt(1)}/${noteId}.md`;
        const noteTitle = meta?.notesIndex?.[noteId]?.title || noteId;

        _activeConflicts.set(noteId, {
            noteId,
            localContent: localNote.content || '',
            remoteContent,
            path: notePath,
            title: noteTitle,
        });

        return true;
    }

    /**
     * Opens the conflict resolution UI for a specific note conflict.
     * Called by deltaSync after checkNoteConflict returns true.
     */
    static showNoteConflictUI(noteId) {
        const conflict = _activeConflicts.get(noteId);
        if (!conflict) return;

        document.dispatchEvent(new CustomEvent('note-conflict-detected', {
            detail: conflict
        }));
    }

    /**
     * Keep the LOCAL version.
     * Force-updates the remote SHA pointer and recommits local content.
     */
    static async resolveKeepLocal(noteId) {
        const conflict = _activeConflicts.get(noteId);
        if (!conflict) return;

        try {
            // Advance local SHA to current remote HEAD so commit can proceed
            const remoteHead = await GitHubAPI.getLatestCommit();
            await DBStore.setMeta('lastCommitSha', remoteHead);

            // Commit local content to GitHub
            await pushNoteUpdate(noteId, conflict.localContent);

            _activeConflicts.delete(noteId);
            console.debug(`[ConflictResolver] Resolved keep-local for ${noteId}`);
        } catch (err) {
            console.error('[ConflictResolver] resolveKeepLocal failed:', err);
        }
    }

    /**
     * Keep the REMOTE version.
     * Overwrites IndexedDB with the GitHub content.
     */
    static async resolveKeepRemote(noteId) {
        const conflict = _activeConflicts.get(noteId);
        if (!conflict) return;

        try {
            const note = await DBStore.getNote(noteId) || { id: noteId };
            note.content = conflict.remoteContent;
            note.updated_at = Date.now();
            await DBStore.putNote(note);

            // Remove pending edits for this note from sync queue
            const queue = await DBStore.getSyncQueue();
            const filtered = queue.filter(t => !t.payload?.path?.includes(noteId));
            await DBStore.clearSyncQueue();
            for (const task of filtered) await DBStore.addSyncTask(task);

            _activeConflicts.delete(noteId);

            // Notify UI to reload the note
            document.dispatchEvent(new CustomEvent('note-resolved', { detail: { noteId } }));
            console.debug(`[ConflictResolver] Resolved keep-remote for ${noteId}`);
        } catch (err) {
            console.error('[ConflictResolver] resolveKeepRemote failed:', err);
        }
    }

    /**
     * AUTO-MERGE.
     * Performs a line-level merge: lines only in local (not in remote base),
     * plus lines only in remote, are appended after a separator.
     * If both sides changed the same line, falls back to dual-save.
     */
    static async resolveAutoMerge(noteId) {
        const conflict = _activeConflicts.get(noteId);
        if (!conflict) return;

        try {
            const localLines = conflict.localContent.split('\n');
            const remoteLines = conflict.remoteContent.split('\n');

            // Simple diff-merge: find lines unique to each side
            const localOnly = localLines.filter(l => !remoteLines.includes(l));
            const remoteOnly = remoteLines.filter(l => !localLines.includes(l));

            let merged;
            if (localOnly.length === 0) {
                // local is a subset of remote — just use remote
                merged = conflict.remoteContent;
            } else if (remoteOnly.length === 0) {
                // remote is a subset of local — just use local
                merged = conflict.localContent;
            } else {
                // True divergence — combine with separator
                merged = [
                    ...localLines,
                    '',
                    '---',
                    '> ⚠️ Merged from remote version:',
                    ...remoteOnly,
                ].join('\n');
            }

            // Write merged version to IndexedDB
            const note = await DBStore.getNote(noteId) || { id: noteId };
            note.content = merged;
            note.updated_at = Date.now();
            await DBStore.putNote(note);

            // Advance SHA and push merge result
            const remoteHead = await GitHubAPI.getLatestCommit();
            await DBStore.setMeta('lastCommitSha', remoteHead);
            await pushNoteUpdate(noteId, merged);

            _activeConflicts.delete(noteId);

            document.dispatchEvent(new CustomEvent('note-resolved', { detail: { noteId } }));
            console.debug(`[ConflictResolver] Auto-merge completed for ${noteId}`);
        } catch (err) {
            console.error('[ConflictResolver] resolveAutoMerge failed:', err);
            // Fall back to dual-save
            await this.resolveDualSave(noteId);
        }
    }

    /**
     * DUAL-SAVE fallback.
     * Saves the remote version under a conflict copy note, keeps local as-is.
     */
    static async resolveDualSave(noteId) {
        const conflict = _activeConflicts.get(noteId);
        if (!conflict) return;

        try {
            const conflictId = noteId + '_conflict_' + Date.now();
            const conflictNote = {
                id: conflictId,
                title: `${conflict.title} (Remote Conflict)`,
                content: conflict.remoteContent,
                folder_id: null,
                is_pinned: false,
                order_index: 9999,
                updated_at: Date.now(),
            };
            await DBStore.putNote(conflictNote);

            // Register in metadata
            const meta = await DBStore.getMeta('index') || { folders: { personal: { notes: [] } }, notesIndex: {} };
            meta.notesIndex[conflictId] = {
                title: conflictNote.title,
                path: `notes/${conflictId.charAt(0)}/${conflictId.charAt(1)}/${conflictId}.md`,
                folder: null,
                updated: Date.now(),
            };
            if (meta.folders.personal) meta.folders.personal.notes.push(conflictId);
            await DBStore.setMeta('index', meta);
            await pushMetaUpdate(`conflict:dual-save:${noteId}`, meta);

            _activeConflicts.delete(noteId);

            document.dispatchEvent(new CustomEvent('note-resolved', { detail: { noteId } }));
            console.debug(`[ConflictResolver] Dual-save created: ${conflictId}`);
        } catch (err) {
            console.error('[ConflictResolver] resolveDualSave failed:', err);
        }
    }

    /**
     * Resolves ALL queued offline operations, checking each for conflicts
     * before committing. Called by SyncEngine.pushSyncQueue() on reconnect.
     */
    static async resolveQueuedConflicts() {
        if (!navigator.onLine) return;

        const remoteHead = await GitHubAPI.getLatestCommit().catch(() => null);
        const cachedSha = await DBStore.getMeta('lastCommitSha');

        if (!remoteHead || remoteHead === cachedSha) return; // No divergence

        const queue = await DBStore.getSyncQueue();
        for (const task of queue) {
            if (!task.payload?.path) continue;

            // Extract noteId from path pattern notes/a/b/<noteId>.md
            const match = task.payload.path.match(/([^/]+)\.md$/);
            if (!match) continue;
            const noteId = match[1];

            const remoteContent = await GitHubAPI.getFileContent(task.payload.path).catch(() => null);
            if (remoteContent === null) continue; // New file — no conflict possible

            const isConflict = await this.checkNoteConflict(noteId, remoteContent);
            if (isConflict) {
                this.showNoteConflictUI(noteId);
                return; // Pause queue drain; user must resolve first
            }
        }
    }

    static getActiveConflicts() {
        return Array.from(_activeConflicts.values());
    }
}
