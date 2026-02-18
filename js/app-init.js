// js/app-init.js
// Main application initialization sequence

import { checkAuthAndProfile, updateProfileUI } from './auth.js';
import { handleRoute } from './router.js';
import {
    loadFolders, createFolder, loadNotes, createNote,
    renderNoteChips, loadActiveNote, setActiveFolder, setActiveNote,
    setupEditorListeners, folders, notes
} from './editor.js';
import { setupModalListeners } from './modals.js';
import { setupSearchListeners } from './search.js';
import { setupExportListeners } from './export.js';
import { setupUIListeners } from './ui-handlers.js';

async function initApp() {
    console.log('MindJournal: Starting global initialization...');

    // 1. Immediate UI Setup (Non-blocking)
    setupModalListeners();
    attachGlobalListeners();
    console.log('MindJournal: Initial UI listeners attached.');

    // 2. Handle Routing (View switching)
    // This will check auth and show appropriate view
    await handleRoute();
    console.log('MindJournal: Global initialization complete.');
}

export async function initDashboard(user, profile, isActive) {
    if (window.dashboardInitialized) return;
    console.log('MindJournal: Starting dashboard initialization...');

    updateProfileUI(user);

    if (!isActive) {
        console.log('MindJournal: User pending approval.');
        showPendingUI(profile);
        window.dashboardInitialized = true;
        return;
    }

    // 4. Load Data
    console.log('MindJournal: Loading folders...');
    await loadFolders(user.id);

    // Ensure Default Folder
    if (folders.length === 0) {
        const defaultFolder = await createFolder('General', user.id);
        if (defaultFolder) {
            setActiveFolder(defaultFolder.id);
        }
    } else {
        setActiveFolder(folders[0].id);
    }

    // 5. Load Notes
    console.log('MindJournal: Loading notes...');
    await loadNotes(user.id);

    // 6. Ensure Default Note
    const currentFolderId = folders[0]?.id;
    const folderNotes = notes.filter(n => n.folder_id === currentFolderId);

    if (folderNotes.length === 0 && currentFolderId) {
        const defaultNote = await createNote('New Note', currentFolderId, user.id);
        if (defaultNote) {
            setActiveNote(defaultNote.id);
        }
    } else if (folderNotes.length > 0) {
        setActiveNote(folderNotes[0].id);
    }

    // 7. Render UI
    console.log('MindJournal: Rendering UI...');
    renderNoteChips();
    loadActiveNote();

    // 8. Feature Setup
    console.log('MindJournal: Setting up features...');
    setupEditorListeners();
    setupSearchListeners();
    setupExportListeners();
    setupUIListeners(user.id);

    window.dashboardInitialized = true;
    console.log('MindJournal: Dashboard initialization complete.');
}

function showPendingUI(profile) {
    const writingCanvas = document.getElementById('writingCanvas');
    if (writingCanvas) {
        writingCanvas.innerHTML = `
            <div class="empty-folder-message">
                <div class="empty-folder-icon"><i class="fas fa-user-clock"></i></div>
                <h3>Account Pending Approval</h3>
                <p>Your account (<b>${profile?.email || 'unknown'}</b>) is currently pending admin approval.</p>
                <p>Once approved, you will be able to create and manage your notes.</p>
            </div>
        `;
        writingCanvas.contentEditable = 'false';
    }

    // Disable actions
    const addNoteBtn = document.getElementById('addNoteBtn');
    if (addNoteBtn) addNoteBtn.classList.add('disabled');

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        // We could hide some sidebar items here
    }
}

function attachGlobalListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('focuspad_theme', newTheme);
        });
    }
}

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initApp().catch(err => {
        console.error('Failed to initialize app:', err);
    });
});
