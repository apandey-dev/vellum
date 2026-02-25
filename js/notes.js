/**
 * js/notes.js
 * Note management logic.
 */
import { storage } from './storage.js';
import { generateUUID } from './utils.js';

export const notes = {
    create(userId, title = 'Untitled Note', content = '', folderId = null) {
        const newNote = {
            id: generateUUID(),
            userId,
            folderId,
            title,
            content,
            isPinned: false,
            isPublic: false,
            shareToken: null,
            shareExpiresAt: null,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const userNotes = storage.getNotes(userId);
        userNotes.unshift(newNote);
        storage.saveNotes(userNotes, userId);
        return newNote;
    },

    update(noteId, updates) {
        return storage.updateNote(noteId, updates);
    },

    delete(noteId) {
        storage.deleteNote(noteId);
    },

    togglePin(noteId) {
        const allNotes = storage.getNotes();
        const note = allNotes.find(n => n.id === noteId);
        if (note) {
            return storage.updateNote(noteId, { isPinned: !note.isPinned });
        }
        return null;
    }
};
