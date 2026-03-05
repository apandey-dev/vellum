// js/notes/noteCRUD.js
// GitHub-backed Note CRUD Pipeline
// Flow: IndexedDB (instant UI) → offlineQueue → GitHub commit (background)

import { DBStore } from '/js/storage/indexedDB.js';
import { GitHubAPI } from '/js/core/githubClient.js';
import { OfflineQueue } from '/js/storage/offlineQueue.js';

// ==================== PATH HELPERS ====================

/**
 * Derive a hash-partitioned path for a note.
 * Pattern: notes/<char0>/<char1>/<noteId>.md
 */
export function getNoteFilePath(noteId) {
    const a = noteId.charAt(0) || '0';
    const b = noteId.charAt(1) || '0';
    return `notes/${a}/${b}/${noteId}.md`;
}

// ==================== BACKGROUND COMMIT ====================

/**
 * Commits a batch of file changes to GitHub.
 * Performs conflict pre-check: if remote HEAD has advanced since our
 * cached SHA we emit 'conflict-detected' instead of blindly overwriting.
 *
 * @param {string} message - Commit message
 * @param {{ path: string, content: string|null }[]} files
 * @returns {Promise<string|null>} new commit SHA, or null on conflict/offline
 */
async function commitToGitHub(message, files) {
    if (!navigator.onLine) return null;
    try {
        const remoteHead = await GitHubAPI.getLatestCommit();
        const cachedSha = await DBStore.getMeta('lastCommitSha');

        // Conflict check: remote has moved past our local snapshot
        if (cachedSha && remoteHead && remoteHead !== cachedSha) {
            console.warn('[noteCRUD] SHA mismatch — conflict detected', { remoteHead, cachedSha });
            document.dispatchEvent(new CustomEvent('conflict-detected'));
            return null;
        }

        const newSha = await GitHubAPI.commitBatch(message, files);
        await DBStore.setMeta('lastCommitSha', newSha);
        return newSha;
    } catch (err) {
        console.error('[noteCRUD] Commit failed:', err.message);
        return null;
    }
}

/**
 * Build the metadata index JSON content from the current DBStore state.
 */
async function buildMetaContent() {
    const meta = await DBStore.getMeta('index') || { folders: {}, notesIndex: {} };
    return JSON.stringify(meta, null, 2);
}

// ==================== PUBLIC CRUD API ====================

/**
 * Called after a note is saved to IndexedDB.
 * Commits the note content + updated metadata in one batch.
 */
export async function pushNoteUpdate(noteId, content) {
    const meta = await DBStore.getMeta('index');
    if (!meta || !meta.notesIndex[noteId]) return;

    const path = meta.notesIndex[noteId].path || getNoteFilePath(noteId);
    meta.notesIndex[noteId].updated = Date.now();
    await DBStore.setMeta('index', meta);

    const files = [
        { path, content },
        { path: 'metadata/index.json', content: JSON.stringify(meta, null, 2) }
    ];

    if (!navigator.onLine) {
        await OfflineQueue.enqueue({ type: 'UPDATE', payload: { path, content } });
        await OfflineQueue.enqueue({ type: 'INDEX', payload: { path: 'metadata/index.json', content: JSON.stringify(meta, null, 2) } });
        return;
    }

    await commitToGitHub(`update: ${meta.notesIndex[noteId]?.title || noteId}`, files);
}

/**
 * Called when a note is created.
 * Commits the new note file + updated metadata in one batch.
 */
export async function pushNoteCreate(note, meta) {
    const path = meta.notesIndex[note.id]?.path || getNoteFilePath(note.id);

    const files = [
        { path, content: note.content || '' },
        { path: 'metadata/index.json', content: JSON.stringify(meta, null, 2) }
    ];

    if (!navigator.onLine) {
        await OfflineQueue.enqueue({ type: 'UPDATE', payload: { path, content: note.content || '' } });
        await OfflineQueue.enqueue({ type: 'INDEX', payload: { path: 'metadata/index.json', content: JSON.stringify(meta, null, 2) } });
        return;
    }

    await commitToGitHub(`create: ${note.title}`, files);
}

/**
 * Called when a note is deleted.
 * Commits the deletion (null content = tree removal) + metadata in one batch.
 */
export async function pushNoteDelete(noteId, notePath, meta) {
    const files = [
        { path: notePath, content: null }, // null → remove from tree
        { path: 'metadata/index.json', content: JSON.stringify(meta, null, 2) }
    ];

    if (!navigator.onLine) {
        await OfflineQueue.enqueue({ type: 'DELETE', payload: { path: notePath, content: null } });
        await OfflineQueue.enqueue({ type: 'INDEX', payload: { path: 'metadata/index.json', content: JSON.stringify(meta, null, 2) } });
        return;
    }

    await commitToGitHub(`delete: ${noteId}`, files);
}

/**
 * Called for metadata-only operations (rename, move, pin, folder ops).
 * Commits only the updated metadata/index.json.
 */
export async function pushMetaUpdate(label, meta) {
    const content = JSON.stringify(meta, null, 2);
    const files = [{ path: 'metadata/index.json', content }];

    if (!navigator.onLine) {
        await OfflineQueue.enqueue({ type: 'INDEX', payload: { path: 'metadata/index.json', content } });
        return;
    }

    await commitToGitHub(`meta: ${label}`, files);
}