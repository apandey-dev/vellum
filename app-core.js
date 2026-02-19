// ========================================
// Vellum - CORE LOGIC
// ========================================

// --- ELEMENT REFERENCES (GLOBAL) ---
const sidebar = document.getElementById('sidebar');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const topBar = document.getElementById('topBar');
const workspace = document.querySelector('.workspace');
const focusBtn = document.getElementById('focusBtn');
const restoreBtn = document.getElementById('restoreBtn');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const html = document.documentElement;
const writingCanvas = document.getElementById('writingCanvas');
const formattingIndicator = document.getElementById('formattingIndicator');

// Modal elements
const confirmModal = document.getElementById('confirmModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const newNoteModal = document.getElementById('newNoteModal');
const manageFoldersModal = document.getElementById('manageFoldersModal');
const exportModal = document.getElementById('exportModal');
const closeExportModalBtn = document.getElementById('closeExportModal');
const exportConfirmBtn = document.getElementById('exportConfirmBtn');
const exportFileNameInput = document.getElementById('exportFileName');
const exportCards = document.querySelectorAll('.export-card');
const confirmFolderDeleteModal = document.getElementById('confirmFolderDeleteModal');
const cancelFolderDeleteBtn = document.getElementById('cancelFolderDelete');
const confirmFolderDeleteBtn = document.getElementById('confirmFolderDelete');
const renameNoteModal = document.getElementById('renameNoteModal');
const renameNoteInput = document.getElementById('renameNoteInput');
const confirmRenameBtn = document.getElementById('confirmRenameBtn');
const cancelRenameBtn = document.getElementById('cancelRenameBtn');

// Move note modal elements
const moveNoteModal = document.getElementById('moveNoteModal');
const moveNoteNameSpan = document.getElementById('moveNoteName');
const moveFolderSelectWrapper = document.getElementById('moveFolderSelectWrapper');
const moveFolderSelectTrigger = document.getElementById('moveFolderSelectTrigger');
const moveSelectedFolderName = document.getElementById('moveSelectedFolderName');
const moveFolderSelectOptions = document.getElementById('moveFolderSelectOptions');
const moveNewFolderInput = document.getElementById('moveNewFolderName');
const createAndMoveBtn = document.getElementById('createAndMoveBtn');
const cancelMoveBtn = document.getElementById('cancelMoveBtn');
const confirmMoveBtn = document.getElementById('confirmMoveBtn');

// Share Modal
const shareModal = document.getElementById('shareModal');

// Button elements
const searchBtn = document.getElementById('searchBtn');
const exportBtn = document.getElementById('exportBtn');
const deleteBtn = document.getElementById('deleteBtn');
const addNoteBtn = document.getElementById('addNoteBtn');
const pinBtn = document.getElementById('pinBtn');
const manageFoldersBtn = document.getElementById('manageFoldersBtn');
const shareBtn = document.getElementById('shareBtn');
const userProfileBtn = document.getElementById('userProfileBtn');
const userProfileModal = document.getElementById('userProfileModal');
const closeProfileModalBtn = document.getElementById('closeProfileModal');
const logoutBtn = document.getElementById('logoutBtn');

// Mobile UI elements
const mobileBackBtn = document.getElementById('mobileBackBtn');
const mobileTitle = document.getElementById('mobileTitle');
const dashboardView = document.getElementById('dashboardView');
const mobileNotesList = document.getElementById('mobileNotesList');
const mobileFab = document.getElementById('mobileFab');
const mobileToolbar = document.getElementById('mobileToolbar');
const currentFolderName = document.getElementById('currentFolderName');

// Note chips container
const noteChips = document.getElementById('noteChips');

// Search Modal elements
const searchModal = document.getElementById('searchModal');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const closeSearchModalBtn = document.getElementById('closeSearchModal');

// Context menu elements
const noteContextMenu = document.getElementById('noteContextMenu');
const ctxRename = document.getElementById('ctxRename');
const ctxPin = document.getElementById('ctxPin');
const moveToFolderItem = document.getElementById('moveToFolderItem');
const ctxDelete = document.getElementById('ctxDelete');

// --- STORAGE KEYS ---
const THEME_KEY = 'vellum_theme';
const NOTES_KEY = 'vellum_notes';
const FOLDERS_KEY = 'vellum_folders';
const ACTIVE_NOTE_KEY = 'vellum_activeNote';
const ACTIVE_FOLDER_KEY = 'vellum_activeFolder';
const LAST_NOTE_PER_FOLDER_KEY = 'vellum_lastNotePerFolder';
const USER_KEY = 'vellum_user';

// --- STORAGE MIGRATION ---
function migrateStorage() {
    const migrations = {
        'focuspad_theme': THEME_KEY,
        'focuspad_notes': NOTES_KEY,
        'focuspad_folders': FOLDERS_KEY,
        'focuspad_activeNote': ACTIVE_NOTE_KEY,
        'focuspad_activeFolder': ACTIVE_FOLDER_KEY,
        'focuspad_lastNotePerFolder': LAST_NOTE_PER_FOLDER_KEY,
        'mj_user': USER_KEY,
        'mindjournal_print_content': 'vellum_print_content',
        'mindjournal_print_title': 'vellum_print_title'
    };
    for (const [oldKey, newKey] of Object.entries(migrations)) {
        const val = localStorage.getItem(oldKey);
        if (val && !localStorage.getItem(newKey)) {
            localStorage.setItem(newKey, val);
        }
    }
}
migrateStorage();

// --- URL GUARD ---
if (window.location.pathname.endsWith('.html') && !window.location.pathname.includes('error.html')) {
    const cleanPath = window.location.pathname.replace('.html', '').replace('/index', '/');
    window.location.replace(cleanPath || '/');
}

// --- DATA STRUCTURES ---
let notes = [];
let folders = [];
let activeNoteId = null;
let activeFolderId = 'default';
let lastNotePerFolder = {};

// Export state
let selectedExportFormat = null;

// ESC Key Hierarchy Management
let modalStack = [];

// ==================== UNDO / REDO ====================
let undoStack = [];               // array of snapshots
let undoIndex = -1;               // current position in stack (-1 means no state yet)
const MAX_UNDO = 50;

// ==================== FALLBACK FOR FONT FUNCTION (will be overwritten by app-editor.js) ====================
function getCurrentFont() {
    return 'Fredoka';
}

function pushToUndo() {
    if (undoIndex < undoStack.length - 1) {
        undoStack = undoStack.slice(0, undoIndex + 1);
    }
    const snapshot = {
        notes: JSON.parse(JSON.stringify(notes)),
        folders: JSON.parse(JSON.stringify(folders)),
        activeNoteId: activeNoteId,
        activeFolderId: activeFolderId,
        lastNotePerFolder: JSON.parse(JSON.stringify(lastNotePerFolder))
    };
    undoStack.push(snapshot);
    if (undoStack.length > MAX_UNDO) {
        undoStack.shift();
    } else {
        undoIndex++;
    }
}

function restoreState(index) {
    if (index < 0 || index >= undoStack.length) return;
    const state = undoStack[index];
    notes = JSON.parse(JSON.stringify(state.notes));
    folders = JSON.parse(JSON.stringify(state.folders));
    activeNoteId = state.activeNoteId;
    activeFolderId = state.activeFolderId;
    lastNotePerFolder = JSON.parse(JSON.stringify(state.lastNotePerFolder));

    if (!folders.find(f => f.id === activeFolderId)) {
        activeFolderId = folders[0]?.id || null;
    }
    if (activeNoteId && !notes.find(n => n.id === activeNoteId)) {
        const folderNotes = getNotesInFolder(activeFolderId);
        activeNoteId = folderNotes.length > 0 ? folderNotes[0].id : null;
    }

    saveToStorage();
    renderNoteChips();
    renderFolderList();
    loadActiveNote();
    undoIndex = index;
}

function undo() {
    if (undoIndex > 0) {
        restoreState(undoIndex - 1);
        showFormattingIndicator('Undo', 'success');
    } else {
        showFormattingIndicator('Nothing to undo', 'error');
    }
}

function redo() {
    if (undoIndex < undoStack.length - 1) {
        restoreState(undoIndex + 1);
        showFormattingIndicator('Redo', 'success');
    } else {
        showFormattingIndicator('Nothing to redo', 'error');
    }
}

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
            e.preventDefault();
            redo();
        }
    }
});

// --- HELPER FUNCTIONS ---
function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function showFormattingIndicator(message, type = 'info') {
    if (!formattingIndicator) return;
    formattingIndicator.textContent = message;
    formattingIndicator.className = 'formatting-indicator';
    formattingIndicator.classList.add('show');
    if (type === 'success') formattingIndicator.classList.add('success');
    else if (type === 'error') formattingIndicator.classList.add('error');
    setTimeout(() => {
        formattingIndicator.classList.remove('show');
        formattingIndicator.classList.remove('success', 'error');
    }, 3000);
}

// --- STORAGE FUNCTIONS ---
function saveToStorage() {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
    localStorage.setItem(ACTIVE_NOTE_KEY, activeNoteId);
    localStorage.setItem(ACTIVE_FOLDER_KEY, activeFolderId);
    localStorage.setItem(LAST_NOTE_PER_FOLDER_KEY, JSON.stringify(lastNotePerFolder));
}

function loadFromStorage() {
    const savedNotes = localStorage.getItem(NOTES_KEY);
    const savedFolders = localStorage.getItem(FOLDERS_KEY);
    const savedActiveNote = localStorage.getItem(ACTIVE_NOTE_KEY);
    const savedActiveFolder = localStorage.getItem(ACTIVE_FOLDER_KEY);
    const savedLastNotePerFolder = localStorage.getItem(LAST_NOTE_PER_FOLDER_KEY);

    if (savedNotes) notes = JSON.parse(savedNotes);
    if (savedFolders) folders = JSON.parse(savedFolders);
    if (savedActiveNote) activeNoteId = savedActiveNote;
    if (savedActiveFolder) activeFolderId = savedActiveFolder;
    if (savedLastNotePerFolder) lastNotePerFolder = JSON.parse(savedLastNotePerFolder);

    if (folders.length === 0) {
        folders.push({ id: 'folder_general', name: 'General', isDefault: true });
        activeFolderId = 'folder_general';
    }
    if (!folders.find(f => f.id === activeFolderId)) {
        activeFolderId = folders[0].id;
    }
    if (notes.length === 0) {
        const firstNote = {
            id: generateId(),
            name: 'NewNote',
            folderId: activeFolderId,
            content: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isPinned: false
        };
        notes.push(firstNote);
        activeNoteId = firstNote.id;
    }
}

// --- MODAL MANAGEMENT ---
function pushToModalStack(modal) {
    modalStack.push(modal);
}

function setupModalClose(modalElement) {
    if (!modalElement) return;
    modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) {
            modalElement.classList.remove('show');
            const index = modalStack.indexOf(modalElement);
            if (index > -1) modalStack.splice(index, 1);
            if (modalElement.id === 'confirmFolderDeleteModal') {
                delete modalElement.dataset.pendingFolderId;
            }
            if (modalElement.id === 'moveNoteModal') {
                window.contextMenuNoteId = null;
            }
        }
    });
}

[confirmModal, newNoteModal, manageFoldersModal, exportModal, confirmFolderDeleteModal, renameNoteModal, shareModal, searchModal, moveNoteModal, userProfileModal].forEach(modal => {
    if (modal) setupModalClose(modal);
});

// --- NOTE OPERATIONS ---
function getNotesInFolder(folderId) {
    return notes.filter(n => n.folderId === folderId);
}

function saveCurrentNote() {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        note.content = cleanNoteContent(writingCanvas.innerHTML);
        note.updatedAt = Date.now();
        saveToStorage();
    }
}

function createNote(name, folderId) {
    pushToUndo();
    const note = {
        id: generateId(),
        name: name,
        folderId: folderId,
        content: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPinned: false
    };
    notes.push(note);
    activeNoteId = note.id;
    saveToStorage();
    renderNoteChips();
    loadActiveNote();
    showFormattingIndicator('Note created!');

    if (window.innerWidth <= 768) {
        switchToEditor(note.id);
    }
}

function deleteNote(noteId) {
    pushToUndo();
    const index = notes.findIndex(n => n.id === noteId);
    if (index > -1) {
        notes.splice(index, 1);
        const folderNotes = getNotesInFolder(activeFolderId);
        if (folderNotes.length === 0) {
            activeNoteId = null;
            showFormattingIndicator('Note deleted! No notes in this folder.');
            if (window.innerWidth <= 768) switchToDashboard();
        } else if (activeNoteId === noteId) {
            activeNoteId = folderNotes[0].id;
            showFormattingIndicator('Note deleted! Switched to next note.');
            if (window.innerWidth <= 768) switchToDashboard();
        } else {
            showFormattingIndicator('Note deleted!');
        }
        saveToStorage();
        renderNoteChips();
        loadActiveNote();
    }
}

function renameNote(noteId, newName) {
    pushToUndo();
    const note = notes.find(n => n.id === noteId);
    if (note) {
        note.name = newName;
        saveToStorage();
        renderNoteChips();
        showFormattingIndicator('Note renamed');
        if (window.innerWidth <= 768 && activeNoteId === noteId) {
            mobileTitle.textContent = newName;
        }
    }
}

function switchNote(noteId) {
    saveCurrentNote();
    activeNoteId = noteId;
    saveToStorage();
    loadActiveNote();
    renderNoteChips();

    if (window.innerWidth <= 768) {
        switchToEditor(noteId);
    }
}

function loadActiveNote() {
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        writingCanvas.innerHTML = cleanNoteContent(note.content || '');
        writingCanvas.contentEditable = 'true';
        writingCanvas.classList.remove('empty-folder-message');
        updatePinButton();
        if (getNotesInFolder(activeFolderId).length > 0) {
            deleteBtn.classList.remove('disabled');
        }
    } else {
        const folderNotes = getNotesInFolder(activeFolderId);
        if (folderNotes.length === 0) {
            writingCanvas.innerHTML = `
                <div class="empty-folder-message">
                    <div class="empty-folder-icon"><i class="fas fa-note-sticky"></i></div>
                    <h3>No Notes in This Folder</h3>
                    <p>This folder is empty. Create a new note to get started!</p>
                    <button class="create-note-btn abc" id="createNoteFromEmpty">Create New Note</button>
                </div>
            `;
            writingCanvas.contentEditable = 'false';
            writingCanvas.classList.add('empty-folder-message');
            deleteBtn.classList.add('disabled');
            updatePinButton();
            setTimeout(() => {
                const createBtn = document.getElementById('createNoteFromEmpty');
                if (createBtn) {
                    createBtn.addEventListener('click', () => {
                        updateFolderDropdown();
                        document.getElementById('newNoteName').value = '';
                        newNoteModal.classList.add('show');
                        pushToModalStack(newNoteModal);
                        setTimeout(() => document.getElementById('newNoteName').focus(), 100);
                    });
                }
            }, 100);
        } else {
            activeNoteId = folderNotes[0].id;
            saveToStorage();
            loadActiveNote();
        }
    }
}

function updatePinButton() {
    if (!pinBtn) return;
    pinBtn.innerHTML = '<i class="fas fa-thumbtack"></i>';
    if (!activeNoteId) {
        pinBtn.classList.remove('pinned');
        return;
    }
    const note = notes.find(n => n.id === activeNoteId);
    if (note && note.isPinned) {
        pinBtn.classList.add('pinned');
    } else {
        pinBtn.classList.remove('pinned');
    }
}

function togglePinNote() {
    if (!activeNoteId) {
        showFormattingIndicator('No active note to pin');
        return;
    }
    pushToUndo();
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        note.isPinned = !note.isPinned;
        saveToStorage();
        updatePinButton();
        renderNoteChips();
        showFormattingIndicator(note.isPinned ? 'Note pinned' : 'Note unpinned');
    }
}
if (pinBtn) pinBtn.addEventListener('click', togglePinNote);

function createFolder(name) {
    pushToUndo();
    const folder = { id: generateId(), name: name, isDefault: false };
    folders.push(folder);
    saveToStorage();
    renderFolderList();
    updateFolderDropdown();
    showFormattingIndicator('Folder created!');
}

function deleteFolder(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (folder.isDefault) {
        showFormattingIndicator('Cannot delete default folder!');
        return;
    }
    const folderNotes = notes.filter(n => n.folderId === folderId);
    const modal = document.getElementById('confirmFolderDeleteModal');
    const titleEl = document.getElementById('folderDeleteTitle');
    const messageEl = document.getElementById('folderDeleteMessage');
    titleEl.textContent = `Delete "${folder.name}"?`;
    if (folderNotes.length > 0) {
        messageEl.textContent = `${folderNotes.length} note(s) will be moved to General folder.`;
    } else {
        messageEl.textContent = 'This folder will be deleted.';
    }
    modal.classList.add('show');
    pushToModalStack(modal);
    modal.dataset.pendingFolderId = folderId;
}

function setActiveFolder(folderId) {
    if (activeNoteId) {
        saveCurrentNote();
        lastNotePerFolder[activeFolderId] = activeNoteId;
    }
    activeFolderId = folderId;
    const folderNotes = getNotesInFolder(folderId);
    if (folderNotes.length > 0) {
        const lastNoteId = lastNotePerFolder[folderId];
        const lastNote = folderNotes.find(n => n.id === lastNoteId);
        if (lastNote) activeNoteId = lastNote.id;
        else activeNoteId = folderNotes[0].id;
    } else {
        activeNoteId = null;
    }
    saveToStorage();
    renderNoteChips();
    renderFolderList();
    loadActiveNote();

    if (window.innerWidth <= 768) {
        renderMobileDashboard();
    }
}

function renderNoteChips() {
    if (!noteChips) return;
    noteChips.innerHTML = '';
    const folderNotes = getNotesInFolder(activeFolderId);
    if (folderNotes.length === 0) {
        const emptyChip = document.createElement('div');
        emptyChip.className = 'chip empty-chip';
        emptyChip.textContent = 'No notes';
        noteChips.appendChild(emptyChip);
        return;
    }
    folderNotes.sort((a, b) => (b.isPinned === true) - (a.isPinned === true));
    folderNotes.forEach(note => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        if (note.id === activeNoteId) chip.classList.add('active');
        if (note.isPinned) chip.classList.add('pinned');
        chip.dataset.noteId = note.id;
        const chipContent = document.createElement('div');
        chipContent.className = 'chip-content';
        if (note.isPinned) {
            const pinIcon = document.createElement('i');
            pinIcon.className = 'fas fa-thumbtack gap';
            chipContent.appendChild(pinIcon);
        }
        const textSpan = document.createElement('span');
        textSpan.textContent = note.name;
        chipContent.appendChild(textSpan);
        chip.appendChild(chipContent);

        const menuBtn = document.createElement('div');
        menuBtn.className = 'chip-menu-btn';
        menuBtn.innerHTML = '';
        menuBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            window.contextMenuNoteId = note.id;
            const noteObj = notes.find(n => n.id === note.id);
            if (noteObj) {
                ctxPin.innerHTML = noteObj.isPinned ? '<i class="fas fa-thumbtack-slash"></i> Unpin Note' : '<i class="fas fa-thumbtack"></i> Pin Note';
            }
            const rect = menuBtn.getBoundingClientRect();
            const x = Math.min(rect.right, window.innerWidth - 220);
            const y = Math.min(rect.bottom, window.innerHeight - 250);
            noteContextMenu.style.left = `${x}px`;
            noteContextMenu.style.top = `${y}px`;
            setTimeout(() => {
                noteContextMenu.classList.add('show');
            }, 10);
        };
        chip.appendChild(menuBtn);
        chip.onclick = () => switchNote(note.id);
        noteChips.appendChild(chip);
    });
}

function renderFolderList() {
    const folderList = document.getElementById('folderList');
    const mobileSidebarFolderList = document.getElementById('mobileSidebarFolderList');

    if (folderList) folderList.innerHTML = '';
    if (mobileSidebarFolderList) mobileSidebarFolderList.innerHTML = '';

    folders.forEach(folder => {
        const item = document.createElement('div');
        item.className = 'folder-item';
        if (folder.id === activeFolderId) item.classList.add('active');
        const nameDiv = document.createElement('div');
        nameDiv.className = 'folder-name';
        nameDiv.textContent = folder.name;
        nameDiv.onclick = () => {
            setActiveFolder(folder.id);
            if (manageFoldersModal) manageFoldersModal.classList.remove('show');
            const index = modalStack.indexOf(manageFoldersModal);
            if (index > -1) modalStack.splice(index, 1);
        };
        const actions = document.createElement('div');
        actions.className = 'folder-actions';
        if (!folder.isDefault) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'folder-action-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteFolder(folder.id);
            };
            actions.appendChild(deleteBtn);
        }
        item.appendChild(nameDiv);
        item.appendChild(actions);
        if (folderList) folderList.appendChild(item);

        if (mobileSidebarFolderList) {
            const mobileItem = document.createElement('div');
            mobileItem.className = 'sidebar-folder-item';
            if (folder.id === activeFolderId) mobileItem.classList.add('active');
            mobileItem.innerHTML = `<i class="fas fa-folder"></i> <span>${escapeHtml(folder.name)}</span>`;
            mobileItem.onclick = () => {
                setActiveFolder(folder.id);
                if (window.innerWidth <= 768) toggleMobileSidebar();
            };
            mobileSidebarFolderList.appendChild(mobileItem);
        }
    });
}

function updateFolderDropdown() {
    const optionsContainer = document.getElementById('folderSelectOptions');
    const selectedNameSpan = document.getElementById('selectedFolderName');
    const wrapper = document.getElementById('folderSelectWrapper');
    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';
    let selectedFolderId = activeFolderId;
    folders.forEach(folder => {
        const option = document.createElement('div');
        option.className = 'select-option';
        option.textContent = folder.name;
        option.dataset.folderId = folder.id;
        if (folder.id === selectedFolderId) {
            option.classList.add('selected');
            selectedNameSpan.textContent = folder.name;
        }
        option.addEventListener('click', () => {
            selectedFolderId = folder.id;
            selectedNameSpan.textContent = folder.name;
            optionsContainer.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            wrapper.classList.remove('active');
        });
        optionsContainer.appendChild(option);
    });
    const trigger = document.getElementById('folderSelectTrigger');
    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);
    newTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        wrapper.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
        if (wrapper && !wrapper.contains(e.target)) wrapper.classList.remove('active');
    });
}

function getSelectedFolderId() {
    const selectedOption = document.querySelector('.select-option.selected');
    return selectedOption ? selectedOption.dataset.folderId : activeFolderId;
}

function openMoveModal(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    moveNoteNameSpan.textContent = `Moving: "${note.name}"`;
    window.contextMenuNoteId = noteId;
    updateMoveFolderDropdown(note.folderId);
    moveSelectedFolderName.textContent = 'Choose folder';
    moveNewFolderInput.value = '';
    confirmMoveBtn.disabled = true;
    moveNoteModal.classList.add('show');
    pushToModalStack(moveNoteModal);
}

function updateMoveFolderDropdown(excludeFolderId) {
    moveFolderSelectOptions.innerHTML = '';
    let hasOptions = false;
    folders.forEach(folder => {
        if (folder.id === excludeFolderId) return;
        hasOptions = true;
        const option = document.createElement('div');
        option.className = 'select-option';
        option.textContent = folder.name;
        option.dataset.folderId = folder.id;
        option.addEventListener('click', () => {
            moveSelectedFolderName.textContent = folder.name;
            moveFolderSelectOptions.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            moveFolderSelectWrapper.classList.remove('active');
            confirmMoveBtn.disabled = false;
        });
        moveFolderSelectOptions.appendChild(option);
    });
    if (!hasOptions) {
        const option = document.createElement('div');
        option.className = 'select-option disabled';
        option.textContent = 'No other folders';
        moveFolderSelectOptions.appendChild(option);
    }
}

function moveNoteToFolder(noteId, targetFolderId) {
    pushToUndo();
    const note = notes.find(n => n.id === noteId);
    if (!note || note.folderId === targetFolderId) return;
    const sourceFolderId = note.folderId;
    note.folderId = targetFolderId;
    saveToStorage();
    if (noteId === activeNoteId && sourceFolderId === activeFolderId) {
        const remainingNotes = getNotesInFolder(sourceFolderId);
        activeNoteId = remainingNotes.length > 0 ? remainingNotes[0].id : null;
        saveToStorage();
        renderNoteChips();
        loadActiveNote();
    } else {
        renderNoteChips();
    }
    showFormattingIndicator('Note moved', 'success');
}

if (cancelMoveBtn) cancelMoveBtn.addEventListener('click', () => {
    moveNoteModal.classList.remove('show');
    const index = modalStack.indexOf(moveNoteModal);
    if (index > -1) modalStack.splice(index, 1);
    window.contextMenuNoteId = null;
});

if (confirmMoveBtn) confirmMoveBtn.addEventListener('click', () => {
    const selectedOption = moveFolderSelectOptions.querySelector('.select-option.selected');
    if (!selectedOption) return;
    const folderId = selectedOption.dataset.folderId;
    if (folderId && window.contextMenuNoteId) {
        moveNoteToFolder(window.contextMenuNoteId, folderId);
        moveNoteModal.classList.remove('show');
        const index = modalStack.indexOf(moveNoteModal);
        if (index > -1) modalStack.splice(index, 1);
        window.contextMenuNoteId = null;
    }
});

if (createAndMoveBtn) createAndMoveBtn.addEventListener('click', () => {
    const newFolderName = moveNewFolderInput.value.trim();
    if (!newFolderName) {
        showFormattingIndicator('Please enter a folder name', 'error');
        return;
    }
    createFolder(newFolderName);
    const newFolder = folders[folders.length - 1];
    if (window.contextMenuNoteId) {
        moveNoteToFolder(window.contextMenuNoteId, newFolder.id);
    }
    moveNoteModal.classList.remove('show');
    const index = modalStack.indexOf(moveNoteModal);
    if (index > -1) modalStack.splice(index, 1);
    window.contextMenuNoteId = null;
});

if (moveFolderSelectTrigger) moveFolderSelectTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    moveFolderSelectWrapper.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (moveFolderSelectWrapper && !moveFolderSelectWrapper.contains(e.target)) {
        moveFolderSelectWrapper.classList.remove('active');
    }
});

if (addNoteBtn) addNoteBtn.addEventListener('click', () => {
    updateFolderDropdown();
    const newNoteNameInput = document.getElementById('newNoteName');
    if (newNoteNameInput) newNoteNameInput.value = '';
    const options = document.querySelectorAll('#folderSelectOptions .select-option');
    options.forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.folderId === activeFolderId) {
            option.classList.add('selected');
            const selName = document.getElementById('selectedFolderName');
            if (selName) selName.textContent = option.textContent;
        }
    });
    newNoteModal.classList.add('show');
    pushToModalStack(newNoteModal);
    if (newNoteNameInput) setTimeout(() => newNoteNameInput.focus(), 100);
});

document.getElementById('cancelNewNote')?.addEventListener('click', () => {
    newNoteModal.classList.remove('show');
    const index = modalStack.indexOf(newNoteModal);
    if (index > -1) modalStack.splice(index, 1);
});

document.getElementById('createNewNote')?.addEventListener('click', () => {
    const name = document.getElementById('newNoteName').value.trim();
    const folderId = getSelectedFolderId();
    if (!name) { showFormattingIndicator('Please enter a note name!'); return; }
    createNote(name, folderId);
    newNoteModal.classList.remove('show');
    const index = modalStack.indexOf(newNoteModal);
    if (index > -1) modalStack.splice(index, 1);
});

confirmRenameBtn?.addEventListener('click', () => {
    const newName = renameNoteInput.value.trim();
    if (newName && window.contextMenuNoteId) {
        renameNote(window.contextMenuNoteId, newName);
        renameNoteModal.classList.remove('show');
        const index = modalStack.indexOf(renameNoteModal);
        if (index > -1) modalStack.splice(index, 1);
        window.contextMenuNoteId = null;
    }
});

cancelRenameBtn?.addEventListener('click', () => {
    renameNoteModal.classList.remove('show');
    const index = modalStack.indexOf(renameNoteModal);
    if (index > -1) modalStack.splice(index, 1);
    window.contextMenuNoteId = null;
});

deleteBtn?.addEventListener('click', () => {
    if (!activeNoteId) { showFormattingIndicator('No note to delete'); return; }
    const folderNotes = getNotesInFolder(activeFolderId);
    if (folderNotes.length === 0) { showFormattingIndicator('No notes in this folder'); return; }
    if (folderNotes.length === 1 && folderNotes[0].id === activeNoteId) {
        confirmDeleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete Last Note';
    } else {
        confirmDeleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete Note';
    }
    confirmModal.classList.add('show');
    pushToModalStack(confirmModal);
});

cancelDeleteBtn?.addEventListener('click', () => {
    confirmModal.classList.remove('show');
    const index = modalStack.indexOf(confirmModal);
    if (index > -1) modalStack.splice(index, 1);
});

confirmDeleteBtn?.addEventListener('click', () => {
    const noteIdToDelete = window.contextMenuNoteId || activeNoteId;
    if (noteIdToDelete) deleteNote(noteIdToDelete);
    confirmModal.classList.remove('show');
    const index = modalStack.indexOf(confirmModal);
    if (index > -1) modalStack.splice(index, 1);
    window.contextMenuNoteId = null;
});

manageFoldersBtn?.addEventListener('click', () => {
    renderFolderList();
    const newFolderNameInput = document.getElementById('newFolderName');
    if (newFolderNameInput) newFolderNameInput.value = '';
    manageFoldersModal.classList.add('show');
    pushToModalStack(manageFoldersModal);
    if (newFolderNameInput) setTimeout(() => newFolderNameInput.focus(), 100);
});

document.getElementById('createFolderBtn')?.addEventListener('click', () => {
    const name = document.getElementById('newFolderName').value.trim();
    if (!name) { showFormattingIndicator('Please enter a folder name!'); return; }
    createFolder(name);
    document.getElementById('newFolderName').value = '';
});

document.getElementById('closeFoldersModal')?.addEventListener('click', () => {
    manageFoldersModal.classList.remove('show');
    const index = modalStack.indexOf(manageFoldersModal);
    if (index > -1) modalStack.splice(index, 1);
});

cancelFolderDeleteBtn?.addEventListener('click', () => {
    confirmFolderDeleteModal.classList.remove('show');
    const index = modalStack.indexOf(confirmFolderDeleteModal);
    if (index > -1) modalStack.splice(index, 1);
    delete confirmFolderDeleteModal.dataset.pendingFolderId;
});

confirmFolderDeleteBtn?.addEventListener('click', () => {
    const folderId = confirmFolderDeleteModal.dataset.pendingFolderId;
    if (folderId) {
        pushToUndo();
        const defaultFolderId = folders[0].id;
        notes.forEach(note => { if (note.folderId === folderId) note.folderId = defaultFolderId; });
        const index = folders.findIndex(f => f.id === folderId);
        if (index > -1) folders.splice(index, 1);
        if (activeFolderId === folderId) activeFolderId = defaultFolderId;
        saveToStorage();
        renderFolderList();
        renderNoteChips();
        showFormattingIndicator('Folder deleted!');
        loadActiveNote();
    }
    confirmFolderDeleteModal.classList.remove('show');
    const index = modalStack.indexOf(confirmFolderDeleteModal);
    if (index > -1) modalStack.splice(index, 1);
    delete confirmFolderDeleteModal.dataset.pendingFolderId;
});

function updateShareUI(isPublic) {
    const options = document.querySelectorAll('#shareToggle .toggle-option');
    const shareToggle = document.getElementById('shareToggle');
    const shareLinkSection = document.getElementById('shareLinkSection');
    const sharePrivateMsg = document.getElementById('sharePrivateMsg');
    if (!shareToggle) return;
    if (isPublic) {
        shareToggle.classList.add('public');
        shareToggle.classList.remove('private');
        options[1].classList.add('active');
        options[0].classList.remove('active');
        shareLinkSection.classList.add('visible');
        sharePrivateMsg.classList.remove('visible');
        const noteId = activeNoteId || 'default';
        document.getElementById('shareLinkInput').value = `${window.location.origin}/share/${noteId}`;
    } else {
        shareToggle.classList.add('private');
        shareToggle.classList.remove('public');
        options[0].classList.add('active');
        options[1].classList.remove('active');
        sharePrivateMsg.classList.add('visible');
        shareLinkSection.classList.remove('visible');
    }
}
shareBtn?.addEventListener('click', () => {
    if (!activeNoteId) { showFormattingIndicator('No note to share'); return; }
    const note = notes.find(n => n.id === activeNoteId);
    updateShareUI(note && note.isPublic === true);
    shareModal.classList.add('show');
    pushToModalStack(shareModal);
});

document.getElementById('shareToggle')?.addEventListener('click', () => {
    const wasPublic = document.getElementById('shareToggle').classList.contains('public');
    const isNowPublic = !wasPublic;
    updateShareUI(isNowPublic);
    const note = notes.find(n => n.id === activeNoteId);
    if (note) { note.isPublic = isNowPublic; saveToStorage(); }
});

document.getElementById('closeShareModal')?.addEventListener('click', () => {
    shareModal.classList.remove('show');
    const index = modalStack.indexOf(shareModal);
    if (index > -1) modalStack.splice(index, 1);
});

document.getElementById('copyLinkBtn')?.addEventListener('click', () => {
    const input = document.getElementById('shareLinkInput');
    input.select();
    document.execCommand('copy');
    const btn = document.getElementById('copyLinkBtn');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => btn.innerHTML = original, 2000);
});

exportBtn?.addEventListener('click', () => {
    if (!activeNoteId) { showFormattingIndicator('No note to export'); return; }
    const note = notes.find(n => n.id === activeNoteId);
    if (note) exportFileNameInput.value = note.name.replace(/[^\w\s]/gi, '');
    exportCards.forEach(card => card.classList.remove('selected'));
    selectedExportFormat = null;
    exportConfirmBtn.disabled = true;
    exportModal.classList.add('show');
    pushToModalStack(exportModal);
});

closeExportModalBtn?.addEventListener('click', () => {
    exportModal.classList.remove('show');
    const index = modalStack.indexOf(exportModal);
    if (index > -1) modalStack.splice(index, 1);
});

exportCards.forEach(card => {
    card.addEventListener('click', () => {
        exportCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedExportFormat = card.dataset.format;
        exportConfirmBtn.disabled = false;
    });
});

exportConfirmBtn?.addEventListener('click', async () => {
    const fileName = exportFileNameInput.value.trim() || 'note';
    exportModal.classList.remove('show');
    const index = modalStack.indexOf(exportModal);
    if (index > -1) modalStack.splice(index, 1);
    showFormattingIndicator(`Exporting as ${selectedExportFormat.toUpperCase()}...`);
    if (selectedExportFormat === 'pdf') await exportAsPDF(fileName);
    else if (selectedExportFormat === 'markdown') exportAsMarkdown(fileName);
    else if (selectedExportFormat === 'text') exportAsText(fileName);
});

async function exportAsPDF(fileName) {
    const content = writingCanvas.innerHTML;
    localStorage.setItem('vellum_print_content', content);
    localStorage.setItem('vellum_print_title', fileName);
    const printWindow = window.open('/print', '_blank');
    if (printWindow) {
        printWindow.focus();
        showFormattingIndicator('Opening Print Preview...', 'success');
    } else {
        showFormattingIndicator('Please allow popups to print.', 'error');
    }
}

function exportAsMarkdown(fileName) {
    let markdown = writingCanvas.innerHTML
        .replace(/<div[^>]*class="horizontal-line"[^>]*>/gi, '\n---\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
        .replace(/<[^>]+>/g, '').trim();
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.md`;
    a.click();
}

function exportAsText(fileName) {
    const blob = new Blob([writingCanvas.textContent || writingCanvas.innerText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.txt`;
    a.click();
}

function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    html.setAttribute('data-theme', savedTheme);
    if (themeIcon) {
        themeIcon.className = savedTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

themeToggle?.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    if (themeIcon) {
        themeIcon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
    localStorage.setItem(THEME_KEY, newTheme);
});

function toggleMobileSidebar() {
    sidebar.classList.toggle('mobile-active');
    sidebarOverlay.classList.toggle('active');
}

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMobileSidebar();
    });
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', toggleMobileSidebar);
}

sidebar.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (window.innerWidth <= 768) toggleMobileSidebar();
    });
});

function toggleFocus() {
    const isHidden = sidebar.classList.contains('hidden');
    if (!isHidden) {
        sidebar.classList.add('hidden');
        topBar.classList.add('hidden');
        workspace.classList.add('focus-mode');
        restoreBtn.classList.add('visible');
        if (html.requestFullscreen) html.requestFullscreen();
    } else {
        sidebar.classList.remove('hidden');
        topBar.classList.remove('hidden');
        workspace.classList.remove('focus-mode');
        restoreBtn.classList.remove('visible');
        if (document.fullscreenElement) document.exitFullscreen();
    }
}
focusBtn?.addEventListener('click', toggleFocus);
restoreBtn?.addEventListener('click', toggleFocus);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalStack.length > 0) {
        const topModal = modalStack.pop();
        if (topModal) {
            topModal.classList.remove('show');
            if (topModal.id === 'confirmFolderDeleteModal') delete topModal.dataset.pendingFolderId;
            if (topModal.id === 'moveNoteModal') window.contextMenuNoteId = null;
        }
    }
});

function setupEnterKeySubmission(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(buttonId);
    if (input && btn) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); btn.click(); }
        });
    }
}
setupEnterKeySubmission('newNoteName', 'createNewNote');
setupEnterKeySubmission('newFolderName', 'createFolderBtn');
setupEnterKeySubmission('renameNoteInput', 'confirmRenameBtn');
setupEnterKeySubmission('exportFileName', 'exportConfirmBtn');
setupEnterKeySubmission('moveNewFolderName', 'createAndMoveBtn');

searchBtn?.addEventListener('click', () => {
    searchInput.value = '';
    searchResults.innerHTML = '<div class="search-placeholder">Start typing to search...</div>';
    searchModal.classList.add('show');
    pushToModalStack(searchModal);
    setTimeout(() => searchInput.focus(), 100);
});

closeSearchModalBtn?.addEventListener('click', () => {
    searchModal.classList.remove('show');
    const index = modalStack.indexOf(searchModal);
    if (index > -1) modalStack.splice(index, 1);
});

searchInput?.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
        searchResults.innerHTML = '<div class="search-placeholder">Start typing to search...</div>';
        return;
    }
    const results = notes.filter(note => {
        const nameMatch = note.name.toLowerCase().includes(query);
        const contentMatch = note.content.replace(/<[^>]*>/g, '').toLowerCase().includes(query);
        return nameMatch || contentMatch;
    });
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-placeholder">No notes found</div>';
        return;
    }
    searchResults.innerHTML = '';
    results.forEach(note => {
        const folder = folders.find(f => f.id === note.folderId) || { name: 'Unknown' };
        const card = document.createElement('div');
        card.className = 'search-result-card';
        card.innerHTML = `<div class="search-result-name">${escapeHtml(note.name)}</div><div class="search-result-folder"><i class="fas fa-folder"></i> ${escapeHtml(folder.name)}</div>`;
        card.addEventListener('click', () => {
            saveCurrentNote();
            activeFolderId = note.folderId;
            activeNoteId = note.id;
            saveToStorage();
            renderNoteChips();
            renderFolderList();
            loadActiveNote();
            searchModal.classList.remove('show');
            const index = modalStack.indexOf(searchModal);
            if (index > -1) modalStack.splice(index, 1);
        });
        searchResults.appendChild(card);
    });
});

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe.replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}

function cleanNoteContent(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const isDefaultColor = (color) => {
        if (!color) return false;
        const normalized = color.toLowerCase().replace(/\s/g, '');
        return ['rgb(0,0,0)', 'rgb(17,17,17)', 'rgb(255,255,255)', '#000', '#000000', '#111', '#111111', '#fff', '#ffffff', 'black', 'white'].includes(normalized);
    };
    temp.querySelectorAll('[style]').forEach(el => {
        if (isDefaultColor(el.style.color)) el.style.color = '';
        if (el.style.fontFamily?.toLowerCase().includes('fredoka')) el.style.fontFamily = '';
        if (!el.getAttribute('style')) el.removeAttribute('style');
    });
    return temp.innerHTML;
}

let contentChangeTimer;
writingCanvas?.addEventListener('input', () => {
    saveCurrentNote();
    clearTimeout(contentChangeTimer);
    contentChangeTimer = setTimeout(() => { pushToUndo(); }, 1000);
});

noteChips?.addEventListener('contextmenu', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    e.preventDefault();
    window.contextMenuNoteId = chip.dataset.noteId;
    const note = notes.find(n => n.id === window.contextMenuNoteId);
    if (note) {
        ctxPin.innerHTML = note.isPinned ? '<i class="fas fa-thumbtack-slash"></i> Unpin Note' : '<i class="fas fa-thumbtack"></i> Pin Note';
    }
    const x = Math.min(e.pageX, window.innerWidth - 220);
    const y = Math.min(e.pageY, window.innerHeight - 250);
    noteContextMenu.style.left = `${x}px`;
    noteContextMenu.style.top = `${y}px`;
    noteContextMenu.classList.add('show');
});

ctxRename?.addEventListener('click', () => {
    if (!window.contextMenuNoteId) return;
    const note = notes.find(n => n.id === window.contextMenuNoteId);
    if (note) {
        renameNoteInput.value = note.name;
        renameNoteModal.classList.add('show');
        pushToModalStack(renameNoteModal);
        setTimeout(() => renameNoteInput.focus(), 100);
    }
    noteContextMenu.classList.remove('show');
});

ctxPin?.addEventListener('click', () => {
    if (!window.contextMenuNoteId) return;
    const note = notes.find(n => n.id === window.contextMenuNoteId);
    if (note) {
        pushToUndo();
        note.isPinned = !note.isPinned;
        saveToStorage();
        renderNoteChips();
        if (note.id === activeNoteId) updatePinButton();
        showFormattingIndicator(note.isPinned ? 'Note pinned' : 'Note unpinned');
    }
    noteContextMenu.classList.remove('show');
    window.contextMenuNoteId = null;
});

moveToFolderItem?.addEventListener('click', () => {
    if (!window.contextMenuNoteId) return;
    openMoveModal(window.contextMenuNoteId);
    noteContextMenu.classList.remove('show');
});

ctxDelete?.addEventListener('click', () => {
    if (!window.contextMenuNoteId) return;
    if (activeNoteId !== window.contextMenuNoteId) switchNote(window.contextMenuNoteId);
    deleteBtn.click();
    noteContextMenu.classList.remove('show');
});

document.addEventListener('click', (e) => {
    if (noteContextMenu && noteContextMenu.classList.contains('show') && !noteContextMenu.contains(e.target)) {
        noteContextMenu.classList.remove('show');
        window.contextMenuNoteId = null;
    }
});

function updateProfileUI() {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
    if (user.name) {
        document.getElementById('profileName').textContent = user.name;
        document.getElementById('profileEmail').textContent = user.email;
    }
}

userProfileBtn?.addEventListener('click', () => {
    updateProfileUI();
    userProfileModal.classList.add('show');
    pushToModalStack(userProfileModal);
});

closeProfileModalBtn?.addEventListener('click', () => {
    userProfileModal.classList.remove('show');
    const index = modalStack.indexOf(userProfileModal);
    if (index > -1) modalStack.splice(index, 1);
});

logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem(USER_KEY);
    window.location.href = '/login';
});

// ==================== MOBILE NAVIGATION LOGIC ====================

function switchToEditor(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    document.body.classList.add('is-editor-active');
    if (mobileTitle) mobileTitle.textContent = note.name;
    if (mobileFab) mobileFab.style.display = 'none';
}

function switchToDashboard() {
    document.body.classList.remove('is-editor-active');
    const folder = folders.find(f => f.id === activeFolderId);
    if (mobileTitle) mobileTitle.textContent = 'Vellum';
    if (currentFolderName) currentFolderName.textContent = folder ? folder.name : 'My Notes';
    if (mobileFab) mobileFab.style.display = 'flex';
    renderMobileDashboard();
}

function renderMobileDashboard() {
    if (!mobileNotesList) return;
    mobileNotesList.innerHTML = '';
    const folderNotes = getNotesInFolder(activeFolderId);
    const folder = folders.find(f => f.id === activeFolderId);
    if (currentFolderName) currentFolderName.textContent = folder ? folder.name : 'My Notes';
    if (folderNotes.length === 0) {
        mobileNotesList.innerHTML = '<div class="search-placeholder">No notes in this folder.</div>';
        return;
    }
    folderNotes.sort((a, b) => (b.isPinned === true) - (a.isPinned === true));
    folderNotes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        if (note.isPinned) card.classList.add('pinned');
        const previewText = note.content.replace(/<[^>]*>/g, '').substring(0, 100) || 'No additional text';
        const date = new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
        card.innerHTML = `
            <div class="note-card-title">${note.isPinned ? '<i class="fas fa-thumbtack" style="font-size: 14px; margin-right: 8px; color: #f59e0b;"></i>' : ''}${escapeHtml(note.name)}</div>
            <div class="note-card-preview">${escapeHtml(previewText)}</div>
            <div class="note-card-footer"><span>${date}</span><i class="fas fa-chevron-right"></i></div>
        `;
        card.onclick = () => switchNote(note.id);
        mobileNotesList.appendChild(card);
    });
}

if (mobileBackBtn) mobileBackBtn.onclick = () => switchToDashboard();
if (mobileFab) mobileFab.onclick = () => addNoteBtn.click();

const mobileSidebarNewNote = document.getElementById('mobileSidebarNewNote');
if (mobileSidebarNewNote) {
    mobileSidebarNewNote.onclick = () => { toggleMobileSidebar(); addNoteBtn.click(); };
}

const mobileShareBtn = document.getElementById('mobileShareBtn');
const mobileExportBtn = document.getElementById('mobileExportBtn');
const mobileFontBtn = document.getElementById('mobileFontBtn');
const mobileColorBtn = document.getElementById('mobileColorBtn');

if (mobileShareBtn) mobileShareBtn.onclick = () => shareBtn.click();
if (mobileExportBtn) mobileExportBtn.onclick = () => exportBtn.click();
if (mobileFontBtn) mobileFontBtn.onclick = () => {
    const btn = document.getElementById('fontSelectorBtn');
    if (btn) btn.click();
};
if (mobileColorBtn) mobileColorBtn.onclick = () => {
    showFormattingIndicator('Use @color. shortcut or select color');
};

// --- INITIALIZATION ---
function init() {
    if (!localStorage.getItem(USER_KEY)) {
        window.location.href = '/login';
        return;
    }
    loadTheme();
    loadFromStorage();
    renderFolderList();
    renderNoteChips();
    loadActiveNote();
    const current = getCurrentFont();
    if (document.getElementById('currentFont')) {
        document.getElementById('currentFont').textContent = current;
    }
    pushToUndo();
    if (window.innerWidth <= 768) switchToDashboard();
}
init();
