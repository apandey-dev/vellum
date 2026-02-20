// ========================================
// Vellum - CORE LOGIC
// ========================================

import { supabase, restoreSession } from '/js/supabase-client.js';
import { showToast, escapeHtml } from '/js/utils.js';

// --- ELEMENT REFERENCES (GLOBAL) ---
const sidebar = document.getElementById('sidebar');
const topBar = document.getElementById('topBar');
const workspace = document.querySelector('.workspace');
const focusBtn = document.getElementById('focusBtn');
const restoreBtn = document.getElementById('restoreBtn');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const html = document.documentElement;
export const writingCanvas = document.getElementById('writingCanvas');

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

// --- CONSTANTS ---
const THEME_KEY = 'vellum_theme';

// --- DATA STRUCTURES ---
let notes = [];
let folders = [];
let activeNoteId = null;
let activeFolderId = null; // null means 'All' or no folder filter

// Export state
let selectedExportFormat = null;

// ESC Key Hierarchy Management
let modalStack = [];

// ==================== UNDO / REDO ====================
let undoStack = [];               // array of snapshots
let undoIndex = -1;               // current position in stack (-1 means no state yet)
const MAX_UNDO = 50;

/**
 * Capture a deep copy of the entire state and push it onto the undo stack.
 */
export function pushToUndo() {
    if (undoIndex < undoStack.length - 1) {
        undoStack = undoStack.slice(0, undoIndex + 1);
    }
    const snapshot = {
        notes: JSON.parse(JSON.stringify(notes)),
        folders: JSON.parse(JSON.stringify(folders)),
        activeNoteId: activeNoteId,
        activeFolderId: activeFolderId
    };
    undoStack.push(snapshot);
    if (undoStack.length > MAX_UNDO) {
        undoStack.shift();
    } else {
        undoIndex++;
    }
}
window.pushToUndo = pushToUndo;

function restoreState(index) {
    if (index < 0 || index >= undoStack.length) return;
    const state = undoStack[index];
    notes = JSON.parse(JSON.stringify(state.notes));
    folders = JSON.parse(JSON.stringify(state.folders));
    activeNoteId = state.activeNoteId;
    activeFolderId = state.activeFolderId;

    renderNoteChips();
    renderFolderList();
    loadActiveNote();
    undoIndex = index;
}

function undo() {
    if (undoIndex > 0) {
        restoreState(undoIndex - 1);
        showToast('Undo', 'success');
    } else {
        showToast('Nothing to undo', 'warning');
    }
}

function redo() {
    if (undoIndex < undoStack.length - 1) {
        restoreState(undoIndex + 1);
        showToast('Redo', 'success');
    } else {
        showToast('Nothing to redo', 'warning');
    }
}

// Keyboard shortcuts for undo/redo
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

// ==================== SUPABASE DATA OPERATIONS ====================

async function fetchInitialData() {
    try {
        const { data: folderData, error: folderError } = await supabase
            .from('folders')
            .select('*')
            .order('created_at', { ascending: true });

        if (folderError) throw folderError;
        folders = folderData;

        const { data: noteData, error: noteError } = await supabase
            .from('notes')
            .select('*')
            .order('updated_at', { ascending: false });

        if (noteError) throw noteError;
        notes = noteData;

        // Reset state
        activeNoteId = null;
        activeFolderId = null;

        if (notes.length > 0) {
            activeNoteId = notes[0].id;
            activeFolderId = notes[0].folder_id;
        }

        renderFolderList();
        renderNoteChips();
        loadActiveNote();
        updateFolderDropdown();
        pushToUndo();

    } catch (error) {
        showToast('Error loading data', 'error');
        console.error("Supabase load error:", error.message);
    }
}

export async function saveCurrentNote() {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;

    const content = writingCanvas.innerHTML;

    if (note.content !== content) {
        note.content = content;
        note.updated_at = new Date().toISOString();

        const { error } = await supabase
            .from('notes')
            .update({ content: note.content, updated_at: note.updated_at })
            .eq('id', activeNoteId);

        if (error) console.error('Error saving note:', error.message);
    }
}
window.saveCurrentNote = saveCurrentNote;

async function createNote(title, folderId = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newNote = {
        user_id: user.id,
        folder_id: folderId,
        title: title || 'Untitled',
        content: '',
        is_public: false
    };

    const { data, error } = await supabase
        .from('notes')
        .insert([newNote])
        .select();

    if (error) {
        showToast('Error creating note', 'error');
        console.error(error.message);
        return;
    }

    notes.unshift(data[0]);
    activeNoteId = data[0].id;
    activeFolderId = folderId;

    renderNoteChips();
    renderFolderList();
    loadActiveNote();
    showToast('Note created!', 'success');
    pushToUndo();
}

async function deleteNote(noteId) {
    const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

    if (error) {
        showToast('Error deleting note', 'error');
        return;
    }

    notes = notes.filter(n => n.id !== noteId);

    if (activeNoteId === noteId) {
        const folderNotes = getNotesInFolder(activeFolderId);
        activeNoteId = folderNotes.length > 0 ? folderNotes[0].id : (notes.length > 0 ? notes[0].id : null);
    }

    renderNoteChips();
    loadActiveNote();
    showToast('Note deleted!', 'success');
    pushToUndo();
}

async function renameNote(noteId, newTitle) {
    const { error } = await supabase
        .from('notes')
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq('id', noteId);

    if (error) {
        showToast('Error renaming note', 'error');
        return;
    }

    const note = notes.find(n => n.id === noteId);
    if (note) note.title = newTitle;

    renderNoteChips();
    showToast('Note renamed', 'success');
    pushToUndo();
}

async function createFolder(name) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('folders')
        .insert([{ name, user_id: user.id }])
        .select();

    if (error) {
        showToast('Error creating folder', 'error');
        console.error(error.message);
        return;
    }

    folders.push(data[0]);
    renderFolderList();
    updateFolderDropdown();
    showToast('Folder created!', 'success');
    pushToUndo();
}

async function deleteFolder(folderId) {
    const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

    if (error) {
        showToast('Error deleting folder', 'error');
        return;
    }

    folders = folders.filter(f => f.id !== folderId);
    // Notes associated with this folder are handled by SET NULL in DB
    notes.forEach(n => {
        if (n.folder_id === folderId) n.folder_id = null;
    });

    if (activeFolderId === folderId) {
        activeFolderId = null;
    }

    renderFolderList();
    renderNoteChips();
    updateFolderDropdown();
    showToast('Folder deleted!', 'success');
    pushToUndo();
}

async function moveNoteToFolder(noteId, targetFolderId) {
    const { error } = await supabase
        .from('notes')
        .update({ folder_id: targetFolderId, updated_at: new Date().toISOString() })
        .eq('id', noteId);

    if (error) {
        showToast('Error moving note', 'error');
        return;
    }

    const note = notes.find(n => n.id === noteId);
    if (note) note.folder_id = targetFolderId;

    if (activeNoteId === noteId) {
        // If we were looking at a specific folder and the note moved out of it
        if (activeFolderId !== null && activeFolderId !== targetFolderId) {
            const remainingNotes = getNotesInFolder(activeFolderId);
            activeNoteId = remainingNotes.length > 0 ? remainingNotes[0].id : null;
        }
    }

    renderNoteChips();
    loadActiveNote();
    showToast('Note moved', 'success');
    pushToUndo();
}

async function togglePinNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const newPinnedStatus = !note.is_pinned;
    note.is_pinned = newPinnedStatus;
    updatePinButton();
    renderNoteChips();

    const { error } = await supabase
        .from('notes')
        .update({ is_pinned: newPinnedStatus })
        .eq('id', noteId);

    if (error) {
        note.is_pinned = !newPinnedStatus; // revert
        updatePinButton();
        renderNoteChips();
        showToast('Error pinning note', 'error');
    } else {
        showToast(newPinnedStatus ? 'Note pinned' : 'Note unpinned', 'success');
    }
}

// ==================== UI RENDERING ====================

function getNotesInFolder(folderId) {
    if (folderId === null) return notes; // null means 'All'
    return notes.filter(n => n.folder_id === folderId);
}

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

    folderNotes.sort((a, b) => (b.is_pinned === true) - (a.is_pinned === true));

    folderNotes.forEach(note => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        if (note.id === activeNoteId) chip.classList.add('active');
        if (note.is_pinned) chip.classList.add('pinned');
        chip.dataset.noteId = note.id;

        const chipContent = document.createElement('div');
        chipContent.className = 'chip-content';
        if (note.is_pinned) {
            const pinIcon = document.createElement('i');
            pinIcon.className = 'fas fa-thumbtack gap';
            chipContent.appendChild(pinIcon);
        }
        const textSpan = document.createElement('span');
        textSpan.textContent = note.title;
        chipContent.appendChild(textSpan);
        chip.appendChild(chipContent);

        const menuBtn = document.createElement('div');
        menuBtn.className = 'chip-menu-btn';
        menuBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            window.contextMenuNoteId = note.id;

            const noteObj = notes.find(n => n.id === note.id);
            if (noteObj) {
                ctxPin.innerHTML = noteObj.is_pinned ? '<i class="fas fa-thumbtack-slash"></i> Unpin Note' : '<i class="fas fa-thumbtack"></i> Pin Note';
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
    if (!folderList) return;
    folderList.innerHTML = '';

    // Add "All Notes" option
    const allItem = document.createElement('div');
    allItem.className = 'folder-item';
    if (activeFolderId === null) allItem.classList.add('active');
    allItem.innerHTML = `<div class="folder-name">All Notes</div>`;
    allItem.onclick = () => {
        setActiveFolder(null);
        manageFoldersModal.classList.remove('show');
    };
    folderList.appendChild(allItem);

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
        const delBtn = document.createElement('button');
        delBtn.className = 'folder-action-btn';
        delBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            deleteFolder(folder.id);
        };
        actions.appendChild(delBtn);
        item.appendChild(nameDiv);
        item.appendChild(actions);
        folderList.appendChild(item);
    });
}

function loadActiveNote() {
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        writingCanvas.innerHTML = note.content || '';
        writingCanvas.contentEditable = 'true';
        writingCanvas.classList.remove('empty-folder-message');
        updatePinButton();
        deleteBtn.classList.remove('disabled');
        shareBtn.classList.remove('disabled');
        exportBtn.classList.remove('disabled');
    } else {
        // Empty State Screen
        writingCanvas.innerHTML = `
            <div class="empty-folder-message">
                <div class="empty-folder-icon"><i class="fas fa-note-sticky"></i></div>
                <h3>📄 No notes yet</h3>
                <p>Create your first note to get started.</p>
                <button class="create-note-btn abc" id="createNoteFromEmpty">+ Create New Note</button>
            </div>
        `;
        writingCanvas.contentEditable = 'false';
        writingCanvas.classList.add('empty-folder-message');
        deleteBtn.classList.add('disabled');
        shareBtn.classList.add('disabled');
        exportBtn.classList.add('disabled');
        updatePinButton();
        setTimeout(() => {
            const createBtn = document.getElementById('createNoteFromEmpty');
            if (createBtn) {
                createBtn.onclick = () => {
                    createNote('Untitled', activeFolderId);
                };
            }
        }, 100);
    }
}

function switchNote(noteId) {
    saveCurrentNote();
    activeNoteId = noteId;
    loadActiveNote();
    renderNoteChips();
}

function setActiveFolder(folderId) {
    saveCurrentNote();
    activeFolderId = folderId;
    const folderNotes = getNotesInFolder(folderId);
    activeNoteId = folderNotes.length > 0 ? folderNotes[0].id : null;
    renderNoteChips();
    renderFolderList();
    loadActiveNote();
}

// ==================== MODAL HELPERS ====================

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
            if (modalElement.id === 'confirmFolderDeleteModal') delete modalElement.dataset.pendingFolderId;
            if (modalElement.id === 'moveNoteModal') window.contextMenuNoteId = null;
        }
    });
}
[confirmModal, newNoteModal, manageFoldersModal, exportModal, confirmFolderDeleteModal, renameNoteModal, shareModal, searchModal, moveNoteModal, userProfileModal].forEach(modal => {
    setupModalClose(modal);
});

// ==================== PIN LOGIC ====================

function updatePinButton() {
    pinBtn.innerHTML = '<i class="fas fa-thumbtack"></i>';
    if (!activeNoteId) {
        pinBtn.classList.remove('pinned');
        return;
    }
    const note = notes.find(n => n.id === activeNoteId);
    if (note && note.is_pinned) {
        pinBtn.classList.add('pinned');
    } else {
        pinBtn.classList.remove('pinned');
    }
}

pinBtn.onclick = () => {
    if (activeNoteId) togglePinNote(activeNoteId);
};

// ==================== FOLDER DROPDOWN ====================

function updateFolderDropdown() {
    const optionsContainer = document.getElementById('folderSelectOptions');
    const selectedNameSpan = document.getElementById('selectedFolderName');
    const wrapper = document.getElementById('folderSelectWrapper');
    if (!optionsContainer) return;

    optionsContainer.innerHTML = '';

    // Add "Uncategorized" or "None"
    const noneOpt = document.createElement('div');
    noneOpt.className = 'select-option';
    noneOpt.textContent = 'No Folder';
    noneOpt.dataset.folderId = '';
    if (activeFolderId === null) {
        noneOpt.classList.add('selected');
        selectedNameSpan.textContent = 'No Folder';
    }
    noneOpt.onclick = () => {
        optionsContainer.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('selected'));
        noneOpt.classList.add('selected');
        selectedNameSpan.textContent = 'No Folder';
        wrapper.classList.remove('active');
    };
    optionsContainer.appendChild(noneOpt);

    folders.forEach(folder => {
        const option = document.createElement('div');
        option.className = 'select-option';
        option.textContent = folder.name;
        option.dataset.folderId = folder.id;
        if (folder.id === activeFolderId) {
            option.classList.add('selected');
            selectedNameSpan.textContent = folder.name;
        }
        option.onclick = () => {
            optionsContainer.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedNameSpan.textContent = folder.name;
            wrapper.classList.remove('active');
        };
        optionsContainer.appendChild(option);
    });
}

function getSelectedFolderId() {
    const selectedOption = document.querySelector('#folderSelectOptions .select-option.selected');
    return (selectedOption && selectedOption.dataset.folderId) ? selectedOption.dataset.folderId : null;
}

// ==================== MOVE NOTE LOGIC ====================

function updateMoveFolderDropdown(excludeFolderId) {
    moveFolderSelectOptions.innerHTML = '';

    // Option to move to "No Folder"
    const noneOpt = document.createElement('div');
    noneOpt.className = 'select-option';
    noneOpt.textContent = 'No Folder';
    noneOpt.dataset.folderId = '';
    noneOpt.onclick = () => {
        moveSelectedFolderName.textContent = 'No Folder';
        moveFolderSelectOptions.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('selected'));
        noneOpt.classList.add('selected');
        moveFolderSelectWrapper.classList.remove('active');
        confirmMoveBtn.disabled = false;
    };
    moveFolderSelectOptions.appendChild(noneOpt);

    folders.forEach(folder => {
        if (folder.id === excludeFolderId) return;
        const option = document.createElement('div');
        option.className = 'select-option';
        option.textContent = folder.name;
        option.dataset.folderId = folder.id;
        option.onclick = () => {
            moveSelectedFolderName.textContent = folder.name;
            moveFolderSelectOptions.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            moveFolderSelectWrapper.classList.remove('active');
            confirmMoveBtn.disabled = false;
        };
        moveFolderSelectOptions.appendChild(option);
    });
}

moveToFolderItem.onclick = () => {
    if (!window.contextMenuNoteId) return;
    const note = notes.find(n => n.id === window.contextMenuNoteId);
    if (!note) return;
    moveNoteNameSpan.textContent = `Moving: "${note.title}"`;
    updateMoveFolderDropdown(note.folder_id);
    moveSelectedFolderName.textContent = 'Choose folder';
    moveNewFolderInput.value = '';
    confirmMoveBtn.disabled = true;
    moveNoteModal.classList.add('show');
    pushToModalStack(moveNoteModal);
    noteContextMenu.classList.remove('show');
};

confirmMoveBtn.onclick = () => {
    const selected = moveFolderSelectOptions.querySelector('.select-option.selected');
    if (selected && window.contextMenuNoteId) {
        const fId = selected.dataset.folderId || null;
        moveNoteToFolder(window.contextMenuNoteId, fId);
        moveNoteModal.classList.remove('show');
    }
};

createAndMoveBtn.onclick = async () => {
    const name = moveNewFolderInput.value.trim();
    if (!name) return;
    await createFolder(name);
    const newFolder = folders[folders.length - 1];
    if (window.contextMenuNoteId) {
        await moveNoteToFolder(window.contextMenuNoteId, newFolder.id);
    }
    moveNoteModal.classList.remove('show');
};

// ==================== OTHER EVENT LISTENERS ====================

addNoteBtn.onclick = () => {
    updateFolderDropdown();
    document.getElementById('newNoteName').value = '';
    newNoteModal.classList.add('show');
    pushToModalStack(newNoteModal);
    setTimeout(() => document.getElementById('newNoteName').focus(), 100);
};

document.getElementById('createNewNote').onclick = () => {
    const title = document.getElementById('newNoteName').value.trim();
    const fId = getSelectedFolderId();
    createNote(title || 'Untitled', fId);
    newNoteModal.classList.remove('show');
};

document.getElementById('cancelNewNote').onclick = () => newNoteModal.classList.remove('show');

confirmRenameBtn.onclick = () => {
    const title = renameNoteInput.value.trim();
    if (title && window.contextMenuNoteId) {
        renameNote(window.contextMenuNoteId, title);
        renameNoteModal.classList.remove('show');
    }
};

deleteBtn.onclick = () => {
    if (!activeNoteId) return;
    confirmModal.classList.add('show');
    pushToModalStack(confirmModal);
};

confirmDeleteBtn.onclick = () => {
    const id = window.contextMenuNoteId || activeNoteId;
    if (id) deleteNote(id);
    confirmModal.classList.remove('show');
};

manageFoldersBtn.onclick = () => {
    renderFolderList();
    manageFoldersModal.classList.add('show');
    pushToModalStack(manageFoldersModal);
};

document.getElementById('createFolderBtn').onclick = () => {
    const name = document.getElementById('newFolderName').value.trim();
    if (name) {
        createFolder(name);
        document.getElementById('newFolderName').value = '';
    }
};

document.getElementById('closeFoldersModal').onclick = () => manageFoldersModal.classList.remove('show');

// ==================== SHARE LOGIC ====================

async function updateShareUI(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const isPublic = note.is_public;
    const shareToggle = document.getElementById('shareToggle');
    const shareLinkSection = document.getElementById('shareLinkSection');
    const sharePrivateMsg = document.getElementById('sharePrivateMsg');
    const options = shareToggle.querySelectorAll('.toggle-option');

    if (isPublic) {
        shareToggle.classList.add('public');
        options[1].classList.add('active');
        options[0].classList.remove('active');
        shareLinkSection.classList.add('visible');
        sharePrivateMsg.classList.remove('visible');
        document.getElementById('shareLinkInput').value = `${window.location.origin}/share/${note.public_id || ''}`;
    } else {
        shareToggle.classList.remove('public');
        options[0].classList.add('active');
        options[1].classList.remove('active');
        sharePrivateMsg.classList.add('visible');
        shareLinkSection.classList.remove('visible');
    }
}

shareBtn.onclick = () => {
    if (!activeNoteId) return;
    updateShareUI(activeNoteId);
    shareModal.classList.add('show');
    pushToModalStack(shareModal);
};

document.getElementById('shareToggle').onclick = async () => {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;

    const newPublicStatus = !note.is_public;

    const { data, error } = await supabase
        .from('notes')
        .update({ is_public: newPublicStatus })
        .eq('id', activeNoteId)
        .select();

    if (!error) {
        note.is_public = data[0].is_public;
        note.public_id = data[0].public_id;
        note.public_expires_at = data[0].public_expires_at;
        updateShareUI(activeNoteId);
    }
};

document.getElementById('copyLinkBtn').onclick = () => {
    const input = document.getElementById('shareLinkInput');
    input.select();
    document.execCommand('copy');
    showToast('Link copied!', 'success');
};

document.getElementById('closeShareModal').onclick = () => shareModal.classList.remove('show');

// ==================== EXPORT LOGIC ====================

exportBtn.onclick = () => {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (note) exportFileNameInput.value = note.title.replace(/[^\w\s]/gi, '');
    exportModal.classList.add('show');
    pushToModalStack(exportModal);
};

exportCards.forEach(card => {
    card.onclick = () => {
        exportCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedExportFormat = card.dataset.format;
        exportConfirmBtn.disabled = false;
    };
});

exportConfirmBtn.onclick = async () => {
    const fileName = exportFileNameInput.value.trim() || 'note';
    exportModal.classList.remove('show');
    showToast(`Exporting as ${selectedExportFormat.toUpperCase()}...`);

    const content = writingCanvas.innerHTML;
    if (selectedExportFormat === 'pdf') {
        localStorage.setItem('vellum_print_content', content);
        localStorage.setItem('vellum_print_title', fileName);
        window.open('/print', '_blank');
    } else if (selectedExportFormat === 'markdown') {
        let md = content.replace(/<[^>]+>/g, '').trim();
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.md`;
        a.click();
    } else {
        const blob = new Blob([writingCanvas.textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.txt`;
        a.click();
    }
};

// ==================== SEARCH LOGIC ====================

searchBtn.onclick = () => {
    searchInput.value = '';
    searchResults.innerHTML = '<div class="search-placeholder">Start typing to search...</div>';
    searchModal.classList.add('show');
    pushToModalStack(searchModal);
    setTimeout(() => searchInput.focus(), 100);
};

searchInput.oninput = () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
        searchResults.innerHTML = '<div class="search-placeholder">Start typing to search...</div>';
        return;
    }
    const results = notes.filter(n => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query));
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-placeholder">No notes found</div>';
        return;
    }
    searchResults.innerHTML = '';
    results.forEach(note => {
        const folder = folders.find(f => f.id === note.folder_id) || { name: 'Unknown' };
        const card = document.createElement('div');
        card.className = 'search-result-card';
        card.innerHTML = `
            <div class="search-result-name">${escapeHtml(note.title)}</div>
            <div class="search-result-folder"><i class="fas fa-folder"></i> ${escapeHtml(folder.name)}</div>
        `;
        card.onclick = () => {
            activeFolderId = note.folder_id;
            activeNoteId = note.id;
            renderNoteChips();
            renderFolderList();
            loadActiveNote();
            searchModal.classList.remove('show');
        };
        searchResults.appendChild(card);
    });
};

// ==================== THEME & FOCUS ====================

function loadTheme() {
    const theme = localStorage.getItem(THEME_KEY) || 'light';
    html.setAttribute('data-theme', theme);
    themeIcon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

themeToggle.onclick = () => {
    const curr = html.getAttribute('data-theme');
    const next = curr === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    themeIcon.className = next === 'light' ? 'fas fa-moon' : 'fas fa-sun';
};

focusBtn.onclick = toggleFocus;
restoreBtn.onclick = toggleFocus;

function toggleFocus() {
    sidebar.classList.toggle('hidden');
    topBar.classList.toggle('hidden');
    workspace.classList.toggle('focus-mode');
    restoreBtn.classList.toggle('visible');
}

// ==================== CONTEXT MENU ====================

noteChips.oncontextmenu = (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    e.preventDefault();
    window.contextMenuNoteId = chip.dataset.noteId;
    const note = notes.find(n => n.id === window.contextMenuNoteId);
    if (note) {
        ctxPin.innerHTML = note.is_pinned ? '<i class="fas fa-thumbtack-slash"></i> Unpin Note' : '<i class="fas fa-thumbtack"></i> Pin Note';
    }
    const x = Math.min(e.pageX, window.innerWidth - 220);
    const y = Math.min(e.pageY, window.innerHeight - 250);
    noteContextMenu.style.left = `${x}px`;
    noteContextMenu.style.top = `${y}px`;
    noteContextMenu.classList.add('show');
};

ctxRename.onclick = () => {
    const note = notes.find(n => n.id === window.contextMenuNoteId);
    if (note) {
        renameNoteInput.value = note.title;
        renameNoteModal.classList.add('show');
        pushToModalStack(renameNoteModal);
    }
    noteContextMenu.classList.remove('show');
};

ctxPin.onclick = () => {
    if (window.contextMenuNoteId) togglePinNote(window.contextMenuNoteId);
    noteContextMenu.classList.remove('show');
};

ctxDelete.onclick = () => {
    deleteBtn.click();
    noteContextMenu.classList.remove('show');
};

document.onclick = (e) => {
    if (!noteContextMenu.contains(e.target)) noteContextMenu.classList.remove('show');
    if (moveFolderSelectWrapper && !moveFolderSelectWrapper.contains(e.target)) moveFolderSelectWrapper.classList.remove('active');
    const folderSelectWrapper = document.getElementById('folderSelectWrapper');
    if (folderSelectWrapper && !folderSelectWrapper.contains(e.target)) folderSelectWrapper.classList.remove('active');
};

moveFolderSelectTrigger.onclick = (e) => {
    e.stopPropagation();
    moveFolderSelectWrapper.classList.toggle('active');
};

const folderSelectTrigger = document.getElementById('folderSelectTrigger');
if (folderSelectTrigger) {
    folderSelectTrigger.onclick = (e) => {
        e.stopPropagation();
        document.getElementById('folderSelectWrapper').classList.toggle('active');
    };
}

// ==================== INITIALIZATION ====================

async function init() {
    loadTheme();

    // Ensure session is restored before fetching data
    const isRestored = await restoreSession();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        console.warn("No valid session found, redirecting to login...");
        window.location.replace('/login');
        return;
    }

    await fetchInitialData();

    const userData = localStorage.getItem('vellum_user');
    if (userData) {
        const user = JSON.parse(userData);
        const nameEl = document.getElementById('profileName');
        const emailEl = document.getElementById('profileEmail');
        if (nameEl) nameEl.textContent = user.name || user.email.split('@')[0];
        if (emailEl) emailEl.textContent = user.email;
    }
}

init();

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalStack.length > 0) {
        const m = modalStack.pop();
        if (m) m.classList.remove('show');
    }
});

// Auto-save debounced
let autoSaveTimer;
writingCanvas.oninput = () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveCurrentNote();
        pushToUndo();
    }, 1000);
};

userProfileBtn.onclick = () => {
    userProfileModal.classList.add('show');
    pushToModalStack(userProfileModal);
};

document.getElementById('closeProfileModal').onclick = () => userProfileModal.classList.remove('show');

logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    localStorage.removeItem('vellum_user');
    window.location.href = '/login';
};
