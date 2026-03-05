// js/sharing/gistShare.js
// GitHub Gist Sharing System
//
// Flow:
//   1. Load note content from IndexedDB
//   2. POST to GitHub Gist API
//   3. Save reference to IndexedDB meta
//   4. Commit shared/shared_notes.json update to the notes repository
//
// Rules:
//   - Never blocks UI thread; all operations are background async
//   - Graceful offline handling with user-facing error
//   - Does NOT store note content in the repo share index (only gistId + url)

import { DBStore } from '/js/storage/indexedDB.js';
import { GitHubAPI } from '/js/core/githubClient.js';
import { pushMetaUpdate } from '/js/notes/noteCRUD.js';

// ==================== SHARE REFERENCE STORE ====================

/**
 * Loads shared_notes.json from IndexedDB meta (cached) or falls back to
 * fetching from GitHub. Returns parsed shares array.
 */
async function loadShareIndex() {
    // Try IndexedDB cache first
    const cached = await DBStore.getMeta('sharedNotes');
    if (cached) return cached;

    // Cold start — fetch from GitHub
    try {
        const raw = await GitHubAPI.getFileContent('shared/shared_notes.json');
        const parsed = raw ? JSON.parse(raw) : { shares: [] };
        await DBStore.setMeta('sharedNotes', parsed);
        return parsed;
    } catch {
        return { shares: [] };
    }
}

/**
 * Saves the updated share index to IndexedDB and queues a GitHub commit.
 */
async function persistShareIndex(shareIndex) {
    await DBStore.setMeta('sharedNotes', shareIndex);
    // Commit the file using the same pipeline as other metadata operations
    await GitHubAPI.commitBatch('share: update shared_notes.json', [
        { path: 'shared/shared_notes.json', content: JSON.stringify(shareIndex, null, 2) }
    ]).catch(err => console.error('[GistShare] Failed to commit share index:', err));
}

// ==================== PUBLIC API ====================

/**
 * Creates a public GitHub Gist for the given note and saves the share reference.
 *
 * @param {{ id: string, title: string, content: string }} note
 * @returns {Promise<{ gistId: string, url: string }|null>}
 */
export async function shareNoteAsGist(note) {
    if (!navigator.onLine) {
        throw new Error('offline');
    }

    const safeTitle = (note.title || 'Untitled').replace(/[<>:"/\\|?*]/g, '_');
    const fileName = `${safeTitle}.md`;

    const payload = {
        description: `Shared from Vellum: ${note.title}`,
        public: true,
        files: {
            [fileName]: { content: note.content || '*(empty note)*' }
        }
    };

    const response = await GitHubAPI.request('/gists', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!response || !response.html_url) {
        throw new Error('Invalid Gist API response');
    }

    const shareRef = {
        noteId: note.id,
        gistId: response.id,
        url: response.html_url,
        created: Date.now()
    };

    // 1. Persist to IndexedDB note meta
    const meta = await DBStore.getMeta('index');
    if (meta && meta.notesIndex[note.id]) {
        meta.notesIndex[note.id].is_public = true;
        meta.notesIndex[note.id].gist_id = response.id;
        meta.notesIndex[note.id].public_url = response.html_url;
        await DBStore.setMeta('index', meta);
        // Fire-and-forget commit for metadata/index.json
        pushMetaUpdate(`share:${note.id}`, meta);
    }

    // 2. Persist to shared_notes.json
    const shareIndex = await loadShareIndex();

    // Avoid duplicate entries — update existing if re-sharing
    const existingIdx = shareIndex.shares.findIndex(s => s.noteId === note.id);
    if (existingIdx >= 0) {
        shareIndex.shares[existingIdx] = shareRef;
    } else {
        shareIndex.shares.push(shareRef);
    }

    await persistShareIndex(shareIndex);

    return { gistId: response.id, url: response.html_url };
}

/**
 * Updates an existing Gist with the latest note content (for re-sharing after edits).
 *
 * @param {string} gistId - The existing Gist ID
 * @param {{ title: string, content: string }} note
 * @returns {Promise<string>} updated Gist URL
 */
export async function updateGist(gistId, note) {
    if (!navigator.onLine) throw new Error('offline');

    const safeTitle = (note.title || 'Untitled').replace(/[<>:"/\\|?*]/g, '_');
    const fileName = `${safeTitle}.md`;

    const payload = {
        description: `Shared from Vellum: ${note.title}`,
        files: {
            [fileName]: { content: note.content || '*(empty note)*' }
        }
    };

    const response = await GitHubAPI.request(`/gists/${gistId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
    });

    return response?.html_url || `https://gist.github.com/${gistId}`;
}

/**
 * Retrieves the share reference for a given noteId from the local cache.
 *
 * @param {string} noteId
 * @returns {Promise<{ gistId: string, url: string }|null>}
 */
export async function getShareRef(noteId) {
    const meta = await DBStore.getMeta('index');
    if (meta?.notesIndex?.[noteId]?.gist_id) {
        return {
            gistId: meta.notesIndex[noteId].gist_id,
            url: meta.notesIndex[noteId].public_url
        };
    }

    // Fall back to share index
    const shareIndex = await loadShareIndex();
    const entry = shareIndex.shares.find(s => s.noteId === noteId);
    return entry ? { gistId: entry.gistId, url: entry.url } : null;
}

/**
 * Removes a share reference (does NOT delete the Gist from GitHub).
 */
export async function unshareNote(noteId) {
    const meta = await DBStore.getMeta('index');
    if (meta && meta.notesIndex[noteId]) {
        delete meta.notesIndex[noteId].is_public;
        delete meta.notesIndex[noteId].gist_id;
        delete meta.notesIndex[noteId].public_url;
        await DBStore.setMeta('index', meta);
        pushMetaUpdate(`unshare:${noteId}`, meta);
    }

    const shareIndex = await loadShareIndex();
    shareIndex.shares = shareIndex.shares.filter(s => s.noteId !== noteId);
    await persistShareIndex(shareIndex);
}