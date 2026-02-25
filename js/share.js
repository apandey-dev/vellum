/**
 * js/share.js
 * Sharing logic and auto-expiry.
 */
import { storage } from './storage.js';

const SHARE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const share = {
    generateToken() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    },

    activateShare(noteId) {
        const token = this.generateToken();
        const expiresAt = Date.now() + SHARE_DURATION;
        return storage.updateNote(noteId, {
            isPublic: true,
            shareToken: token,
            shareExpiresAt: expiresAt
        });
    },

    deactivateShare(noteId) {
        return storage.updateNote(noteId, {
            isPublic: false,
            shareToken: null,
            shareExpiresAt: null
        });
    },

    /**
     * Scans and cleans up expired shared notes.
     */
    cleanExpiredShares() {
        const allNotes = storage.getNotes();
        const now = Date.now();
        let changed = false;

        allNotes.forEach(note => {
            if (note.isPublic && note.shareExpiresAt && note.shareExpiresAt < now) {
                note.isPublic = false;
                note.shareToken = null;
                note.shareExpiresAt = null;
                changed = true;
            }
        });

        if (changed) {
            localStorage.setItem('vellum_notes', JSON.stringify(allNotes));
        }
    },

    /**
     * Retrieves a public note by its token, if valid.
     */
    getPublicNote(token) {
        this.cleanExpiredShares(); // Ensure we don't serve expired notes
        const note = storage.findNoteByShareToken(token);
        if (note && note.isPublic) {
            return note;
        }
        return null;
    }
};
