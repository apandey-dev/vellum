/**
 * js/storage.js
 * Persistent data layer using localStorage.
 */

const STORAGE_KEYS = {
    USERS: 'vellum_users',
    NOTES: 'vellum_notes',
    FOLDERS: 'vellum_folders'
};

export const storage = {
    /**
     * Users Storage
     */
    getUsers() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    },

    saveUser(user) {
        const users = this.getUsers();
        if (users.length >= 10) {
            throw new Error('User limit reached. No more accounts allowed.');
        }
        users.push(user);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    },

    findUserByEmail(email) {
        return this.getUsers().find(u => u.email === email);
    },

    /**
     * Notes Storage
     */
    getNotes(userId) {
        const allNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || '[]');
        if (!userId) return allNotes; // For public link access
        return allNotes.filter(n => n.userId === userId);
    },

    saveNotes(notes, userId) {
        const allNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || '[]');
        const filteredOtherUsers = allNotes.filter(n => n.userId !== userId);
        const updatedAllNotes = [...filteredOtherUsers, ...notes];
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updatedAllNotes));
    },

    updateNote(noteId, updates) {
        const allNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || '[]');
        const index = allNotes.findIndex(n => n.id === noteId);
        if (index !== -1) {
            allNotes[index] = { ...allNotes[index], ...updates, updatedAt: Date.now() };
            localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(allNotes));
            return allNotes[index];
        }
        return null;
    },

    deleteNote(noteId) {
        const allNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || '[]');
        const updatedNotes = allNotes.filter(n => n.id !== noteId);
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updatedNotes));
    },

    findNoteByShareToken(token) {
        const allNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || '[]');
        return allNotes.find(n => n.shareToken === token);
    },

    /**
     * Folders Storage
     */
    getFolders(userId) {
        const allFolders = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLDERS) || '[]');
        return allFolders.filter(f => f.userId === userId);
    },

    saveFolders(folders, userId) {
        const allFolders = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLDERS) || '[]');
        const filteredOtherUsers = allFolders.filter(f => f.userId !== userId);
        const updatedAllFolders = [...filteredOtherUsers, ...folders];
        localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(updatedAllFolders));
    },

    deleteFolder(folderId) {
        const allFolders = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLDERS) || '[]');
        const updatedFolders = allFolders.filter(f => f.id !== folderId);
        localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(updatedFolders));

        // Also update notes that were in this folder
        const allNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || '[]');
        allNotes.forEach(n => {
            if (n.folderId === folderId) n.folderId = null;
        });
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(allNotes));
    }
};
