// ========================================
// mindJournal - COMPLETE APPLICATION
// (Bullets removed, context menu modals fixed)
// ========================================

// --- ELEMENT REFERENCES (GLOBAL) ---
const sidebar = document.getElementById('sidebar');
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

const shareModal = document.getElementById('shareModal');

// Button elements
const searchBtn = document.getElementById('searchBtn');
const exportBtn = document.getElementById('exportBtn');
const deleteBtn = document.getElementById('deleteBtn');
const addNoteBtn = document.getElementById('addNoteBtn');
const pinBtn = document.getElementById('pinBtn');
const manageFoldersBtn = document.getElementById('manageFoldersBtn');
const shareBtn = document.getElementById('shareBtn');

// Note chips container
const noteChips = document.getElementById('noteChips');

// Search Modal elements
const searchModal = document.getElementById('searchModal');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const closeSearchModalBtn = document.getElementById('closeSearchModal');

// --- STORAGE KEYS ---
const THEME_KEY = 'focuspad_theme';
const NOTES_KEY = 'focuspad_notes';
const FOLDERS_KEY = 'focuspad_folders';
const ACTIVE_NOTE_KEY = 'focuspad_activeNote';
const ACTIVE_FOLDER_KEY = 'focuspad_activeFolder';
const LAST_NOTE_PER_FOLDER_KEY = 'focuspad_lastNotePerFolder';

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
let undoStack = [];
let undoIndex = -1;
const MAX_UNDO = 50;

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

[confirmModal, newNoteModal, manageFoldersModal, exportModal, confirmFolderDeleteModal, renameNoteModal, shareModal, searchModal, moveNoteModal].forEach(modal => {
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
        note.content = writingCanvas.innerHTML;
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
        } else if (activeNoteId === noteId) {
            activeNoteId = folderNotes[0].id;
            showFormattingIndicator('Note deleted! Switched to next note.');
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
    }
}

function switchNote(noteId) {
    saveCurrentNote();
    activeNoteId = noteId;
    saveToStorage();
    loadActiveNote();
    renderNoteChips();
}

function loadActiveNote() {
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        writingCanvas.innerHTML = note.content || '';
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

// --- PIN BUTTON ---
function updatePinButton() {
    if (!activeNoteId) {
        pinBtn.classList.remove('pinned');
        pinBtn.innerHTML = '<i class="fas fa-thumbtack"></i>';
        return;
    }
    const note = notes.find(n => n.id === activeNoteId);
    if (note && note.isPinned) {
        pinBtn.classList.add('pinned');
        pinBtn.innerHTML = '<i class="fas fa-thumbtack-slash"></i>';
    } else {
        pinBtn.classList.remove('pinned');
        pinBtn.innerHTML = '<i class="fas fa-thumbtack"></i>';
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
pinBtn.addEventListener('click', togglePinNote);

// --- FOLDER OPERATIONS ---
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
}

// --- RENDER FUNCTIONS ---
function renderNoteChips() {
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
        chip.onclick = () => switchNote(note.id);
        noteChips.appendChild(chip);
    });
}

function renderFolderList() {
    const folderList = document.getElementById('folderList');
    if (!folderList) return;
    folderList.innerHTML = '';
    folders.forEach(folder => {
        const item = document.createElement('div');
        item.className = 'folder-item';
        if (folder.id === activeFolderId) item.classList.add('active');
        const nameDiv = document.createElement('div');
        nameDiv.className = 'folder-name';
        nameDiv.textContent = folder.name;
        nameDiv.onclick = () => {
            setActiveFolder(folder.id);
            manageFoldersModal.classList.remove('show');
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
        folderList.appendChild(item);
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
        if (!wrapper.contains(e.target)) wrapper.classList.remove('active');
    });
}

function getSelectedFolderId() {
    const selectedOption = document.querySelector('.select-option.selected');
    return selectedOption ? selectedOption.dataset.folderId : activeFolderId;
}

// ==================== MOVE NOTE MODAL FUNCTIONS ====================
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

function openMoveModal(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const currentFolder = folders.find(f => f.id === note.folderId) || { name: 'Unknown' };
    moveNoteNameSpan.textContent = `Moving: "${note.name}"`;
    document.getElementById('moveCurrentFolder').innerHTML = `Current folder: <strong>${escapeHtml(currentFolder.name)}</strong>`;
    window.contextMenuNoteId = noteId;
    updateMoveFolderDropdown(note.folderId);
    moveSelectedFolderName.textContent = 'Choose folder';
    moveNewFolderInput.value = '';
    confirmMoveBtn.disabled = true;
    moveNoteModal.classList.add('show');
    pushToModalStack(moveNoteModal);
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
        if (remainingNotes.length > 0) {
            activeNoteId = remainingNotes[0].id;
        } else {
            activeNoteId = null;
        }
        saveToStorage();
        renderNoteChips();
        loadActiveNote();
    } else {
        renderNoteChips();
    }
    showFormattingIndicator('Note moved', 'success');
}

cancelMoveBtn.addEventListener('click', () => {
    moveNoteModal.classList.remove('show');
    const index = modalStack.indexOf(moveNoteModal);
    if (index > -1) modalStack.splice(index, 1);
    window.contextMenuNoteId = null;
});

confirmMoveBtn.addEventListener('click', () => {
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

createAndMoveBtn.addEventListener('click', () => {
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

moveFolderSelectTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    moveFolderSelectWrapper.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!moveFolderSelectWrapper.contains(e.target)) {
        moveFolderSelectWrapper.classList.remove('active');
    }
});

// ==================== OTHER MODAL EVENT LISTENERS ====================
addNoteBtn.addEventListener('click', () => {
    updateFolderDropdown();
    document.getElementById('newNoteName').value = '';
    const options = document.querySelectorAll('#folderSelectOptions .select-option');
    options.forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.folderId === activeFolderId) {
            option.classList.add('selected');
            document.getElementById('selectedFolderName').textContent = option.textContent;
        }
    });
    newNoteModal.classList.add('show');
    pushToModalStack(newNoteModal);
    setTimeout(() => document.getElementById('newNoteName').focus(), 100);
});
document.getElementById('cancelNewNote').addEventListener('click', () => {
    newNoteModal.classList.remove('show');
    const index = modalStack.indexOf(newNoteModal);
    if (index > -1) modalStack.splice(index, 1);
});
document.getElementById('createNewNote').addEventListener('click', () => {
    const name = document.getElementById('newNoteName').value.trim();
    const folderId = getSelectedFolderId();
    if (!name) {
        showFormattingIndicator('Please enter a note name!');
        return;
    }
    createNote(name, folderId);
    newNoteModal.classList.remove('show');
    const index = modalStack.indexOf(newNoteModal);
    if (index > -1) modalStack.splice(index, 1);
});

confirmRenameBtn.addEventListener('click', () => {
    const newName = renameNoteInput.value.trim();
    if (newName && window.contextMenuNoteId) {
        renameNote(window.contextMenuNoteId, newName);
        renameNoteModal.classList.remove('show');
        const index = modalStack.indexOf(renameNoteModal);
        if (index > -1) modalStack.splice(index, 1);
        window.contextMenuNoteId = null;
    }
});
cancelRenameBtn.addEventListener('click', () => {
    renameNoteModal.classList.remove('show');
    const index = modalStack.indexOf(renameNoteModal);
    if (index > -1) modalStack.splice(index, 1);
    window.contextMenuNoteId = null;
});

deleteBtn.addEventListener('click', () => {
    if (!activeNoteId) { showFormattingIndicator('No note to delete'); return; }
    const folderNotes = getNotesInFolder(activeFolderId);
    if (folderNotes.length === 0) { showFormattingIndicator('No notes in this folder'); return; }
    if (folderNotes.length === 1 && folderNotes[0].id === activeNoteId) confirmDeleteBtn.textContent = 'Delete Last Note';
    else confirmDeleteBtn.textContent = 'Delete';
    confirmModal.classList.add('show');
    pushToModalStack(confirmModal);
});
cancelDeleteBtn.addEventListener('click', () => {
    confirmModal.classList.remove('show');
    const index = modalStack.indexOf(confirmModal);
    if (index > -1) modalStack.splice(index, 1);
});
confirmDeleteBtn.addEventListener('click', () => {
    const noteIdToDelete = window.contextMenuNoteId || activeNoteId;
    if (noteIdToDelete) {
        deleteNote(noteIdToDelete);
    }
    confirmModal.classList.remove('show');
    const index = modalStack.indexOf(confirmModal);
    if (index > -1) modalStack.splice(index, 1);
    window.contextMenuNoteId = null;
});

manageFoldersBtn.addEventListener('click', () => {
    renderFolderList();
    document.getElementById('newFolderName').value = '';
    manageFoldersModal.classList.add('show');
    pushToModalStack(manageFoldersModal);
    setTimeout(() => document.getElementById('newFolderName').focus(), 100);
});
document.getElementById('createFolderBtn').addEventListener('click', () => {
    const name = document.getElementById('newFolderName').value.trim();
    if (!name) { showFormattingIndicator('Please enter a folder name!'); return; }
    createFolder(name);
    document.getElementById('newFolderName').value = '';
});
document.getElementById('closeFoldersModal').addEventListener('click', () => {
    manageFoldersModal.classList.remove('show');
    const index = modalStack.indexOf(manageFoldersModal);
    if (index > -1) modalStack.splice(index, 1);
});

cancelFolderDeleteBtn.addEventListener('click', () => {
    confirmFolderDeleteModal.classList.remove('show');
    const index = modalStack.indexOf(confirmFolderDeleteModal);
    if (index > -1) modalStack.splice(index, 1);
    delete confirmFolderDeleteModal.dataset.pendingFolderId;
});
confirmFolderDeleteBtn.addEventListener('click', () => {
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

// Share Modal
function updateShareUI(isPublic) {
    const options = document.querySelectorAll('#shareToggle .toggle-option');
    const shareToggle = document.getElementById('shareToggle');
    const shareLinkSection = document.getElementById('shareLinkSection');
    const sharePrivateMsg = document.getElementById('sharePrivateMsg');
    if (isPublic) {
        shareToggle.classList.add('public');
        shareToggle.classList.remove('private');
        options[1].classList.add('active');
        options[0].classList.remove('active');
        shareLinkSection.classList.add('visible');
        sharePrivateMsg.classList.remove('visible');
        const noteId = activeNoteId || 'default';
        document.getElementById('shareLinkInput').value = `https://apandey-mindjournal.vercel.app/share.html?id=${noteId}`;
    } else {
        shareToggle.classList.add('private');
        shareToggle.classList.remove('public');
        options[0].classList.add('active');
        options[1].classList.remove('active');
        sharePrivateMsg.classList.add('visible');
        shareLinkSection.classList.remove('visible');
    }
}
shareBtn.addEventListener('click', () => {
    if (!activeNoteId) { showFormattingIndicator('No note to share'); return; }
    const note = notes.find(n => n.id === activeNoteId);
    const isPublic = note && note.isPublic === true;
    updateShareUI(isPublic);
    shareModal.classList.add('show');
    pushToModalStack(shareModal);
});
document.getElementById('shareToggle').addEventListener('click', () => {
    const wasPublic = document.getElementById('shareToggle').classList.contains('public');
    const isNowPublic = !wasPublic;
    updateShareUI(isNowPublic);
    const note = notes.find(n => n.id === activeNoteId);
    if (note) { note.isPublic = isNowPublic; saveToStorage(); }
});
document.getElementById('closeShareModal').addEventListener('click', () => {
    shareModal.classList.remove('show');
    const index = modalStack.indexOf(shareModal);
    if (index > -1) modalStack.splice(index, 1);
});
document.getElementById('copyLinkBtn').addEventListener('click', () => {
    document.getElementById('shareLinkInput').select();
    document.execCommand('copy');
    const btn = document.getElementById('copyLinkBtn');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => btn.innerHTML = original, 2000);
});

// Export Modal
exportBtn.addEventListener('click', () => {
    if (!activeNoteId) { showFormattingIndicator('No note to export'); return; }
    const note = notes.find(n => n.id === activeNoteId);
    if (note) exportFileNameInput.value = note.name.replace(/[^\w\s]/gi, '');
    exportCards.forEach(card => card.classList.remove('selected'));
    selectedExportFormat = null;
    exportConfirmBtn.disabled = true;
    exportModal.classList.add('show');
    pushToModalStack(exportModal);
});
closeExportModalBtn.addEventListener('click', () => {
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
exportConfirmBtn.addEventListener('click', async () => {
    const fileName = exportFileNameInput.value.trim() || 'note';
    exportModal.classList.remove('show');
    const index = modalStack.indexOf(exportModal);
    if (index > -1) modalStack.splice(index, 1);
    showFormattingIndicator(`Exporting as ${selectedExportFormat.toUpperCase()}...`);
    if (selectedExportFormat === 'pdf') await exportAsPDF(fileName);
    else if (selectedExportFormat === 'markdown') exportAsMarkdown(fileName);
    else if (selectedExportFormat === 'text') exportAsText(fileName);
});

// PDF export
async function exportAsPDF(fileName) {
    try {
        const fontName = document.getElementById('currentFont').textContent || 'Fredoka';
        const note = notes.find(n => n.id === activeNoteId);
        const content = writingCanvas.innerHTML;
        const selectedTheme = html.getAttribute('data-theme') || 'light';
        const tempContainer = document.createElement('div');
        tempContainer.id = 'pdf-export-container';
        tempContainer.setAttribute('data-theme', selectedTheme);
        tempContainer.setAttribute('data-font', fontName);
        Object.assign(tempContainer.style, {
            position: 'absolute',
            left: '-9999px',
            top: '0',
            width: '794px',
            lineHeight: '1.6',
            fontSize: '16px',
            wordBreak: 'break-word',
            boxSizing: 'border-box',
            padding: '60px 80px',
            backgroundColor: selectedTheme === 'dark' ? '#1a1a1a' : '#ffffff',
            color: selectedTheme === 'dark' ? '#ffffff' : '#000000'
        });
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = content;
        const divs = contentDiv.querySelectorAll('div');
        divs.forEach(div => {
            const text = div.textContent || '';
            const style = div.getAttribute('style') || '';
            if (style.includes('margin-left') || text.match(/^[•\d]/)) {
                div.classList.add('pdf-list-item');
                if (text.match(/^\d/)) div.classList.add('numbered');
                else if (text.includes('•')) div.classList.add('bullet');
                div.style.marginLeft = '40px';
                div.style.padding = '2px 0';
                div.style.position = 'relative';
                div.style.display = 'block';
            }
        });
        tempContainer.appendChild(contentDiv);
        document.body.appendChild(tempContainer);

        const canvas = await html2canvas(tempContainer, {
            scale: 2,
            useCORS: true,
            backgroundColor: selectedTheme === 'dark' ? '#1a1a1a' : '#ffffff',
            allowTaint: true,
            letterRendering: true,
            logging: false
        });
        document.body.removeChild(tempContainer);

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        const pageHeightPx = (pdfHeight / pdfWidth) * canvasWidth;
        let totalPages = Math.ceil(canvasHeight / pageHeightPx);

        for (let i = 0; i < totalPages; i++) {
            if (i > 0) pdf.addPage();
            const yOffset = i * pageHeightPx;
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvasWidth;
            pageCanvas.height = Math.min(pageHeightPx, canvasHeight - yOffset);
            const ctx = pageCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, yOffset, canvasWidth, pageCanvas.height, 0, 0, canvasWidth, pageCanvas.height);
            const imgData = pageCanvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, (pageCanvas.height / canvasWidth) * pdfWidth, undefined, 'FAST');
        }

        pdf.save(`${fileName}.pdf`);
        showFormattingIndicator('PDF exported successfully!', 'success');
    } catch (error) {
        console.error(error);
        showFormattingIndicator('Error exporting PDF: ' + error.message, 'error');
    }
}

function exportAsMarkdown(fileName) {
    let content = writingCanvas.innerHTML;
    let markdown = content
        .replace(/<div[^>]*class="horizontal-line"[^>]*>/gi, '\n---\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
        .replace(/<[^>]+>/g, '')
        .trim();
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.md`;
    a.click();
}

function exportAsText(fileName) {
    let content = writingCanvas.textContent || writingCanvas.innerText;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.txt`;
    a.click();
}

// --- THEME ---
function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    html.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'light') {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    } else {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }
}
themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    if (newTheme === 'light') {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    } else {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }
    localStorage.setItem(THEME_KEY, newTheme);
});

// --- FOCUS MODE ---
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
focusBtn.addEventListener('click', toggleFocus);
restoreBtn.addEventListener('click', toggleFocus);
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && sidebar.classList.contains('hidden')) {
        toggleFocus();
    }
});

// --- GLOBAL SHORTCUTS: ESC & ENTER ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalStack.length > 0) {
        const topModal = modalStack.pop();
        if (topModal) {
            topModal.classList.remove('show');
            if (topModal.id === 'confirmFolderDeleteModal') {
                delete topModal.dataset.pendingFolderId;
            }
            if (topModal.id === 'moveNoteModal') {
                window.contextMenuNoteId = null;
            }
        }
    }
});
function setupEnterKeySubmission(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(buttonId);
    if (input && btn) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                btn.click();
            }
        });
    }
}
setupEnterKeySubmission('newNoteName', 'createNewNote');
setupEnterKeySubmission('newFolderName', 'createFolderBtn');
setupEnterKeySubmission('renameNoteInput', 'confirmRenameBtn');
setupEnterKeySubmission('exportFileName', 'exportConfirmBtn');
setupEnterKeySubmission('moveNewFolderName', 'createAndMoveBtn');

// --- SEARCH MODAL ---
searchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchResults.innerHTML = '<div class="search-placeholder">Start typing to search...</div>';
    searchModal.classList.add('show');
    pushToModalStack(searchModal);
    setTimeout(() => searchInput.focus(), 100);
});
closeSearchModalBtn.addEventListener('click', () => {
    searchModal.classList.remove('show');
    const index = modalStack.indexOf(searchModal);
    if (index > -1) modalStack.splice(index, 1);
});
searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
        searchResults.innerHTML = '<div class="search-placeholder">Start typing to search...</div>';
        return;
    }
    const results = notes.filter(note => {
        const nameMatch = note.name.toLowerCase().includes(query);
        const contentText = note.content.replace(/<[^>]*>/g, '').toLowerCase();
        const contentMatch = contentText.includes(query);
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
        card.innerHTML = `
            <div class="search-result-name">${escapeHtml(note.name)}</div>
            <div class="search-result-folder">
                <i class="fas fa-folder"></i> ${escapeHtml(folder.name)}
            </div>
        `;
        card.addEventListener('click', () => {
            saveCurrentNote();
            if (activeNoteId) {
                lastNotePerFolder[activeFolderId] = activeNoteId;
            }
            activeFolderId = note.folderId;
            activeNoteId = note.id;
            lastNotePerFolder[activeFolderId] = note.id;
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
    return unsafe.replace(/[&<>"]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

// Debounced content change for undo
let contentChangeTimer;
writingCanvas.addEventListener('input', () => {
    saveCurrentNote();
    clearTimeout(contentChangeTimer);
    contentChangeTimer = setTimeout(() => {
        pushToUndo();
    }, 1000);
});

// ==================== EDITOR & FORMATTING ====================
const formattingConfig = {
    fonts: {
        'Fredoka': "'Fredoka', sans-serif",
        'Kalam': "'Kalam', cursive",
        'Playpen Sans': "'Playpen Sans', cursive",
        'Patrick Hand': "'Patrick Hand', cursive",
        'Baloo 2': "'Baloo 2', cursive",
        'Comic Neue': "'Comic Neue', cursive",
        'Comic Sans MS': "'Comic Sans MS', cursive, sans-serif"
    }
};

let savedCursorRange = null;
let activeDropdown = null;

// --- CURSOR LOGIC ---
function saveCursorRange() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        savedCursorRange = selection.getRangeAt(0).cloneRange();
        return savedCursorRange;
    }
    return null;
}
function restoreCursorRange() {
    if (savedCursorRange) {
        try {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedCursorRange);
            writingCanvas.focus();
            return true;
        } catch (e) {
            console.error('Cursor restore failed:', e);
            return false;
        }
    }
    return false;
}
function clearSavedCursorRange() { savedCursorRange = null; }

// --- LINE FORMATTING (using execCommand for undo) ---
function getCurrentLine() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return null;
    let node = selection.anchorNode;
    if (!node) return null;
    if (node.nodeType === 3) return node;
    if (node.nodeType === 1) {
        const range = selection.getRangeAt(0);
        let targetNode = range.startContainer;
        if (targetNode.nodeType === 3) return targetNode;
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
        return walker.nextNode() || node;
    }
    return node;
}
function processLineFormatting(lineNode) {
    if (!lineNode) return false;
    let text = lineNode.textContent || '';
    let processed = false;
    let htmlToInsert = '';
    const trimmedText = text.trim();
    if (trimmedText === '===') {
        htmlToInsert = '<div class="horizontal-line thick"></div>';
        processed = true;
    } else if (trimmedText === '---') {
        htmlToInsert = '<div class="horizontal-line dashed"></div>';
        processed = true;
    }
    if (processed) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.deleteContents();
        document.execCommand('insertHTML', false, htmlToInsert);
        const newRange = document.createRange();
        const container = writingCanvas;
        newRange.setStartAfter(container.lastChild || container);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        saveCurrentNote();
        return true;
    }
    return false;
}

// --- FONT SELECTOR LOGIC ---
const fontSelectorBtn = document.getElementById('fontSelectorBtn');
const fontDropdown = document.getElementById('fontDropdown');
const fontOptions = document.querySelectorAll('.font-option');
const currentFontSpan = document.getElementById('currentFont');

fontSelectorBtn.addEventListener('mousedown', saveCursorRange);
fontSelectorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fontSelectorBtn.classList.toggle('active');
    fontDropdown.classList.toggle('active');
});
document.addEventListener('click', (e) => {
    if (!fontSelectorBtn.contains(e.target) && !fontDropdown.contains(e.target)) {
        fontSelectorBtn.classList.remove('active');
        fontDropdown.classList.remove('active');
        clearSavedCursorRange();
    }
});
fontOptions.forEach(option => {
    option.addEventListener('click', () => {
        const selectedFont = option.dataset.font;
        fontOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        currentFontSpan.textContent = selectedFont;
        applyFontAtCursor(selectedFont);
        fontSelectorBtn.classList.remove('active');
        fontDropdown.classList.remove('active');
        clearSavedCursorRange();
    });
});

function getCurrentFont() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return 'Fredoka';
    let node = selection.getRangeAt(0).startContainer;
    if (node.nodeType === 3) node = node.parentElement;
    while (node && node !== writingCanvas) {
        const computed = window.getComputedStyle(node).fontFamily;
        for (const [name, fam] of Object.entries(formattingConfig.fonts)) {
            if (computed.includes(name.replace(/\s+/g, ''))) return name;
        }
        node = node.parentElement;
    }
    return 'Fredoka';
}
function updateFontDisplay() {
    const current = getCurrentFont();
    currentFontSpan.textContent = current;
    fontOptions.forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.font === current) opt.classList.add('active');
    });
}
function applyFontAtCursor(fontName) {
    if (savedCursorRange) restoreCursorRange();
    else writingCanvas.focus();
    document.execCommand('fontName', false, fontName);
    saveCurrentNote();
}

// --- PASTE SANITIZATION ---
writingCanvas.addEventListener('paste', (e) => {
    e.preventDefault();
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    let text = clipboardData.getData('text/plain');
    if (text) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        range.deleteContents();

        const lines = text.split(/\r\n|\r|\n/);
        let html = '';
        for (let i = 0; i < lines.length; i++) {
            html += escapeHtml(lines[i]);
            if (i < lines.length - 1) html += '<br>';
        }
        document.execCommand('insertHTML', false, html);
        saveCurrentNote();
        return;
    }

    let html = clipboardData.getData('text/html');
    if (html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null, false);
        while (walker.nextNode()) {
            const el = walker.currentNode;
            const attrs = el.attributes;
            for (let i = attrs.length - 1; i >= 0; i--) {
                const attrName = attrs[i].name;
                if (!['href', 'src', 'alt'].includes(attrName)) {
                    el.removeAttribute(attrName);
                }
            }
            if (['SCRIPT', 'STYLE', 'META', 'LINK', 'OBJECT', 'IFRAME'].includes(el.tagName)) {
                el.remove();
            }
        }
        document.execCommand('insertHTML', false, doc.body.innerHTML);
        saveCurrentNote();
    }
});

// --- EVENTS ---
let processing = false;
writingCanvas.addEventListener('keyup', (e) => {
    if (processing) return;
    if (e.key === ' ' || e.key === 'Enter') {
        processing = true;
        const lineNode = getCurrentLine();
        const processed = processLineFormatting(lineNode);
        if (processed) showFormattingIndicator('Line inserted');
        processing = false;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) updateFontDisplay();
});
writingCanvas.addEventListener('click', () => {
    updateFontDisplay();
});

// ==================== ENHANCED CONTEXT MENU ====================
const noteContextMenu = document.getElementById('noteContextMenu');
const ctxRename = document.getElementById('ctxRename');
const ctxPin = document.getElementById('ctxPin');
const ctxDelete = document.getElementById('ctxDelete');
const moveToFolderItem = document.getElementById('moveToFolderItem');

window.contextMenuNoteId = null;

function hideContextMenu() {
    noteContextMenu.classList.remove('show');
    window.contextMenuNoteId = null;
}

// Open context menu on right‑click
noteChips.addEventListener('contextmenu', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    e.preventDefault();
    window.contextMenuNoteId = chip.dataset.noteId;
    const note = notes.find(n => n.id === window.contextMenuNoteId);
    if (note) {
        ctxPin.innerHTML = note.isPinned ? '<i class="fas fa-thumbtack-slash"></i> Unpin Note' : '<i class="fas fa-thumbtack"></i> Pin Note';
    }
    hideContextMenu();
    const x = Math.min(e.pageX, window.innerWidth - 220);
    const y = Math.min(e.pageY, window.innerHeight - 250);
    noteContextMenu.style.left = `${x}px`;
    noteContextMenu.style.top = `${y}px`;
    noteContextMenu.classList.add('show');
});

// Rename
ctxRename.addEventListener('click', () => {
    if (!window.contextMenuNoteId) return;
    const note = notes.find(n => n.id === window.contextMenuNoteId);
    if (note) {
        renameNoteInput.value = note.name;
        renameNoteModal.classList.add('show');
        pushToModalStack(renameNoteModal);
        setTimeout(() => renameNoteInput.focus(), 100);
    }
    hideContextMenu();
});

// Pin
ctxPin.addEventListener('click', () => {
    if (!window.contextMenuNoteId) return;
    const note = notes.find(n => n.id === window.contextMenuNoteId);
    if (note) {
        pushToUndo();
        note.isPinned = !note.isPinned;
        saveToStorage();
        renderNoteChips();
        if (note.id === activeNoteId) {
            updatePinButton();
        }
        showFormattingIndicator(note.isPinned ? 'Note pinned' : 'Note unpinned');
    }
    hideContextMenu();
});

// Delete
ctxDelete.addEventListener('click', () => {
    if (!window.contextMenuNoteId) return;
    if (activeNoteId !== window.contextMenuNoteId) {
        switchNote(window.contextMenuNoteId);
    }
    document.getElementById('deleteBtn').click();
    hideContextMenu();
});

// Move to
moveToFolderItem.addEventListener('click', () => {
    if (!window.contextMenuNoteId) return;
    openMoveModal(window.contextMenuNoteId);
    hideContextMenu();
});

// Close context menu when clicking elsewhere
document.addEventListener('click', (e) => {
    if (noteContextMenu.classList.contains('show') && !noteContextMenu.contains(e.target)) {
        hideContextMenu();
    }
});

// ==================== INITIALIZATION ====================
function init() {
    loadTheme();
    loadFromStorage();
    renderFolderList();
    renderNoteChips();
    loadActiveNote();
    const current = getCurrentFont();  // now defined in this file
    document.getElementById('currentFont').textContent = current;

    pushToUndo();
}
init();