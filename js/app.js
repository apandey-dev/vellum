// ========================================
// Vellum - CORE LOGIC
// ========================================

import { escapeHtml, showToast } from '/utils/helpers.js';
import { modalManager } from '/js/ui/modalManager.js';
import { modalTemplates } from '/js/ui/modalTemplates.js';
import { EditorUI } from '/js/ui/editor-ui.js';
import { MarkdownEngine } from '/js/ui/markdown-engine.js';
import { DBStore } from '/js/storage/indexedDB.js';
import { SyncEngine } from '/js/sync/deltaSync.js';
import { GitHubAPI } from '/js/core/githubClient.js';
import { RepoBootstrap } from '/js/core/repoBootstrap.js';
import { pushNoteUpdate, pushNoteCreate, pushNoteDelete, pushMetaUpdate, getNoteFilePath } from '/js/notes/noteCRUD.js';
import { ConflictResolver } from '/js/sync/conflictResolver.js';
import { shareNoteAsGist, updateGist, getShareRef, unshareNote } from '/js/sharing/gistShare.js';

// --- ELEMENT REFERENCES (GLOBAL) ---
const sidebar = document.getElementById('sidebar');
const topBar = document.getElementById('topBar');
const workspace = document.querySelector('.workspace');
const editorContainer = document.getElementById('editorContainer');
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
let activeNoteId = null;
let activeFolderId = null; // null means 'All' or no folder filter

// Export state
let selectedExportFormat = null;

// ==================== GITHUB-BACKED DATA OPERATIONS ====================

function generateNoteId() { return Math.random().toString(36).substr(2, 9); }
function queueSync(task) { DBStore.addSyncTask(task).then(() => { SyncEngine.pushSyncQueue() }); }

async function fetchInitialData() {
    try {
        await DBStore.init();
        const allNotes = await DBStore.getAggregatedNotes();

        activeNoteId = null;
        activeFolderId = null;
        if (allNotes.length > 0) {
            activeNoteId = allNotes[0].id;
            activeFolderId = allNotes[0].folder_id;
        }

        await renderNoteChips();
        await loadActiveNote();

        // Step 3: Bootstrap repo and start background sync
        RepoBootstrap.bootstrapRepository().then(async () => {
            // Initial sync-pull on startup
            await SyncEngine.pullDeltaSync();
            // Then keep syncing in background every 60 seconds (only when tab is visible)
            SyncEngine.startBackgroundSync(60000);
        }).catch(err => console.error("Bootstrap or initial sync failed:", err));

    } catch (error) {
        showToast('Error loading data', 'error');
        console.error("Local load error:", error.message);
    }
}

let saveTimeout = null;
export async function saveCurrentNote() {
    if (!activeNoteId) return;
    const note = await DBStore.getNote(activeNoteId);
    if (!note) return;

    const content = writingCanvas.value;
    if (note.content !== content) {
        note.content = content;
        note.updated_at = Date.now();

        try {
            await DBStore.putNote(note);

            // Debounce background commit using saveTimeout
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                pushNoteUpdate(note.id, content);
            }, 2000); // 2s debounce — prevents excessive API calls while typing

        } catch (error) {
            console.error('Error saving note:', error.message);
        }
    }
}
window.saveCurrentNote = saveCurrentNote;

async function createNote(title, folderId = null) {
    const id = generateNoteId();
    const folderKey = folderId || 'personal';
    const cleanFolder = folderKey.replace(/[^a-zA-Z0-9]/g, '');
    const path = getNoteFilePath(id);

    title = title || 'Untitled';
    const allNotes = await DBStore.getAggregatedNotes();
    const newNote = { id, title, content: '', folder_id: folderId, is_pinned: false, order_index: allNotes.length };

    activeNoteId = id;
    activeFolderId = folderId;

    await DBStore.putNote(newNote);

    const meta = await DBStore.getMeta('index') || { folders: { personal: { name: "Personal", notes: [] } }, notesIndex: {} };
    if (!meta.folders[folderKey]) meta.folders[folderKey] = { name: folderKey || 'Personal', notes: [] };
    if (!meta.folders[folderKey].notes.includes(id)) meta.folders[folderKey].notes.push(id);

    meta.notesIndex[id] = { title, path, folder: folderId, updated: Date.now(), is_pinned: false, order_index: newNote.order_index };

    await DBStore.setMeta('index', meta);

    // Fire and forget — UI already updated above
    pushNoteCreate(newNote, meta);

    await renderNoteChips();
    await loadActiveNote();
    showToast('Note created!', 'success');
}

async function deleteNote(noteId) {
    const meta = await DBStore.getMeta('index');
    const path = meta?.notesIndex[noteId]?.path;

    if (activeNoteId === noteId) {
        let folderNotes = await getNotesInFolder(activeFolderId);
        folderNotes = folderNotes.filter(n => n.id !== noteId);

        let allNotes = await DBStore.getAggregatedNotes();
        allNotes = allNotes.filter(n => n.id !== noteId);

        activeNoteId = folderNotes.length > 0 ? folderNotes[0].id : (allNotes.length > 0 ? allNotes[0].id : null);
    }

    await DBStore.deleteNote(noteId);

    if (meta) {
        if (meta.notesIndex[noteId]) {
            const fId = meta.notesIndex[noteId].folder || 'personal';
            if (meta.folders[fId]) {
                meta.folders[fId].notes = meta.folders[fId].notes.filter(id => id !== noteId);
            }
            delete meta.notesIndex[noteId];
            await DBStore.setMeta('index', meta);
            // Fire and forget: Delete note file + update metadata in one commit
            if (path) pushNoteDelete(noteId, path, meta);
            else pushMetaUpdate(`delete:${noteId}`, meta);
        }
    }

    await renderNoteChips();
    await loadActiveNote();
    showToast('Note deleted!', 'success');
}

async function renameNote(noteId, newTitle) {
    const note = await DBStore.getNote(noteId);
    if (note) {
        note.title = newTitle;
        await DBStore.putNote(note);
    }

    const meta = await DBStore.getMeta('index');
    if (meta && meta.notesIndex[noteId]) {
        meta.notesIndex[noteId].title = newTitle;
        meta.notesIndex[noteId].updated = Date.now();
        await DBStore.setMeta('index', meta);
        pushMetaUpdate(`rename:${newTitle}`, meta);
    }

    await renderNoteChips();
    showToast('Note renamed', 'success');
}

async function createFolder(name) {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);

    const meta = await DBStore.getMeta('index') || { folders: {}, notesIndex: {} };
    meta.folders[id] = { name, notes: [], created_at: Date.now() };
    await DBStore.setMeta('index', meta);
    pushMetaUpdate(`folder:create:${name}`, meta);

    // Assuming downstream relies on re-rendering chips or folder lists
    await renderNoteChips();
    showToast('Folder created!', 'success');
}

async function deleteFolder(folderId) {
    if (activeFolderId === folderId) activeFolderId = null;

    const meta = await DBStore.getMeta('index');
    if (meta) {
        const notesToDelete = meta.folders[folderId]?.notes || [];
        notesToDelete.forEach(nid => {
            const p = meta.notesIndex[nid]?.path;
            if (p) pushNoteDelete(nid, p, meta); // each call fires its own commit
            delete meta.notesIndex[nid];
            DBStore.deleteNote(nid);
        });
        delete meta.folders[folderId];
        await DBStore.setMeta('index', meta);
        pushMetaUpdate(`folder:delete:${folderId}`, meta);
    }

    await renderNoteChips();
    await loadActiveNote();
    showToast('Folder deleted!', 'success');
}

async function moveNoteToFolder(noteId, targetFolderId) {
    const note = await DBStore.getNote(noteId);
    if (note) {
        note.folder_id = targetFolderId;
        await DBStore.putNote(note);
    }

    if (activeNoteId === noteId && activeFolderId !== null && activeFolderId !== targetFolderId) {
        const remainingNotes = await getNotesInFolder(activeFolderId);
        activeNoteId = remainingNotes.length > 0 ? remainingNotes[0].id : null;
    }

    const meta = await DBStore.getMeta('index');
    if (meta && meta.notesIndex[noteId]) {
        const oldFolder = meta.notesIndex[noteId].folder || 'personal';
        if (meta.folders[oldFolder]) {
            meta.folders[oldFolder].notes = meta.folders[oldFolder].notes.filter(id => id !== noteId);
        }

        const newFolderKey = targetFolderId || 'personal';
        if (!meta.folders[newFolderKey]) meta.folders[newFolderKey] = { name: newFolderKey, notes: [] };
        if (!meta.folders[newFolderKey].notes.includes(noteId)) meta.folders[newFolderKey].notes.push(noteId);

        meta.notesIndex[noteId].folder = targetFolderId;
        meta.notesIndex[noteId].updated = Date.now();
        await DBStore.setMeta('index', meta);
        pushMetaUpdate(`move:${noteId}→${targetFolderId}`, meta);
    }

    await renderNoteChips();
    await loadActiveNote();
    showToast('Note moved', 'success');
}

async function togglePinNote(noteId) {
    const note = await DBStore.getAggregatedNoteById(noteId);
    if (!note) return;

    note.is_pinned = !note.is_pinned;
    await updatePinButton();
    await renderNoteChips();

    const meta = await DBStore.getMeta('index');
    if (meta && meta.notesIndex[noteId]) {
        meta.notesIndex[noteId].is_pinned = note.is_pinned;
        await DBStore.setMeta('index', meta);
        pushMetaUpdate(`pin:${noteId}`, meta);
    }

    showToast(note.is_pinned ? 'Note pinned' : 'Note unpinned', 'success');
}

// (sync-completed and online/offline handlers are registered further down in the file)

// ==================== UI RENDERING ====================

async function getNotesInFolder(folderId) {
    // getAggregatedNotesLazy only reads metadata/index.json — no content blobs loaded
    // This keeps the sidebar fast regardless of note count or note size
    const allNotes = await DBStore.getAggregatedNotesLazy();
    if (folderId === null) return allNotes; // null means 'All'
    return allNotes.filter(n => n.folder_id === folderId);
}

async function renderNoteChips() {
    noteChips.innerHTML = '';
    const folderNotes = await getNotesInFolder(activeFolderId);

    if (folderNotes.length === 0) {
        const emptyChip = document.createElement('div');
        emptyChip.className = 'chip empty-chip';
        emptyChip.textContent = 'No notes';
        noteChips.appendChild(emptyChip);
        return;
    }

    // Sort by pinned status first, then by user-defined order_index
    folderNotes.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
        return (a.order_index || 0) - (b.order_index || 0);
    });

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
        menuBtn.onclick = async (e) => {
            e.stopPropagation();
            e.preventDefault();
            window.contextMenuNoteId = note.id;

            const noteObj = await DBStore.getAggregatedNoteById(note.id);
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


async function loadActiveNote() {
    const note = activeNoteId ? await DBStore.getAggregatedNoteById(activeNoteId) : null;
    if (note) {
        writingCanvas.value = note.content || '';
        writingCanvas.disabled = false;
        if (editorContainer) editorContainer.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');

        // Update live preview immediately after loading content
        EditorUI.updatePreview();

        await updatePinButton();
        deleteBtn.classList.remove('disabled');
        shareBtn.classList.remove('disabled');
        exportBtn.classList.remove('disabled');
    } else {
        // Empty State Screen
        writingCanvas.value = '';
        writingCanvas.disabled = true;
        if (editorContainer) editorContainer.classList.add('hidden');
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
        await updatePinButton();
    }
}

async function switchNote(noteId) {
    await saveCurrentNote();
    activeNoteId = noteId;
    await loadActiveNote();
    await renderNoteChips();
}

async function setActiveFolder(folderId) {
    await saveCurrentNote();
    activeFolderId = folderId;
    const folderNotes = await getNotesInFolder(folderId);
    activeNoteId = folderNotes.length > 0 ? folderNotes[0].id : null;
    await renderNoteChips();
    await loadActiveNote();
}


// ==================== PIN LOGIC ====================

async function updatePinButton() {
    pinBtn.innerHTML = '<i class="fas fa-thumbtack"></i>';
    if (!activeNoteId) {
        pinBtn.classList.remove('pinned');
        return;
    }
    const note = await DBStore.getAggregatedNoteById(activeNoteId);
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

async function setupFolderDropdown(container) {
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

    const folders = await DBStore.getFoldersArray();
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

async function updateMoveFolderDropdownInModal(container, excludeFolderId) {
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

    const folders = await DBStore.getFoldersArray();
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

moveToFolderItem.onclick = async () => {
    if (!window.contextMenuNoteId) return;
    const note = await DBStore.getAggregatedNoteById(window.contextMenuNoteId);
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
        onMount: async (container) => {
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

            await updateMoveFolderDropdownInModal(container, note.folder_id);

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

ctxRename.onclick = async () => {
    const note = await DBStore.getAggregatedNoteById(window.contextMenuNoteId);
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

deleteBtn.onclick = async () => {
    if (!activeNoteId) return;
    const note = await DBStore.getAggregatedNoteById(activeNoteId);
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

async function renderFolderListInModal(container) {
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

    const folders = await DBStore.getFoldersArray();
    folders.forEach(folder => {
        const chip = document.createElement('div');
        chip.className = 'folder-chip';
        if (folder.id === selectedFolderIdInModal) chip.classList.add('active');

        chip.innerHTML = `
            <i class="fas fa-folder"></i>
            <span class="folder-chip-name">${escapeHtml(folder.name)}</span>
            <div class="delete-btn" title="Delete Folder">
                <i class="fas fa-trash-alt"></i>
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

async function renderFolderDetails(folderId, container) {
    const detailsPanel = container.querySelector('#folderDetailsPanel');
    if (!detailsPanel) return;

    if (folderId === null) {
        detailsPanel.innerHTML = `
            <div class="folder-detail-content">
                <div class="folder-detail-icon"><i class="fas fa-layer-group"></i></div>
                <div class="folder-detail-name">All Notes</div>
                <div class="folder-detail-meta">
                    <span><i class="fas fa-file-alt"></i> ${(await DBStore.getAggregatedNotes()).length} notes total</span>
                    <span><i class="fas fa-info-circle"></i> Showing all notes across all folders.</span>
                </div>
            </div>
        `;
        return;
    }

    const folders = await DBStore.getFoldersArray();
    const folder = folders.find(f => f.id === folderId);
    if (!folder) {
        detailsPanel.innerHTML = '<div class="folder-detail-placeholder">Select a folder to view details</div>';
        return;
    }

    const allNotes = await DBStore.getAggregatedNotes();
    const folderNotes = allNotes.filter(n => n.folder_id === folder.id);
    const createdDate = new Date(meta?.folders?.[folder.id]?.created_at || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

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
    const meta = await DBStore.getMeta('index');
    const isPublic = meta?.notesIndex?.[noteId]?.is_public || false;
    const gistUrl = meta?.notesIndex?.[noteId]?.public_url || '';

    const shareToggle = container.querySelector('#shareToggle');
    const shareLinkSection = container.querySelector('#shareLinkSection');
    const sharePrivateMsg = container.querySelector('#sharePrivateMsg');
    const options = shareToggle.querySelectorAll('.toggle-option');
    const linkInput = container.querySelector('#shareLinkInput');

    if (isPublic && gistUrl) {
        shareToggle.classList.add('public');
        options[1]?.classList.add('active');
        options[0]?.classList.remove('active');
        shareLinkSection.classList.add('visible');
        sharePrivateMsg.classList.remove('visible');
        linkInput.value = gistUrl;
    } else {
        shareToggle.classList.remove('public');
        options[0]?.classList.add('active');
        options[1]?.classList.remove('active');
        sharePrivateMsg.classList.add('visible');
        shareLinkSection.classList.remove('visible');
    }
}

shareBtn.onclick = async () => {
    if (!activeNoteId) return;
    const note = await DBStore.getAggregatedNoteById(activeNoteId);
    if (!note) return;

    modalManager.openModal('share-note', {
        title: '<i class="fas fa-share-alt"></i> Share Note',
        content: modalTemplates.shareNote(),
        actions: [
            { text: '<i class="fas fa-times"></i> Close', class: 'secondary' }
        ],
        onMount: async (container) => {
            await updateShareUI(note.id, container);

            const shareToggle = container.querySelector('#shareToggle');
            const copyBtn = container.querySelector('#copyLinkBtn');

            shareToggle.onclick = async () => {
                const meta = await DBStore.getMeta('index');
                const isPublic = meta?.notesIndex?.[note.id]?.is_public || false;
                const toggleBtn = shareToggle;

                if (!isPublic) {
                    // --- SHARE: Create or update Gist ---
                    if (!navigator.onLine) {
                        showToast('You are offline. Cannot share right now.', 'error');
                        return;
                    }

                    toggleBtn.style.opacity = '0.5';
                    toggleBtn.style.pointerEvents = 'none';

                    try {
                        const existingRef = await getShareRef(note.id);

                        if (existingRef) {
                            // Note already shared — update the existing Gist
                            await updateGist(existingRef.gistId, note);
                            showToast('Share link updated!', 'success');
                        } else {
                            // New share
                            const result = await shareNoteAsGist(note);
                            showToast('Note shared! Link copied.', 'success');

                            // Auto-copy URL to clipboard
                            try {
                                await navigator.clipboard.writeText(result.url);
                            } catch { /* clipboard denied */ }
                        }

                    } catch (err) {
                        console.error('[Share] Gist creation failed:', err);
                        if (err.message === 'offline') {
                            showToast('You are offline. Share failed.', 'error');
                        } else {
                            showToast('Failed to create share link. Please try again.', 'error');
                        }
                        toggleBtn.style.opacity = '1';
                        toggleBtn.style.pointerEvents = '';
                        return;
                    }

                    toggleBtn.style.opacity = '1';
                    toggleBtn.style.pointerEvents = '';

                } else {
                    // --- UNSHARE ---
                    await unshareNote(note.id);
                    showToast('Note is now private.', 'success');
                }

                await updateShareUI(note.id, container);
            };

            copyBtn.onclick = async () => {
                const input = container.querySelector('#shareLinkInput');
                if (!input.value) return;
                try {
                    await navigator.clipboard.writeText(input.value);
                } catch {
                    input.select();
                    document.execCommand('copy');
                }
                showToast('Link copied!', 'success');
            };
        }
    });
};

// ==================== SYNC COMPLETED — LIGHTWEIGHT UI REFRESH ====================
document.addEventListener('sync-completed', async () => {
    console.log('[SyncEngine] Remote changes detected, refreshing UI...');
    await renderNoteChips();
    // Reload active note content in case the remote version changed
    await loadActiveNote();
});

// ==================== ONLINE / OFFLINE CONNECTIVITY ====================
window.addEventListener('online', () => {
    showToast('Back online. Syncing...', 'success');
    SyncEngine.pullDeltaSync();
    SyncEngine.startBackgroundSync(30000);
});

window.addEventListener('offline', () => {
    showToast('You are offline. Changes will sync when reconnected.', 'error');
    SyncEngine.stopBackgroundSync();
});

// ==================== CONFLICT RESOLUTION ====================

// Generic repo-level conflict (SHA mismatch without a specific note)
document.addEventListener('conflict-detected', async () => {
    modalManager.openModal('conflict-resolution', {
        title: '<i class="fas fa-exclamation-triangle" style="color:var(--color-yellow)"></i> Sync Conflict Detected',
        content: `
                <div style="text-align:center; padding: 20px 0;">
                    <p>Your local changes conflict with the remote repository.</p>
                    <p><strong>How would you like to resolve this?</strong></p>
                </div>
            `,
        actions: [
            { text: '<i class="fas fa-times"></i> Cancel', class: 'secondary' },
            {
                text: '<i class="fas fa-upload"></i> Force Push Local',
                class: 'primary',
                onClick: async () => {
                    const latestSha = await GitHubAPI.getLatestCommit();
                    await DBStore.setMeta('lastCommitSha', latestSha);
                    SyncEngine.pushSyncQueue();
                }
            },
            {
                text: '<i class="fas fa-download"></i> Discard Local (Pull remote)',
                class: 'delete',
                onClick: async () => {
                    await DBStore.clearSyncQueue();
                    await DBStore.setMeta('lastCommitSha', '');
                    SyncEngine.pullDeltaSync();
                }
            }
        ]
    });
});

// Note-level conflict (specific note content diverged)
document.addEventListener('note-conflict-detected', async (e) => {
    const { noteId, localContent, remoteContent, title } = e.detail;

    const truncate = (str, n = 300) => str.length > n ? str.slice(0, n) + '...' : str;

    modalManager.openModal('note-conflict', {
        title: `<i class="fas fa-code-branch" style="color:var(--color-yellow)"></i> Note Conflict: ${escapeHtml(title)}`,
        content: `
                <div style="padding: 8px 0;">
                    <p style="margin-bottom:12px;">This note was edited both locally and remotely. Choose how to resolve:</p>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                        <div>
                            <div style="font-weight:600; margin-bottom:6px;"><i class="fas fa-laptop"></i> Your Version (Local)</div>
                            <pre style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:8px; padding:10px; font-size:12px; white-space:pre-wrap; max-height:160px; overflow-y:auto;">${escapeHtml(truncate(localContent))}</pre>
                        </div>
                        <div>
                            <div style="font-weight:600; margin-bottom:6px;"><i class="fas fa-cloud"></i> Remote Version (GitHub)</div>
                            <pre style="background:var(--color-surface); border:1px solid var(--color-border); border-radius:8px; padding:10px; font-size:12px; white-space:pre-wrap; max-height:160px; overflow-y:auto;">${escapeHtml(truncate(remoteContent))}</pre>
                        </div>
                    </div>
                </div>
            `,
        actions: [
            {
                text: '<i class="fas fa-laptop"></i> Keep My Version',
                class: 'primary',
                onClick: async () => {
                    await ConflictResolver.resolveKeepLocal(noteId);
                    showToast('Your version kept and pushed to GitHub.', 'success');
                }
            },
            {
                text: '<i class="fas fa-cloud-download-alt"></i> Use Remote Version',
                class: 'secondary',
                onClick: async () => {
                    await ConflictResolver.resolveKeepRemote(noteId);
                    showToast('Remote version loaded.', 'success');
                }
            },
            {
                text: '<i class="fas fa-code-merge"></i> Auto-Merge',
                class: 'secondary',
                onClick: async () => {
                    await ConflictResolver.resolveAutoMerge(noteId);
                    showToast('Merged versions saved.', 'success');
                }
            }
        ]
    });
});

// Reload note after conflict resolution
document.addEventListener('note-resolved', async (e) => {
    const { noteId } = e.detail;
    if (activeNoteId === noteId) {
        await loadActiveNote();
    }
    await renderNoteChips();
});

// ==================== PRODUCTION SAFETY HANDLERS ====================

// IndexedDB failure recovery
document.addEventListener('db-error', (e) => {
    const reason = e.detail?.reason || 'unknown';
    console.error('[App] IndexedDB error:', reason);

    modalManager.openModal('db-recovery', {
        title: '<i class="fas fa-database" style="color:var(--color-yellow)"></i> Storage Error',
        content: `
            <div style="padding: 12px 0;">
                <p>The local database encountered an error (<code>${escapeHtml(reason)}</code>).</p>
                <p style="margin-top: 8px;">You can clear the local cache and re-sync all notes from GitHub, or reload to retry.</p>
            </div>
        `,
        actions: [
            {
                text: '<i class="fas fa-sync"></i> Reload & Retry',
                class: 'secondary',
                onClick: () => window.location.reload()
            },
            {
                text: '<i class="fas fa-trash"></i> Clear Cache & Re-sync',
                class: 'delete',
                onClick: async () => {
                    await DBStore.clearAllLocalData();
                    window.location.reload();
                }
            }
        ]
    });
});

// Offline queue task permanently failed (exceeded max retries)
document.addEventListener('queue-task-failed', (e) => {
    const { task } = e.detail;
    const label = task?.payload?.path || task?.type || 'unknown operation';
    console.error('[App] Queued task permanently failed:', label);
    showToast(`Sync failed after retries: ${label}. Changes were not saved to GitHub.`, 'error');
});



// ==================== EXPORT LOGIC ====================

exportBtn.onclick = async () => {
    if (!activeNoteId) return;
    const note = await DBStore.getAggregatedNoteById(activeNoteId);
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
        // Use MarkdownEngine to render high-quality HTML for the print view
        const htmlContent = MarkdownEngine.render(content);
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
                input.oninput = async () => {
                    const query = input.value.trim().toLowerCase();
                    if (!query) {
                        resultsDiv.innerHTML = '<div class="search-placeholder">Start typing to search...</div>';
                        return;
                    }
                    const allNotes = await DBStore.getAggregatedNotes();
                    const results = allNotes.filter(n => n.title.toLowerCase().includes(query) || (n.content && n.content.toLowerCase().includes(query)));
                    if (results.length === 0) {
                        resultsDiv.innerHTML = '<div class="search-placeholder">No notes found</div>';
                        return;
                    }
                    resultsDiv.innerHTML = '';
                    const folders = await DBStore.getFoldersArray();
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

noteChips.oncontextmenu = async (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    e.preventDefault();
    window.contextMenuNoteId = chip.dataset.noteId;
    const note = await DBStore.getAggregatedNoteById(window.contextMenuNoteId);
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

    // Initialize UI early
    EditorUI.init();

    const currentUser = sessionStorage.getItem('currentUser');
    const loginTime = sessionStorage.getItem('loginTime');

    if (!currentUser || !loginTime || Date.now() - parseInt(loginTime) > 2 * 60 * 60 * 1000) {
        console.warn("No valid session found, redirecting to login...");
        sessionStorage.clear();
        window.location.replace('/login.html');
        return;
    }

    await fetchInitialData();

    if (currentUser) {
        const user = JSON.parse(currentUser);
        const nameEl = document.getElementById('profileName');
        const emailEl = document.getElementById('profileEmail');
        if (nameEl) nameEl.textContent = user.username || user.email.split('@')[0];
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
    const userData = sessionStorage.getItem('currentUser');
    let name = 'Guest User';
    let email = 'guest@vellum.com';

    if (userData) {
        const user = JSON.parse(userData);
        name = user.username || user.email.split('@')[0];
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
                    sessionStorage.clear();
                    window.location.href = '/login.html';
                };
            }
        }
    });
};
