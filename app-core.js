// ========================================
// mindJournal - CORE LOGIC (Rebuilt for New Schema)
// ========================================

// --- SUPABASE CONFIG ---
const supabase = window.supabaseClient;

if (!supabase) {
    console.error('Supabase client not initialized! Check config.js.');
    throw new Error('Supabase client missing');
}

// --- GLOBAL STATE ---
let notes = [];
let folders = [];
let activeNoteId = null;
let activeFolderId = null;
let currentUser = null;
let userSettings = { theme: 'light', editor_font: 'Fredoka', editor_font_size: 16 };

// --- DOM ELEMENTS ---
const elements = {
    writingCanvas: document.getElementById('writingCanvas'),
    noteChips: document.getElementById('noteChips'),
    folderList: document.getElementById('folderList'),
    formattingIndicator: document.getElementById('formattingIndicator'),
    // Modals
    newNoteModal: document.getElementById('newNoteModal'),
    manageFoldersModal: document.getElementById('manageFoldersModal'),
    // Profile
    profileBtn: document.getElementById('profileBtn'),
    userAvatar: document.getElementById('userAvatar'),
    profileModal: document.getElementById('profileModal'),
    // Inputs
    newNoteName: document.getElementById('newNoteName'),
    newFolderName: document.getElementById('newFolderName'),
    // Buttons
    addNoteBtn: document.getElementById('addNoteBtn'),
    manageFoldersBtn: document.getElementById('manageFoldersBtn'),
    deleteBtn: document.getElementById('deleteBtn'),
    pinBtn: document.getElementById('pinBtn'),
    logoutBtn: document.getElementById('modalLogoutBtn'),
};

// --- INIT ---
// Exposed to router.js
window.initDashboard = async function() {
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
        currentUser = data.session.user;
        await loadInitialData();
        setupEventListeners();
        updateProfileUI();
        applySettings();
    }
};

// --- DATA LOADING ---
async function loadInitialData() {
    try {
        // 1. Load Settings
        const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', currentUser.id).single();
        if (settings) userSettings = settings;

        // 2. Load Folders
        const { data: foldersData } = await supabase.from('folders').select('*').order('created_at', { ascending: true });
        folders = foldersData || [];

        // Ensure default folder exists in UI state if DB empty (trigger usually handles it)
        // If trigger hasn't fired yet or failed, we might need to fetch again or wait.
        // For now, assume it's there.
        if (folders.length > 0) {
            // Find "General" folder if possible, else first
            const general = folders.find(f => f.name === 'General');
            activeFolderId = general ? general.id : folders[0].id;
        } else {
            activeFolderId = null;
        }

        // 3. Load Notes
        const { data: notesData } = await supabase.from('notes').select('*').order('updated_at', { ascending: false });
        notes = notesData || [];

        renderFolders();
        renderNotes();

        if (notes.length > 0) {
            // Select first note of active folder
            const folderNotes = getNotesInFolder(activeFolderId);
            if (folderNotes.length > 0) {
                setActiveNote(folderNotes[0].id);
            } else {
                setActiveNote(null);
            }
        } else {
            setActiveNote(null);
        }

    } catch (err) {
        console.error('Data load error:', err);
        showToast('Error loading data', 'error');
    }
}

// --- CORE OPERATIONS ---

// 1. Folders
async function createFolder(name) {
    if (!name.trim()) return;
    const { data, error } = await supabase.from('folders').insert([{ user_id: currentUser.id, name: name }]).select().single();
    if (error) { showToast('Error creating folder', 'error'); return; }

    folders.push(data);
    renderFolders();
    showToast('Folder created');
    elements.newFolderName.value = '';

    // Switch to it?
    setActiveFolder(data.id);
}

async function deleteFolder(folderId) {
    const { error } = await supabase.from('folders').delete().eq('id', folderId);
    if (error) { showToast('Error deleting folder', 'error'); return; }

    folders = folders.filter(f => f.id !== folderId);
    if (activeFolderId === folderId) {
        activeFolderId = folders[0]?.id || null;
    }
    renderFolders();
    renderNotes(); // Refresh to hide orphans or show default
    showToast('Folder deleted');
}

// 2. Notes
async function createNote(title, folderId) {
    if (!title.trim()) return;
    const newNote = {
        user_id: currentUser.id,
        folder_id: folderId,
        title: title,
        content: { html: '' } // JSONB structure
    };

    const { data, error } = await supabase.from('notes').insert([newNote]).select().single();
    if (error) { showToast('Error creating note', 'error'); return; }

    notes.unshift(data);
    renderNotes();
    setActiveNote(data.id);
    showToast('Note created');

    // Close modal if open
    elements.newNoteModal.classList.remove('show');
}

async function deleteNote(noteId) {
    const { error } = await supabase.from('notes').delete().eq('id', noteId);
    if (error) { showToast('Error deleting note', 'error'); return; }

    notes = notes.filter(n => n.id !== noteId);
    if (activeNoteId === noteId) {
        const remaining = getNotesInFolder(activeFolderId);
        setActiveNote(remaining.length > 0 ? remaining[0].id : null);
    } else {
        renderNotes();
    }
    showToast('Note deleted');
}

async function saveCurrentNote() {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;

    const contentHtml = elements.writingCanvas.innerHTML;
    note.content = { html: contentHtml }; // Optimistic update

    const { error } = await supabase.from('notes').update({
        content: { html: contentHtml },
        updated_at: new Date()
    }).eq('id', activeNoteId);

    if (error) console.error('Auto-save failed', error);
}

// 3. Profile & Settings
function updateProfileUI() {
    const initial = (currentUser.user_metadata?.full_name?.[0] || currentUser.email?.[0] || 'U').toUpperCase();
    if (elements.userAvatar) elements.userAvatar.textContent = initial;

    // Modal Data
    const modalAvatar = document.getElementById('modalAvatar');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileDate = document.getElementById('profileDate');

    if (modalAvatar) modalAvatar.textContent = initial;
    if (profileName) profileName.textContent = currentUser.user_metadata?.full_name || 'User';
    if (profileEmail) profileEmail.textContent = currentUser.email;
    if (profileDate) profileDate.textContent = new Date(currentUser.created_at).toLocaleDateString();
}

function applySettings() {
    document.documentElement.setAttribute('data-theme', userSettings.theme);
    document.documentElement.style.setProperty('--editor-font', userSettings.editor_font);
    document.documentElement.style.setProperty('--editor-font-size', `${userSettings.editor_font_size}px`);
    // Update UI toggles if they exist
}

// --- HELPER FUNCTIONS ---
function getNotesInFolder(folderId) {
    if (!folderId) return [];
    return notes.filter(n => n.folder_id === folderId);
}

function setActiveFolder(id) {
    activeFolderId = id;
    renderFolders();
    renderNotes();

    const folderNotes = getNotesInFolder(id);
    setActiveNote(folderNotes.length > 0 ? folderNotes[0].id : null);
}

function setActiveNote(id) {
    // Save previous
    if (activeNoteId && activeNoteId !== id) saveCurrentNote();

    activeNoteId = id;
    const note = notes.find(n => n.id === id);

    renderNotes(); // Update active state in UI
    updatePinButtonState(); // Update pin button UI

    if (note) {
        // Handle JSONB content
        // If content is object with html, use it. If string (legacy), use it.
        const html = typeof note.content === 'object' && note.content?.html ? note.content.html : (note.content || '');
        elements.writingCanvas.innerHTML = html;
        elements.writingCanvas.contentEditable = 'true';
        elements.writingCanvas.classList.remove('empty-state');
    } else {
        elements.writingCanvas.innerHTML = '<div class="empty-state-msg">Select or create a note to start writing.</div>';
        elements.writingCanvas.contentEditable = 'false';
        elements.writingCanvas.classList.add('empty-state');
    }
}

function updatePinButtonState() {
    if (!activeNoteId) {
        elements.pinBtn.classList.remove('pinned');
        return;
    }
    const note = notes.find(n => n.id === activeNoteId);
    if (note && note.is_favorite) {
        elements.pinBtn.classList.add('pinned');
    } else {
        elements.pinBtn.classList.remove('pinned');
    }
}

function showToast(msg, type = 'info') {
    if (!elements.formattingIndicator) return;
    elements.formattingIndicator.textContent = msg;
    elements.formattingIndicator.className = `formatting-indicator show ${type}`;
    setTimeout(() => {
        elements.formattingIndicator.className = 'formatting-indicator';
    }, 3000);
}

// --- RENDERERS ---
function renderFolders() {
    if (!elements.folderList) return;
    elements.folderList.innerHTML = '';

    folders.forEach(folder => {
        const div = document.createElement('div');
        div.className = `folder-item ${folder.id === activeFolderId ? 'active' : ''}`;
        div.textContent = folder.name;
        div.onclick = () => {
            setActiveFolder(folder.id);
            elements.manageFoldersModal.classList.remove('show');
        };
        elements.folderList.appendChild(div);
    });

    // Update folder dropdowns in modals
    const select = document.getElementById('folderSelectOptions');
    if (select) {
        select.innerHTML = '';
        folders.forEach(folder => {
            const opt = document.createElement('div');
            opt.className = 'select-option';
            opt.textContent = folder.name;
            opt.onclick = () => {
                document.getElementById('selectedFolderName').textContent = folder.name;
                document.getElementById('folderSelectWrapper').dataset.value = folder.id;
                select.parentElement.classList.remove('active');
            };
            select.appendChild(opt);
        });
    }
}

function renderNotes() {
    if (!elements.noteChips) return;
    elements.noteChips.innerHTML = '';
    const currentNotes = getNotesInFolder(activeFolderId);

    // Sort: Pinned (is_favorite) first, then updated_at
    currentNotes.sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) return b.is_favorite ? 1 : -1;
        return new Date(b.updated_at) - new Date(a.updated_at);
    });

    currentNotes.forEach(note => {
        const chip = document.createElement('div');
        chip.className = `chip ${note.id === activeNoteId ? 'active' : ''}`;
        if (note.is_favorite) chip.classList.add('pinned');

        chip.dataset.noteId = note.id;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'chip-content';

        if (note.is_favorite) {
            const pinIcon = document.createElement('i');
            pinIcon.className = 'fas fa-thumbtack gap';
            contentDiv.appendChild(pinIcon);
        }

        const textSpan = document.createElement('span');
        textSpan.textContent = note.title || 'Untitled';
        contentDiv.appendChild(textSpan);

        chip.appendChild(contentDiv);

        chip.onclick = () => setActiveNote(note.id);

        // Context Menu Trigger
        chip.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            window.contextMenuNoteId = note.id;

            // Update Pin/Unpin text
            const pinItem = document.getElementById('ctxPin');
            if (pinItem) {
                pinItem.innerHTML = note.is_favorite ?
                    '<i class="fas fa-thumbtack-slash"></i> Unpin Note' :
                    '<i class="fas fa-thumbtack"></i> Pin Note';
            }

            const menu = document.getElementById('noteContextMenu');
            menu.style.left = `${e.pageX}px`;
            menu.style.top = `${e.pageY}px`;
            menu.classList.add('show');
        });

        elements.noteChips.appendChild(chip);
    });
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Typing Debounce
    let timeout;
    elements.writingCanvas.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(saveCurrentNote, 1000);
    });

    // New Note
    elements.addNoteBtn?.addEventListener('click', () => {
        elements.newNoteModal.classList.add('show');
    });

    document.getElementById('createNewNote')?.addEventListener('click', () => {
        const name = elements.newNoteName.value;
        // Get selected folder ID or default to active
        const selectedId = document.getElementById('folderSelectWrapper').dataset.value || activeFolderId;
        createNote(name, selectedId);
    });

    // Profile Modal
    elements.profileBtn?.addEventListener('click', () => {
        if (!activeNoteId) return;
        elements.profileModal.classList.add('show');
    });

    elements.pinBtn?.addEventListener('click', async () => {
        if (!activeNoteId) return;
        const note = notes.find(n => n.id === activeNoteId);
        if (note) {
            const newStatus = !note.is_favorite;
            const { error } = await supabase.from('notes').update({ is_favorite: newStatus }).eq('id', activeNoteId);
            if (!error) {
                note.is_favorite = newStatus;
                renderNotes();
                updatePinButtonState();
                showToast(newStatus ? 'Note pinned' : 'Note unpinned');
            }
        }
    });

    document.getElementById('ctxPin')?.addEventListener('click', async () => {
        if (!window.contextMenuNoteId) return;
        const note = notes.find(n => n.id === window.contextMenuNoteId);
        if (note) {
            const newStatus = !note.is_favorite;
            const { error } = await supabase.from('notes').update({ is_favorite: newStatus }).eq('id', window.contextMenuNoteId);
            if (!error) {
                note.is_favorite = newStatus;
                renderNotes();
                if (activeNoteId === window.contextMenuNoteId) updatePinButtonState();
                showToast(newStatus ? 'Note pinned' : 'Note unpinned');
            }
        }
        document.getElementById('noteContextMenu').classList.remove('show');
    });
    document.getElementById('closeProfileModal')?.addEventListener('click', () => {
        elements.profileModal.classList.remove('show');
    });

    elements.logoutBtn?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
    });

    // Search Logic
    elements.searchBtn?.addEventListener('click', () => {
        document.getElementById('searchModal').classList.add('show');
        setTimeout(() => document.getElementById('searchInput').focus(), 100);
    });

    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const resultsContainer = document.getElementById('searchResults');

        if (!query) {
            resultsContainer.innerHTML = '<div class="search-placeholder">Start typing to search...</div>';
            return;
        }

        const matches = notes.filter(n => {
            const titleMatch = (n.title || '').toLowerCase().includes(query);
            const contentHtml = typeof n.content === 'object' ? (n.content?.html || '') : (n.content || '');
            const contentText = contentHtml.replace(/<[^>]*>/g, '').toLowerCase();
            const contentMatch = contentText.includes(query);
            return titleMatch || contentMatch;
        });

        resultsContainer.innerHTML = '';
        if (matches.length === 0) {
            resultsContainer.innerHTML = '<div class="search-placeholder">No notes found.</div>';
            return;
        }

        matches.forEach(note => {
            const folder = folders.find(f => f.id === note.folder_id) || { name: 'Unknown' };
            const div = document.createElement('div');
            div.className = 'search-result-card';
            div.innerHTML = `
                <div class="search-result-name">${escapeHtml(note.title || 'Untitled')}</div>
                <div class="search-result-folder">
                    <i class="fas fa-folder"></i> ${escapeHtml(folder.name)}
                </div>
            `;
            div.onclick = () => {
                setActiveFolder(note.folder_id);
                setActiveNote(note.id);
                document.getElementById('searchModal').classList.remove('show');
            };
            resultsContainer.appendChild(div);
        });
    });

    document.getElementById('closeSearchModal')?.addEventListener('click', () => {
        document.getElementById('searchModal').classList.remove('show');
    });

    // Folders
    elements.manageFoldersBtn?.addEventListener('click', () => {
        elements.manageFoldersModal.classList.add('show');
    });
    document.getElementById('createFolderBtn')?.addEventListener('click', () => {
        createFolder(elements.newFolderName.value);
    });
    document.getElementById('closeFoldersModal')?.addEventListener('click', () => {
        elements.manageFoldersModal.classList.remove('show');
    });

    // Global Clicks (Close menus)
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu')) {
            document.querySelectorAll('.context-menu').forEach(m => m.classList.remove('show'));
        }
    });

    // Export Logic
    document.getElementById('exportBtn')?.addEventListener('click', () => {
        if (!activeNoteId) { showToast('Open a note to export', 'error'); return; }
        const note = notes.find(n => n.id === activeNoteId);
        document.getElementById('exportFileName').value = (note?.title || 'note').replace(/[^\w\s]/gi, '');
        document.getElementById('exportModal').classList.add('show');
    });

    document.getElementById('closeExportModal')?.addEventListener('click', () => {
        document.getElementById('exportModal').classList.remove('show');
    });

    // Export Options Selection
    document.querySelectorAll('.export-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.export-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            document.getElementById('exportConfirmBtn').disabled = false;
            // Store selected format
            window.selectedExportFormat = card.dataset.format;
        });
    });

    document.getElementById('exportConfirmBtn')?.addEventListener('click', async () => {
        const format = window.selectedExportFormat;
        const fileName = document.getElementById('exportFileName').value || 'note';
        const note = notes.find(n => n.id === activeNoteId);
        if (!note) return;

        const contentHtml = typeof note.content === 'object' ? (note.content?.html || '') : (note.content || '');

        if (format === 'pdf') {
            localStorage.setItem('mindjournal_print_content', contentHtml);
            localStorage.setItem('mindjournal_print_title', fileName);
            window.open('/print', '_blank');
        } else if (format === 'markdown') {
            const md = convertToMarkdown(contentHtml); // Need this helper
            downloadFile(fileName, md, 'md');
        } else if (format === 'text') {
            const txt = stripHtml(contentHtml); // Need this helper
            downloadFile(fileName, txt, 'txt');
        }
        document.getElementById('exportModal').classList.remove('show');
    });
}

function downloadFile(name, content, type) {
    const mime = type === 'md' ? 'text/markdown' : 'text/plain';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.${type}`;
    a.click();
    URL.revokeObjectURL(url);
}

function stripHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

function convertToMarkdown(html) {
    // Basic conversion for compatibility
    let text = html
        .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
        .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
        .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
        .replace(/<ul>(.*?)<\/ul>/gs, '$1\n')
        .replace(/<li>(.*?)<\/li>/g, '* $1\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '');
    return text.trim();
}

// Helper HTML escaper
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[&<>"]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

// Expose internal functions for Editor shortcuts
window.saveCurrentNote = saveCurrentNote;
window.pushToUndo = () => { /* Placeholder or implement strict undo stack here if needed */ };
window.showFormattingIndicator = showToast;
