// ========================================
// mindJournal - CORE LOGIC (Supabase Migration)
// ========================================

// --- SUPABASE CONFIG ---
// Use the global client, but don't redeclare 'supabase' if it exists in global scope
const supabase = window.supabaseClient;

if (!supabase) {
    console.error('Supabase client not initialized! Check config.js.');
    throw new Error('Supabase client missing');
}

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
// const logoutBtn = document.getElementById('logoutBtn'); // Removed for Profile UI

// Modal elements
const profileModal = document.getElementById('profileModal');
const profileBtn = document.getElementById('profileBtn');
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
const THEME_KEY = 'focuspad_theme';

// --- DATA STRUCTURES ---
let notes = [];
let folders = [];
let activeNoteId = null;
let activeFolderId = null;
let currentUser = null;

// Export state
let selectedExportFormat = null;

// ESC Key Hierarchy Management
let modalStack = [];

// ==================== AUTH CHECK ====================
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        if (window.navigateTo) window.navigateTo('/login');
        else window.location.href = '/login';
        return;
    }
    currentUser = session.user;

    // Check Profile Status
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', currentUser.id)
        .single();

    if (error || profile.status !== 'active') {
        await supabase.auth.signOut();
        if (window.navigateTo) window.navigateTo('/login');
        else window.location.href = '/login';
    } else {
        // Init Profile UI if active
        updateProfileUI();
    }
}

// Profile Logic
function updateProfileUI() {
    if (!currentUser) return;
    const initial = (currentUser.user_metadata?.full_name?.[0] || currentUser.email?.[0] || 'U').toUpperCase();
    const avatar = document.getElementById('userAvatar');
    if (avatar) avatar.textContent = initial;
}

if (profileBtn) {
    profileBtn.addEventListener('click', () => {
        if (!currentUser) return;

        // Populate Modal
        document.getElementById('modalAvatar').textContent = document.getElementById('userAvatar').textContent;
        document.getElementById('profileName').textContent = currentUser.user_metadata?.full_name || 'User';
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profileDate').textContent = new Date(currentUser.created_at).toLocaleDateString();

        // Show Modal
        profileModal.classList.add('show');
        pushToModalStack(profileModal);
    });
}

document.getElementById('closeProfileModal')?.addEventListener('click', () => {
    profileModal.classList.remove('show');
});

document.getElementById('modalLogoutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
});

// ==================== UNDO / REDO (Text Only for Supabase) ====================
let undoStack = [];
let undoIndex = -1;
const MAX_UNDO = 50;

// We only track CONTENT changes for undo/redo in this migration to avoid DB desync.
// Structural changes (create/delete) are direct DB operations.

function pushToUndo() {
    // Only snapshot content of the active note
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;

    if (undoIndex < undoStack.length - 1) {
        undoStack = undoStack.slice(0, undoIndex + 1);
    }
    const snapshot = {
        noteId: activeNoteId,
        content: note.content
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

    // Only restore if we are on the same note (simplification)
    if (state.noteId === activeNoteId) {
        const note = notes.find(n => n.id === activeNoteId);
        if (note) {
            note.content = state.content;
            writingCanvas.innerHTML = note.content;
            // Trigger save
            saveCurrentNote();
        }
    }
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

// ==================== DATA OPERATIONS (SUPABASE) ====================

async function loadData() {
    // Fetch Folders
    const { data: foldersData, error: folderError } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: true });

    if (folderError) { console.error(folderError); return; }

    folders = foldersData;

    // Default folder check
    if (folders.length === 0) {
        await createFolder('General');
        return; // createFolder calls loadData
    }

    // Set active folder
    if (!activeFolderId || !folders.find(f => f.id === activeFolderId)) {
        activeFolderId = folders[0].id;
    }

    // Fetch Notes
    const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });

    if (notesError) { console.error(notesError); return; }

    notes = notesData; // Notes now have is_pinned if added to DB

    // Set Active Note
    const folderNotes = getNotesInFolder(activeFolderId);
    if (!activeNoteId || !notes.find(n => n.id === activeNoteId)) {
        activeNoteId = folderNotes.length > 0 ? folderNotes[0].id : null;
    }

    renderFolderList();
    renderNoteChips();
    loadActiveNote();
    pushToUndo(); // Initial undo state
}

async function saveCurrentNote() {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        note.content = writingCanvas.innerHTML;
        // DB Update
        const { error } = await supabase
            .from('notes')
            .update({
                content: note.content,
                updated_at: new Date()
            })
            .eq('id', activeNoteId);

        if (error) console.error('Save failed', error);
    }
}

// Debounce for typing
let saveTimeout;
writingCanvas.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveCurrentNote();
        pushToUndo(); // Snapshot logic
    }, 1000);
});

// --- NOTE OPERATIONS ---
function getNotesInFolder(folderId) {
    return notes.filter(n => n.folder_id === folderId);
}

async function createNote(name, folderId) {
    const { data, error } = await supabase
        .from('notes')
        .insert([{
            title: name,
            folder_id: folderId,
            content: '',
            user_id: currentUser.id,
            is_pinned: false // Ensure DB has this column
        }])
        .select()
        .single();

    if (error) {
        showFormattingIndicator('Error creating note', 'error');
        console.error(error);
        return;
    }

    notes.unshift(data);
    activeNoteId = data.id;
    renderNoteChips();
    loadActiveNote();
    showFormattingIndicator('Note created!');
}

async function deleteNote(noteId) {
    const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

    if (error) {
        showFormattingIndicator('Error deleting note', 'error');
        return;
    }

    const index = notes.findIndex(n => n.id === noteId);
    if (index > -1) notes.splice(index, 1);

    // Switch note logic
    const folderNotes = getNotesInFolder(activeFolderId);
    if (activeNoteId === noteId) {
        activeNoteId = folderNotes.length > 0 ? folderNotes[0].id : null;
    }

    renderNoteChips();
    loadActiveNote();
    showFormattingIndicator('Note deleted!');
}

async function renameNote(noteId, newName) {
    const { error } = await supabase
        .from('notes')
        .update({ title: newName })
        .eq('id', noteId);

    if (error) {
        showFormattingIndicator('Error renaming', 'error');
        return;
    }

    const note = notes.find(n => n.id === noteId);
    if (note) note.title = newName;
    renderNoteChips();
    showFormattingIndicator('Note renamed');
}

function switchNote(noteId) {
    if (activeNoteId) saveCurrentNote(); // Force save before switch
    activeNoteId = noteId;
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
            updatePinButton(); // Reset

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
            loadActiveNote();
        }
    }
}

// --- PIN BUTTON ---
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

async function togglePinNote() {
    if (!activeNoteId) {
        showFormattingIndicator('No active note to pin');
        return;
    }

    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        const newStatus = !note.is_pinned;
        // DB Update
        const { error } = await supabase
            .from('notes')
            .update({ is_pinned: newStatus })
            .eq('id', activeNoteId);

        if (error) {
            showFormattingIndicator('Error pinning note', 'error');
            return;
        }

        note.is_pinned = newStatus;
        updatePinButton();
        renderNoteChips(); // Re-sort
        showFormattingIndicator(note.is_pinned ? 'Note pinned' : 'Note unpinned');
    }
}
pinBtn.addEventListener('click', togglePinNote);

// --- FOLDER OPERATIONS ---
async function createFolder(name) {
    const { data, error } = await supabase
        .from('folders')
        .insert([{ name: name, user_id: currentUser.id }])
        .select()
        .single();

    if (error) {
        showFormattingIndicator('Error creating folder', 'error');
        return;
    }

    folders.push(data);
    loadData(); // Re-fetch to sort
    showFormattingIndicator('Folder created!');
}

async function deleteFolder(folderId) {
    const folder = folders.find(f => f.id === folderId);
    // UI Confirmation (reusing modal)
    const modal = document.getElementById('confirmFolderDeleteModal');
    const titleEl = document.getElementById('folderDeleteTitle');
    const messageEl = document.getElementById('folderDeleteMessage');
    titleEl.textContent = `Delete "${folder.name}"?`;

    // Notes logic: If DB says ON DELETE SET NULL, notes go to null folder.
    // We should probably delete notes OR move them.
    // Migration: We will allow DB to cascade or set null.
    // Prompt check: "folder_id UUID REFERENCES folders(id) ON DELETE SET NULL"
    // So they become orphans.

    messageEl.textContent = 'Notes in this folder will be unorganized.';

    modal.classList.add('show');
    pushToModalStack(modal);
    modal.dataset.pendingFolderId = folderId;
}

// Actual delete executed by modal button
confirmFolderDeleteBtn.addEventListener('click', async () => {
    const folderId = confirmFolderDeleteModal.dataset.pendingFolderId;
    if (folderId) {
        const { error } = await supabase
            .from('folders')
            .delete()
            .eq('id', folderId);

        if (error) {
            showFormattingIndicator('Error deleting folder', 'error');
        } else {
            showFormattingIndicator('Folder deleted!');
            // Local cleanup
            const index = folders.findIndex(f => f.id === folderId);
            if (index > -1) folders.splice(index, 1);
            if (activeFolderId === folderId) activeFolderId = folders[0]?.id || null;

            // Reload to handle orphaned notes or UI updates
            loadData();
        }
    }
    confirmFolderDeleteModal.classList.remove('show');
    const index = modalStack.indexOf(confirmFolderDeleteModal);
    if (index > -1) modalStack.splice(index, 1);
    delete confirmFolderDeleteModal.dataset.pendingFolderId;
});

function setActiveFolder(folderId) {
    activeFolderId = folderId;
    renderNoteChips();
    renderFolderList();

    const folderNotes = getNotesInFolder(folderId);
    activeNoteId = folderNotes.length > 0 ? folderNotes[0].id : null;
    loadActiveNote();
}

// --- MOVE NOTE ---
async function moveNoteToFolder(noteId, targetFolderId) {
    const { error } = await supabase
        .from('notes')
        .update({ folder_id: targetFolderId })
        .eq('id', noteId);

    if (error) {
        showFormattingIndicator('Error moving note', 'error');
        return;
    }

    const note = notes.find(n => n.id === noteId);
    if (note) note.folder_id = targetFolderId;

    // Refresh view if needed
    if (activeNoteId === noteId) {
        // We moved the active note.
        // Stay on it? Or switch?
        // Logic: If we are viewing the source folder, the note disappears.
        // We should switch to another note in the source folder or empty.
        const sourceFolderId = activeFolderId; // Assuming we are viewing source
        // Actually, logic is tricky. Let's just reload.
        loadData();
    } else {
        renderNoteChips();
    }
    showFormattingIndicator('Note moved', 'success');
}


// --- SHARE / PUBLIC ---
async function togglePublicShare(noteId, isPublic) {
    const updates = { is_public: isPublic };
    if (isPublic) {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24);
        updates.public_expires_at = expiry.toISOString();
    } else {
        updates.public_expires_at = null;
    }

    const { error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', noteId);

    if (error) {
        showFormattingIndicator('Error updating share settings', 'error');
        return;
    }

    const note = notes.find(n => n.id === noteId);
    if (note) {
        note.is_public = isPublic;
        note.public_expires_at = updates.public_expires_at;
    }
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

    // Sort: Pinned first, then updated_at
    folderNotes.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
        return new Date(b.updated_at) - new Date(a.updated_at);
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
        textSpan.textContent = note.title; // DB column is title
        chipContent.appendChild(textSpan);
        chip.appendChild(chipContent);

        // Menu Btn
        const menuBtn = document.createElement('div');
        menuBtn.className = 'chip-menu-btn';
        menuBtn.innerHTML = '';

        chip.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            window.contextMenuNoteId = note.id;

            // Update context menu pin text
            if (note.is_pinned) {
                ctxPin.innerHTML = '<i class="fas fa-thumbtack-slash"></i> Unpin Note';
            } else {
                ctxPin.innerHTML = '<i class="fas fa-thumbtack"></i> Pin Note';
            }

            const rect = chip.getBoundingClientRect();
            noteContextMenu.style.left = `${e.pageX}px`;
            noteContextMenu.style.top = `${e.pageY}px`;
            noteContextMenu.classList.add('show');
        });

        // Also attach to menuBtn click if needed, or rely on context menu
        menuBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            window.contextMenuNoteId = note.id;
             // Update context menu pin text
             if (note.is_pinned) {
                ctxPin.innerHTML = '<i class="fas fa-thumbtack-slash"></i> Unpin Note';
            } else {
                ctxPin.innerHTML = '<i class="fas fa-thumbtack"></i> Pin Note';
            }
            noteContextMenu.style.left = `${e.pageX}px`;
            noteContextMenu.style.top = `${e.pageY}px`;
            noteContextMenu.classList.add('show');
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

        // Allow deleting all folders for now (no default folder constraint in DB)
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

function updateFolderDropdown() {
    const optionsContainer = document.getElementById('folderSelectOptions');
    const selectedNameSpan = document.getElementById('selectedFolderName');
    const wrapper = document.getElementById('folderSelectWrapper');
    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';

    folders.forEach(folder => {
        const option = document.createElement('div');
        option.className = 'select-option';
        option.textContent = folder.name;
        option.dataset.folderId = folder.id;

        option.addEventListener('click', () => {
            selectedNameSpan.textContent = folder.name;
            wrapper.classList.remove('active');
            // Store selected ID somewhere if needed for new note creation?
            // The createNote function uses 'activeFolderId' or we need to update it.
            // But createNote is called from modal, we should probably update activeFolderId OR
            // better: make createNote accept a folderId and the modal provides it.
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
}

function getSelectedFolderId() {
    // Basic implementation: if a dropdown option was clicked, we might need to track it.
    // For now, default to activeFolderId if no explicit selection logic is added to options.
    // The previous implementation used DOM classes.
    const selectedOption = document.querySelector('#folderSelectOptions .select-option.selected');
    return selectedOption ? selectedOption.dataset.folderId : activeFolderId;
}

// ==================== MODAL HANDLERS (Integrated) ====================

// Move Note
function openMoveModal(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    moveNoteNameSpan.textContent = `Moving: "${note.title}"`;
    window.contextMenuNoteId = noteId;

    // Populate
    moveFolderSelectOptions.innerHTML = '';
    folders.forEach(folder => {
        if (folder.id === note.folder_id) return;
        const option = document.createElement('div');
        option.className = 'select-option';
        option.textContent = folder.name;
        option.onclick = () => {
            moveSelectedFolderName.textContent = folder.name;
            confirmMoveBtn.dataset.targetId = folder.id;
            confirmMoveBtn.disabled = false;
            moveFolderSelectWrapper.classList.remove('active');
        };
        moveFolderSelectOptions.appendChild(option);
    });

    moveNoteModal.classList.add('show');
    pushToModalStack(moveNoteModal);
}

confirmMoveBtn.addEventListener('click', () => {
    const targetId = confirmMoveBtn.dataset.targetId;
    if (targetId && window.contextMenuNoteId) {
        moveNoteToFolder(window.contextMenuNoteId, targetId);
        moveNoteModal.classList.remove('show');
    }
});

// Share Modal
shareBtn.addEventListener('click', () => {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);

    if (note.is_public) {
        document.getElementById('shareToggle').classList.add('public');
        document.getElementById('shareLinkSection').classList.add('visible');
        document.getElementById('sharePrivateMsg').classList.remove('visible');
        // Use current origin and new route structure
        document.getElementById('shareLinkInput').value = `${window.location.origin}/public/${note.id}`;
    } else {
        document.getElementById('shareToggle').classList.remove('public');
        document.getElementById('shareLinkSection').classList.remove('visible');
        document.getElementById('sharePrivateMsg').classList.add('visible');
    }

    shareModal.classList.add('show');
    pushToModalStack(shareModal);
});

document.getElementById('shareToggle').addEventListener('click', () => {
    const toggle = document.getElementById('shareToggle');
    const isNowPublic = !toggle.classList.contains('public');

    if (isNowPublic) {
        toggle.classList.add('public');
        document.getElementById('shareLinkSection').classList.add('visible');
        document.getElementById('sharePrivateMsg').classList.remove('visible');
    } else {
        toggle.classList.remove('public');
        document.getElementById('shareLinkSection').classList.remove('visible');
        document.getElementById('sharePrivateMsg').classList.add('visible');
    }

    togglePublicShare(activeNoteId, isNowPublic);
});

// New Note
document.getElementById('createNewNote').addEventListener('click', () => {
    const name = document.getElementById('newNoteName').value.trim();
    if (name) {
        createNote(name, activeFolderId);
        newNoteModal.classList.remove('show');
    }
});

// Delete Confirm
confirmDeleteBtn.addEventListener('click', () => {
    if (window.contextMenuNoteId) deleteNote(window.contextMenuNoteId);
    else if (activeNoteId) deleteNote(activeNoteId);
    confirmModal.classList.remove('show');
});

// Rename
confirmRenameBtn.addEventListener('click', () => {
    const name = renameNoteInput.value.trim();
    if (name && window.contextMenuNoteId) {
        renameNote(window.contextMenuNoteId, name);
        renameNoteModal.classList.remove('show');
    }
});

// Folder Mgmt
document.getElementById('createFolderBtn').addEventListener('click', () => {
    const name = document.getElementById('newFolderName').value.trim();
    if (name) createFolder(name);
});

// --- HELPER FUNCTIONS ---
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

// --- EXPORT ---
// Export Modal
exportBtn.addEventListener('click', () => {
    if (!activeNoteId) { showFormattingIndicator('No note to export'); return; }
    const note = notes.find(n => n.id === activeNoteId);
    if (note) exportFileNameInput.value = note.title.replace(/[^\w\s]/gi, '');
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
    const content = writingCanvas.innerHTML;
    localStorage.setItem('mindjournal_print_content', content);
    localStorage.setItem('mindjournal_print_title', fileName);
    const printWindow = window.open('/print', '_blank');
    if (printWindow) {
        printWindow.focus();
        showFormattingIndicator('Opening Print Preview...', 'success');
    } else {
        showFormattingIndicator('Please allow popups to print.', 'error');
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

// --- SEARCH ---
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
        const nameMatch = note.title.toLowerCase().includes(query);
        const contentText = note.content ? note.content.replace(/<[^>]*>/g, '').toLowerCase() : '';
        const contentMatch = contentText.includes(query);
        return nameMatch || contentMatch;
    });
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
            <div class="search-result-folder">
                <i class="fas fa-folder"></i> ${escapeHtml(folder.name)}
            </div>
        `;
        card.addEventListener('click', () => {
            if (activeNoteId) saveCurrentNote();
            activeFolderId = note.folder_id;
            activeNoteId = note.id;
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

// --- INIT ---
function init() {
    loadTheme();

    // Set initial font display (fallback)
    const current = getCurrentFont();
    const fontDisplay = document.getElementById('currentFont');
    if (fontDisplay) fontDisplay.textContent = current;

    // Auth Check kicks off loadData
    checkAuth().then(() => {
        if (currentUser) loadData();
    });
}

// Expose init for SPA Router
window.initDashboard = init;

// Expose pushToUndo for editor (app-editor.js needs it)
window.pushToUndo = pushToUndo;
window.saveCurrentNote = saveCurrentNote;
window.showFormattingIndicator = showFormattingIndicator;
// Also need activeNoteId access? app-editor uses globals.
// Since app-editor.js is also global, it expects 'notes', 'activeNoteId' to be global.
// Breaking change: IIFE hides these.
// We must expose shared state or keep app-core global but remove const redeclaration.

// Modals Outside Click (Generic)
window.onclick = (e) => {
    if (e.target.classList.contains('form-modal') || e.target.classList.contains('confirm-modal')) {
        e.target.classList.remove('show');
    }
    if (noteContextMenu && !noteContextMenu.contains(e.target)) {
        noteContextMenu.classList.remove('show');
    }
};

// Ensure modal stack is respected for outside clicks if we want deep integration (optional for now, generic handler covers it)

// Modal Close Buttons
document.querySelectorAll('.form-btn.secondary, .confirm-btn.cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.form-modal, .confirm-modal');
        if (modal) modal.classList.remove('show');
    });
});

// Helper for modal stack
function pushToModalStack(modal) {
    modalStack.push(modal);
}

// ==================== FALLBACK FOR FONT FUNCTION ====================
function getCurrentFont() {
    return 'Fredoka';
}

// ==================== GLOBAL SHORTCUTS ====================

// ESC to close modals
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

// Enter key submission for forms
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

// Auto-init removed for SPA. Router calls window.initDashboard();
