// ========================================
// Vellum - CORE LOGIC
// ========================================

import { supabase, restoreSession } from '/js/supabase-client.js';
import { showToast, escapeHtml } from '/js/utils.js';
import { modalManager } from '/js/modalManager.js';
import { modalTemplates } from '/js/modalTemplates.js';

// --- ELEMENT REFERENCES (GLOBAL) ---
const sidebar = document.getElementById('sidebar');
const topBar = document.getElementById('topBar');
const workspace = document.querySelector('.workspace');
const emptyState = document.getElementById('emptyState');
const focusBtn = document.getElementById('focusBtn');
const restoreBtn = document.getElementById('restoreBtn');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const html = document.documentElement;
export const writingCanvas = document.getElementById('writingCanvas');

// Button elements
const searchBtn = document.getElementById('searchBtn');
const exportBtn = document.getElementById('exportBtn');
const deleteBtn = document.getElementById('deleteBtn');
const addNoteBtn = document.getElementById('addNoteBtn');
const pinBtn = document.getElementById('pinBtn');
const manageFoldersBtn = document.getElementById('manageFoldersBtn');
const shareBtn = document.getElementById('shareBtn');
const userProfileBtn = document.getElementById('userProfileBtn');

// Note chips container
const noteChips = document.getElementById('noteChips');

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

        renderNoteChips();
        loadActiveNote();

    } catch (error) {
        showToast('Error loading data', 'error');
        console.error("Supabase load error:", error.message);
    }
}

export async function saveCurrentNote() {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;

    const content = writingCanvas.value;

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
    loadActiveNote();
    showToast('Note created!', 'success');
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

    renderNoteChips();
    showToast('Folder deleted!', 'success');
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


function loadActiveNote() {
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        writingCanvas.value = note.content || '';
        writingCanvas.disabled = false;
        writingCanvas.style.display = 'block';
        if (emptyState) emptyState.classList.add('hidden');
        updatePinButton();
        deleteBtn.classList.remove('disabled');
        shareBtn.classList.remove('disabled');
        exportBtn.classList.remove('disabled');
    } else {
        // Empty State Screen
        writingCanvas.value = '';
        writingCanvas.disabled = true;
        writingCanvas.style.display = 'none';
        if (emptyState) {
            emptyState.classList.remove('hidden');
            const createBtn = document.getElementById('createNoteFromEmpty');
            if (createBtn) {
                createBtn.onclick = () => {
                    createNote('Untitled', activeFolderId);
                };
            }
        }
        deleteBtn.classList.add('disabled');
        shareBtn.classList.add('disabled');
        exportBtn.classList.add('disabled');
        updatePinButton();
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
    loadActiveNote();
}


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

function setupFolderDropdown(container) {
    const optionsContainer = container.querySelector('#folderSelectOptions');
    const selectedNameSpan = container.querySelector('#selectedFolderName');
    const wrapper = container.querySelector('#folderSelectWrapper');
    const trigger = container.querySelector('#folderSelectTrigger');
    if (!optionsContainer) return;

    optionsContainer.innerHTML = '';

    if (trigger) {
        trigger.onclick = (e) => {
            e.stopPropagation();
            wrapper.classList.toggle('active');
        };
    }

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

    // Close dropdown on outside click
    const outsideClick = (e) => {
        if (wrapper && !wrapper.contains(e.target)) {
            wrapper.classList.remove('active');
        }
    };
    document.addEventListener('click', outsideClick);

    // We should return a cleanup function if possible, but ModalManager
    // removes the element which is usually enough for simple listeners.
}

function getSelectedFolderId() {
    const selectedOption = document.querySelector('#folderSelectOptions .select-option.selected');
    return (selectedOption && selectedOption.dataset.folderId) ? selectedOption.dataset.folderId : null;
}

// ==================== MOVE NOTE LOGIC ====================

function updateMoveFolderDropdownInModal(container, excludeFolderId) {
    const optionsContainer = container.querySelector('#moveFolderSelectOptions');
    const selectedNameSpan = container.querySelector('#moveSelectedFolderName');
    const wrapper = container.querySelector('#moveFolderSelectWrapper');
    const confirmBtn = container.querySelector('.modal-btn.primary');

    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';

    // Option to move to "No Folder"
    const noneOpt = document.createElement('div');
    noneOpt.className = 'select-option';
    noneOpt.textContent = 'No Folder';
    noneOpt.dataset.folderId = '';
    noneOpt.onclick = () => {
        selectedNameSpan.textContent = 'No Folder';
        optionsContainer.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('selected'));
        noneOpt.classList.add('selected');
        wrapper.classList.remove('active');
        confirmBtn.disabled = false;
    };
    optionsContainer.appendChild(noneOpt);

    folders.forEach(folder => {
        if (folder.id === excludeFolderId) return;
        const option = document.createElement('div');
        option.className = 'select-option';
        option.textContent = folder.name;
        option.dataset.folderId = folder.id;
        option.onclick = () => {
            selectedNameSpan.textContent = folder.name;
            optionsContainer.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            wrapper.classList.remove('active');
            confirmBtn.disabled = false;
        };
        optionsContainer.appendChild(option);
    });
}

moveToFolderItem.onclick = () => {
    if (!window.contextMenuNoteId) return;
    const note = notes.find(n => n.id === window.contextMenuNoteId);
    if (!note) return;
    noteContextMenu.classList.remove('show');

    modalManager.openModal('move-note', {
        title: 'Move Note',
        content: modalTemplates.moveNote(note.title),
        actions: [
            { text: '<i class="fas fa-times"></i> Cancel', class: 'secondary' },
            {
                text: '<i class="fas fa-exchange-alt"></i> Move Note',
                class: 'primary',
                onClick: () => {
                    const selected = document.querySelector('#moveFolderSelectOptions .select-option.selected');
                    if (selected) {
                        const fId = selected.dataset.folderId || null;
                        moveNoteToFolder(note.id, fId);
                    }
                }
            }
        ],
        onMount: (container) => {
            const wrapper = container.querySelector('#moveFolderSelectWrapper');
            const trigger = container.querySelector('#moveFolderSelectTrigger');
            const confirmBtn = container.querySelector('.modal-btn.primary');
            const createAndMoveBtn = container.querySelector('#createAndMoveBtn');
            const newFolderInput = container.querySelector('#moveNewFolderName');

            confirmBtn.disabled = true;

            if (trigger) {
                trigger.onclick = (e) => {
                    e.stopPropagation();
                    wrapper.classList.toggle('active');
                };
            }

            updateMoveFolderDropdownInModal(container, note.folder_id);

            createAndMoveBtn.onclick = async () => {
                const name = newFolderInput.value.trim();
                if (!name) return;
                await createFolder(name);
                const newFolder = folders[folders.length - 1];
                await moveNoteToFolder(note.id, newFolder.id);
                modalManager.closeModal();
            };

            // Close dropdown on outside click
            const outsideClick = (e) => {
                if (wrapper && !wrapper.contains(e.target)) {
                    wrapper.classList.remove('active');
                }
            };
            document.addEventListener('click', outsideClick);
        }
    });
};

// ==================== OTHER EVENT LISTENERS ====================

addNoteBtn.onclick = () => {
    modalManager.openModal('new-note', {
        title: 'Create New Note',
        content: modalTemplates.newNote(),
        actions: [
            { text: '<i class="fas fa-times"></i> Cancel', class: 'secondary' },
            {
                text: '<i class="fas fa-plus"></i> Create Note',
                class: 'primary',
                onClick: () => {
                    const title = document.getElementById('newNoteName').value.trim();
                    const fId = getSelectedFolderId();
                    createNote(title || 'Untitled', fId);
                }
            }
        ],
        onMount: (container) => {
            setupFolderDropdown(container);
            const input = container.querySelector('#newNoteName');
            if (input) setTimeout(() => input.focus(), 100);
        }
    });
};

ctxRename.onclick = () => {
    const note = notes.find(n => n.id === window.contextMenuNoteId);
    if (!note) return;
    noteContextMenu.classList.remove('show');

    modalManager.openModal('rename-note', {
        title: 'Rename Note',
        content: modalTemplates.renameNote(note.title),
        actions: [
            { text: '<i class="fas fa-times"></i> Cancel', class: 'secondary' },
            {
                text: '<i class="fas fa-check"></i> Save Changes',
                class: 'primary',
                onClick: () => {
                    const title = document.getElementById('renameNoteInput').value.trim();
                    if (title) renameNote(note.id, title);
                }
            }
        ],
        onMount: (container) => {
            const input = container.querySelector('#renameNoteInput');
            if (input) setTimeout(() => {
                input.focus();
                input.select();
            }, 100);
        }
    });
};

deleteBtn.onclick = () => {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;

    modalManager.openModal('delete-note', {
        title: 'Delete Note?',
        content: modalTemplates.deleteNote(),
        actions: [
            { text: '<i class="fas fa-times"></i> Cancel', class: 'secondary' },
            {
                text: '<i class="fas fa-trash-alt"></i> Delete Note',
                class: 'delete',
                onClick: () => deleteNote(note.id)
            }
        ]
    });
};

let selectedFolderIdInModal = null;

manageFoldersBtn.onclick = () => {
    selectedFolderIdInModal = activeFolderId;
    modalManager.openModal('manage-folders', {
        title: 'Manage Folders',
        boxClass: 'manage-folders-box',
        content: modalTemplates.manageFolders(),
        actions: [
            { text: '<i class="fas fa-check"></i> Done', class: 'secondary' }
        ],
        onMount: (container) => {
            const createBtn = container.querySelector('#createFolderBtn');
            const newFolderInput = container.querySelector('#newFolderName');

            const handleCreate = () => {
                const name = newFolderInput.value.trim();
                if (name) {
                    createFolder(name).then(() => {
                        newFolderInput.value = '';
                        renderFolderListInModal(container);
                    });
                }
            };

            createBtn.onclick = handleCreate;
            newFolderInput.onkeydown = (e) => { if (e.key === 'Enter') handleCreate(); };

            renderFolderListInModal(container);
            renderFolderDetails(selectedFolderIdInModal, container);
        }
    });
};

function renderFolderListInModal(container) {
    const chipsGrid = container.querySelector('#folderChipsGrid');
    if (!chipsGrid) return;
    chipsGrid.innerHTML = '';

    // "All Notes" Chip
    const allChip = document.createElement('div');
    allChip.className = 'folder-chip';
    if (selectedFolderIdInModal === null) allChip.classList.add('active');
    allChip.innerHTML = `
        <i class="fas fa-layer-group"></i>
        <span class="folder-chip-name">All Notes</span>
    `;
    allChip.onclick = () => {
        selectedFolderIdInModal = null;
        renderFolderListInModal(container);
        renderFolderDetails(null, container);
        setActiveFolder(null);
    };
    chipsGrid.appendChild(allChip);

    folders.forEach(folder => {
        const chip = document.createElement('div');
        chip.className = 'folder-chip';
        if (folder.id === selectedFolderIdInModal) chip.classList.add('active');

        chip.innerHTML = `
            <i class="fas fa-folder"></i>
            <span class="folder-chip-name">${escapeHtml(folder.name)}</span>
            <div class="delete-btn" title="Delete Folder">
                <i class="fas fa-times"></i>
            </div>
        `;

        chip.onclick = (e) => {
            if (e.target.closest('.delete-btn')) {
                e.stopPropagation();
                modalManager.openModal('delete-folder', {
                    title: 'Delete Folder?',
                    content: modalTemplates.deleteFolder(folder.name),
                    actions: [
                        { text: '<i class="fas fa-times"></i> Cancel', class: 'secondary' },
                        {
                            text: '<i class="fas fa-trash-alt"></i> Delete Folder',
                            class: 'delete',
                            onClick: () => {
                                deleteFolder(folder.id).then(() => {
                                    if (selectedFolderIdInModal === folder.id) selectedFolderIdInModal = null;
                                    renderFolderListInModal(container);
                                    renderFolderDetails(selectedFolderIdInModal, container);
                                });
                            }
                        }
                    ]
                });
                return;
            }
            selectedFolderIdInModal = folder.id;
            renderFolderListInModal(container);
            renderFolderDetails(folder.id, container);
            setActiveFolder(folder.id);
        };

        chipsGrid.appendChild(chip);
    });
}

function renderFolderDetails(folderId, container) {
    const detailsPanel = container.querySelector('#folderDetailsPanel');
    if (!detailsPanel) return;

    if (folderId === null) {
        detailsPanel.innerHTML = `
            <div class="folder-detail-content">
                <div class="folder-detail-icon"><i class="fas fa-layer-group"></i></div>
                <div class="folder-detail-name">All Notes</div>
                <div class="folder-detail-meta">
                    <span><i class="fas fa-file-alt"></i> ${notes.length} notes total</span>
                    <span><i class="fas fa-info-circle"></i> Showing all notes across all folders.</span>
                </div>
            </div>
        `;
        return;
    }

    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
        detailsPanel.innerHTML = '<div class="folder-detail-placeholder">Select a folder to view details</div>';
        return;
    }

    const folderNotes = notes.filter(n => n.folder_id === folder.id);
    const createdDate = new Date(folder.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    detailsPanel.innerHTML = `
        <div class="folder-detail-content">
            <div class="folder-detail-icon"><i class="fas fa-folder-open"></i></div>
            <div class="folder-detail-name">${escapeHtml(folder.name)}</div>
            <div class="folder-detail-meta">
                <span><i class="fas fa-file-alt"></i> ${folderNotes.length} notes inside</span>
                <span><i class="fas fa-calendar-alt"></i> Created on ${createdDate}</span>
            </div>
        </div>
    `;
}

// ==================== SHARE LOGIC ====================

async function updateShareUI(noteId, container) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const isPublic = note.is_public;
    const shareToggle = container.querySelector('#shareToggle');
    const shareLinkSection = container.querySelector('#shareLinkSection');
    const sharePrivateMsg = container.querySelector('#sharePrivateMsg');
    const options = shareToggle.querySelectorAll('.toggle-option');
    const linkInput = container.querySelector('#shareLinkInput');

    if (isPublic) {
        shareToggle.classList.add('public');
        options[1].classList.add('active');
        options[0].classList.remove('active');
        shareLinkSection.classList.add('visible');
        sharePrivateMsg.classList.remove('visible');
        linkInput.value = `${window.location.origin}/share/${note.public_id || ''}`;
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
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;

    modalManager.openModal('share-note', {
        title: 'Share Note',
        content: modalTemplates.shareNote(),
        actions: [
            { text: '<i class="fas fa-times"></i> Close', class: 'secondary' }
        ],
        onMount: (container) => {
            updateShareUI(note.id, container);

            const shareToggle = container.querySelector('#shareToggle');
            const copyBtn = container.querySelector('#copyLinkBtn');

            shareToggle.onclick = async () => {
                const newPublicStatus = !note.is_public;
                const { data, error } = await supabase
                    .from('notes')
                    .update({ is_public: newPublicStatus })
                    .eq('id', note.id)
                    .select();

                if (!error) {
                    note.is_public = data[0].is_public;
                    note.public_id = data[0].public_id;
                    note.public_expires_at = data[0].public_expires_at;
                    updateShareUI(note.id, container);
                }
            };

            copyBtn.onclick = () => {
                const input = container.querySelector('#shareLinkInput');
                input.select();
                document.execCommand('copy');
                showToast('Link copied!', 'success');
            };
        }
    });
};

// ==================== EXPORT LOGIC ====================

exportBtn.onclick = () => {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;

    modalManager.openModal('export-note', {
        title: '<i class="fas fa-download"></i> Export Note',
        content: modalTemplates.exportNote(note.title.replace(/[^\w\s]/gi, '')),
        actions: [
            { text: '<i class="fas fa-times"></i> Cancel', class: 'secondary' },
            {
                text: '<i class="fas fa-download"></i> Export Now',
                class: 'primary',
                id: 'exportConfirmBtn',
                onClick: () => handleExport(note)
            }
        ],
        onMount: (container) => {
            const cards = container.querySelectorAll('.export-card');
            const confirmBtn = container.querySelector('.modal-btn.primary');
            confirmBtn.disabled = true;
            selectedExportFormat = null;

            cards.forEach(card => {
                card.onclick = () => {
                    cards.forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    selectedExportFormat = card.dataset.format;
                    confirmBtn.disabled = false;
                };
            });
        }
    });
};

function handleExport(note) {
    const fileName = document.getElementById('exportFileName').value.trim() || 'note';
    showToast(`Exporting as ${selectedExportFormat.toUpperCase()}...`);

    const content = writingCanvas.value;
    if (selectedExportFormat === 'pdf') {
        // Convert plain text to simple HTML for print view
        const htmlContent = content.split('\n').map(line => `<div>${escapeHtml(line) || '<br>'}</div>`).join('');
        localStorage.setItem('vellum_print_content', htmlContent);
        localStorage.setItem('vellum_print_title', fileName);
        window.open('/print', '_blank');
    } else if (selectedExportFormat === 'markdown') {
        const blob = new Blob([content], { type: 'text/markdown' });
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
}

// ==================== SEARCH LOGIC ====================

searchBtn.onclick = () => {
    modalManager.openModal('search', {
        title: '<i class="fas fa-search"></i> Search Notes',
        content: modalTemplates.searchNotes(),
        actions: [
            { text: '<i class="fas fa-times"></i> Close', class: 'secondary' }
        ],
        onMount: (container) => {
            const input = container.querySelector('#searchInput');
            const resultsDiv = container.querySelector('#searchResults');

            if (input) {
                setTimeout(() => input.focus(), 100);
                input.oninput = () => {
                    const query = input.value.trim().toLowerCase();
                    if (!query) {
                        resultsDiv.innerHTML = '<div class="search-placeholder">Start typing to search...</div>';
                        return;
                    }
                    const results = notes.filter(n => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query));
                    if (results.length === 0) {
                        resultsDiv.innerHTML = '<div class="search-placeholder">No notes found</div>';
                        return;
                    }
                    resultsDiv.innerHTML = '';
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
                            modalManager.closeModal();
                        };
                        resultsDiv.appendChild(card);
                    });
                };
            }
        }
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


ctxPin.onclick = () => {
    if (window.contextMenuNoteId) togglePinNote(window.contextMenuNoteId);
    noteContextMenu.classList.remove('show');
};

ctxDelete.onclick = () => {
    deleteBtn.click();
    noteContextMenu.classList.remove('show');
};

document.onclick = (e) => {
    if (noteContextMenu && !noteContextMenu.contains(e.target)) {
        noteContextMenu.classList.remove('show');
    }

    const moveWrapper = document.getElementById('moveFolderSelectWrapper');
    if (moveWrapper && !moveWrapper.contains(e.target)) {
        moveWrapper.classList.remove('active');
    }

    const folderWrapper = document.getElementById('folderSelectWrapper');
    if (folderWrapper && !folderWrapper.contains(e.target)) {
        folderWrapper.classList.remove('active');
    }
};

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


// Auto-save debounced
let autoSaveTimer;
writingCanvas.oninput = () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        saveCurrentNote();
    }, 1000);
};

userProfileBtn.onclick = () => {
    const userData = localStorage.getItem('vellum_user');
    let name = 'Guest User';
    let email = 'guest@vellum.com';

    if (userData) {
        const user = JSON.parse(userData);
        name = user.name || user.email.split('@')[0];
        email = user.email;
    }

    modalManager.openModal('profile', {
        title: '<i class="fas fa-user-circle"></i> User Profile',
        content: modalTemplates.userProfile(name, email),
        actions: [
            { text: '<i class="fas fa-times"></i> Close', class: 'secondary' }
        ],
        onMount: (container) => {
            const logoutBtn = container.querySelector('#logoutBtn');
            if (logoutBtn) {
                logoutBtn.onclick = async () => {
                    await supabase.auth.signOut();
                    sessionStorage.clear();
                    localStorage.removeItem('vellum_user');
                    window.location.href = '/login';
                };
            }
        }
    });
};
