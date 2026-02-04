// ========================================
// FOCUSPAD - COMPLETE NOTES APP
// ========================================

// --- ELEMENT REFERENCES ---
const sidebar = document.getElementById('sidebar');
const topBar = document.getElementById('topBar');
const workspace = document.querySelector('.workspace');
const focusBtn = document.getElementById('focusBtn');
const restoreBtn = document.getElementById('restoreBtn');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const html = document.documentElement;
const writingCanvas = document.getElementById('writingCanvas');
const fontSelectorBtn = document.getElementById('fontSelectorBtn');
const fontDropdown = document.getElementById('fontDropdown');
const currentFontSpan = document.getElementById('currentFont');
const fontOptions = document.querySelectorAll('.font-option');
const formattingIndicator = document.getElementById('formattingIndicator');

// Modal elements
const confirmModal = document.getElementById('confirmModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const newNoteModal = document.getElementById('newNoteModal');
const manageFoldersModal = document.getElementById('manageFoldersModal');

// Button elements
const exportBtn = document.getElementById('exportBtn');
const deleteBtn = document.getElementById('deleteBtn');
const bulletsBtn = document.getElementById('bulletsBtn');
const lineBreakBtn = document.getElementById('lineBreakBtn');
const chipsBtn = document.getElementById('chipsBtn');
const addNoteBtn = document.getElementById('addNoteBtn');
const manageFoldersBtn = document.getElementById('manageFoldersBtn');

// Dropdown menus
const bulletsMenu = document.getElementById('bulletsMenu');
const chipsMenu = document.getElementById('chipsMenu');

// Note chips container
const noteChips = document.getElementById('noteChips');

// --- STORAGE KEYS ---
const THEME_KEY = 'focuspad_theme';
const NOTES_KEY = 'focuspad_notes';
const FOLDERS_KEY = 'focuspad_folders';
const ACTIVE_NOTE_KEY = 'focuspad_activeNote';
const ACTIVE_FOLDER_KEY = 'focuspad_activeFolder';

// --- DATA STRUCTURES ---
let notes = [];
let folders = [];
let activeNoteId = null;
let activeFolderId = 'default';

// --- FORMATTING CONFIG ---
const formattingConfig = {
    styles: {
        'bold': 'text-bold',
        'italic': 'text-italic',
        'underline': 'text-underline',
        'strike': 'text-strike',
        'normal': 'format-reset'
    },
    alignments: {
        'left': 'text-left',
        'center': 'text-center',
        'right': 'text-right'
    },
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

// --- HELPER FUNCTIONS ---
function isValidColor(colorName) {
    const testElement = document.createElement('div');
    testElement.style.color = colorName;
    return testElement.style.color !== '';
}

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function showFormattingIndicator(message) {
    formattingIndicator.textContent = message;
    formattingIndicator.classList.add('show');
    setTimeout(() => {
        formattingIndicator.classList.remove('show');
    }, 2000);
}

// --- STORAGE FUNCTIONS ---
function saveToStorage() {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
    localStorage.setItem(ACTIVE_NOTE_KEY, activeNoteId);
    localStorage.setItem(ACTIVE_FOLDER_KEY, activeFolderId);
}

function loadFromStorage() {
    const savedNotes = localStorage.getItem(NOTES_KEY);
    const savedFolders = localStorage.getItem(FOLDERS_KEY);
    const savedActiveNote = localStorage.getItem(ACTIVE_NOTE_KEY);
    const savedActiveFolder = localStorage.getItem(ACTIVE_FOLDER_KEY);

    if (savedNotes) notes = JSON.parse(savedNotes);
    if (savedFolders) folders = JSON.parse(savedFolders);
    if (savedActiveNote) activeNoteId = savedActiveNote;
    if (savedActiveFolder) activeFolderId = savedActiveFolder;

    // Initialize default folder if none exists
    if (folders.length === 0) {
        folders.push({ id: 'default', name: 'Default', isDefault: true });
    }

    // Create first note if none exists
    if (notes.length === 0) {
        const firstNote = {
            id: generateId(),
            name: 'Welcome Note',
            folderId: 'default',
            content: 'Welcome to FocusPad! 🎨\n\nStart writing amazing notes with advanced formatting!',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        notes.push(firstNote);
        activeNoteId = firstNote.id;
    }
}

// --- NOTE FUNCTIONS ---
function createNote(name, folderId) {
    const note = {
        id: generateId(),
        name: name,
        folderId: folderId,
        content: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    notes.push(note);
    activeNoteId = note.id;
    saveToStorage();
    renderNoteChips();
    loadActiveNote();
    showFormattingIndicator('Note created!');
}

function deleteNote(noteId) {
    const index = notes.findIndex(n => n.id === noteId);
    if (index > -1) {
        notes.splice(index, 1);
        if (activeNoteId === noteId) {
            activeNoteId = notes.length > 0 ? notes[0].id : null;
        }
        saveToStorage();
        renderNoteChips();
        loadActiveNote();
        showFormattingIndicator('Note deleted!');
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
    } else {
        writingCanvas.innerHTML = '';
    }
    writingCanvas.focus();
}

function saveCurrentNote() {
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        note.content = writingCanvas.innerHTML;
        note.updatedAt = Date.now();
        saveToStorage();
    }
}

function getNotesInFolder(folderId) {
    return notes.filter(n => n.folderId === folderId);
}

// --- FOLDER FUNCTIONS ---
function createFolder(name) {
    const folder = {
        id: generateId(),
        name: name,
        isDefault: false
    };
    folders.push(folder);
    saveToStorage();
    renderFolderList();
    updateFolderDropdown();
    showFormattingIndicator('Folder created!');
}

function deleteFolder(folderId) {
    if (folderId === 'default') {
        showFormattingIndicator('Cannot delete default folder!');
        return;
    }

    const folder = folders.find(f => f.id === folderId);
    const folderNotes = notes.filter(n => n.folderId === folderId);

    // Show custom confirmation modal
    const modal = document.getElementById('confirmFolderDeleteModal');
    const titleEl = document.getElementById('folderDeleteTitle');
    const messageEl = document.getElementById('folderDeleteMessage');

    titleEl.textContent = `Delete "${folder.name}"?`;

    if (folderNotes.length > 0) {
        messageEl.textContent = `${folderNotes.length} note(s) will be moved to Default folder.`;
    } else {
        messageEl.textContent = 'This folder will be deleted.';
    }

    modal.classList.add('show');

    // Store folder ID for confirmation handler
    modal.dataset.pendingFolderId = folderId;
}

function setActiveFolder(folderId) {
    activeFolderId = folderId;
    saveToStorage();
    renderNoteChips();
    renderFolderList();
}

// --- RENDER FUNCTIONS ---
function renderNoteChips() {
    noteChips.innerHTML = '';
    const folderNotes = getNotesInFolder(activeFolderId);

    folderNotes.forEach(note => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        if (note.id === activeNoteId) {
            chip.classList.add('active');
        }
        chip.textContent = note.name;
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
        if (folder.id === activeFolderId) {
            item.classList.add('active');
        }

        const nameDiv = document.createElement('div');
        nameDiv.className = 'folder-name';
        nameDiv.textContent = folder.name;
        nameDiv.onclick = () => {
            setActiveFolder(folder.id);
            manageFoldersModal.classList.remove('show');
        };

        const actions = document.createElement('div');
        actions.className = 'folder-actions';

        if (!folder.isDefault) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'folder-action-btn';
            deleteBtn.innerHTML = '<i class="ph ph-trash"></i>';
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
    const trigger = document.getElementById('folderSelectTrigger');
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
            // Update selection
            selectedFolderId = folder.id;
            selectedNameSpan.textContent = folder.name;

            // Update UI
            optionsContainer.querySelectorAll('.select-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');

            // Close dropdown
            wrapper.classList.remove('active');
        });

        optionsContainer.appendChild(option);
    });

    // Toggle dropdown on trigger click
    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);

    newTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        wrapper.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('active');
        }
    });
}

function getSelectedFolderId() {
    const selectedOption = document.querySelector('.select-option.selected');
    return selectedOption ? selectedOption.dataset.folderId : 'default';
}

// --- THEME FUNCTIONS ---
function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    html.setAttribute('data-theme', savedTheme);

    if (savedTheme === 'light') {
        themeIcon.classList.remove('ph-moon');
        themeIcon.classList.add('ph-sun');
    } else {
        themeIcon.classList.remove('ph-sun');
        themeIcon.classList.add('ph-moon');
    }
}

function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

// --- THEME TOGGLE ---
themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');

    if (currentTheme === 'dark') {
        html.setAttribute('data-theme', 'light');
        themeIcon.classList.remove('ph-moon');
        themeIcon.classList.add('ph-sun');
        saveTheme('light');
    } else {
        html.setAttribute('data-theme', 'dark');
        themeIcon.classList.remove('ph-sun');
        themeIcon.classList.add('ph-moon');
        saveTheme('dark');
    }
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

// --- FONT SELECTOR ---
fontSelectorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fontSelectorBtn.classList.toggle('active');
    fontDropdown.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!fontSelectorBtn.contains(e.target) && !fontDropdown.contains(e.target)) {
        fontSelectorBtn.classList.remove('active');
        fontDropdown.classList.remove('active');
    }
});

fontOptions.forEach(option => {
    option.addEventListener('click', () => {
        const selectedFont = option.getAttribute('data-font');

        fontOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');

        currentFontSpan.style.opacity = '0.5';
        setTimeout(() => {
            currentFontSpan.textContent = selectedFont;
            currentFontSpan.style.opacity = '1';
        }, 150);

        applyFontToCurrentLine(selectedFont);

        setTimeout(() => {
            fontSelectorBtn.classList.remove('active');
            fontDropdown.classList.remove('active');
        }, 300);
    });
});

function applyFontToCurrentLine(fontName) {
    const fontFamily = formattingConfig.fonts[fontName] || "'Fredoka', sans-serif";
    const selection = window.getSelection();

    if (!selection.rangeCount) {
        writingCanvas.focus();
        return;
    }

    const range = selection.getRangeAt(0);

    // Case 1: Text is selected - wrap only selection
    if (!range.collapsed) {
        try {
            const span = document.createElement('span');
            span.style.fontFamily = fontFamily;

            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);

            // Keep cursor at end of span, not at start!
            const newRange = document.createRange();
            newRange.setStartAfter(span);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);

            writingCanvas.focus();
            showFormattingIndicator(`Font: ${fontName} (selection)`);
            return;
        } catch (e) {
            console.error('Font selection error:', e);
        }
    }

    // Case 2: No selection - create typing context at cursor
    // Save exact cursor position
    const startContainer = range.startContainer;
    const startOffset = range.startOffset;

    // Create invisible span that will capture future typing
    const fontSpan = document.createElement('span');
    fontSpan.style.fontFamily = fontFamily;
    fontSpan.classList.add('active-font-span');

    // Insert empty text node inside span
    const emptyText = document.createTextNode('');
    fontSpan.appendChild(emptyText);

    // Insert span at cursor
    range.insertNode(fontSpan);

    // Place cursor INSIDE the span
    const newRange = document.createRange();
    newRange.setStart(emptyText, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    writingCanvas.focus();
    showFormattingIndicator(`Font: ${fontName} (from cursor)`);

    // Monitor typing to ensure it stays in span
    let inputHandler;
    inputHandler = (e) => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        const currentRange = sel.getRangeAt(0);
        const node = currentRange.startContainer;

        // Check if we're still in our font span
        let parent = node.nodeType === 3 ? node.parentElement : node;

        // If not in any font span, remove handler
        if (!parent || !parent.classList || !parent.classList.contains('active-font-span')) {
            writingCanvas.removeEventListener('input', inputHandler);
            return;
        }

        // If span has content, mark it as permanent
        if (parent.textContent.length > 0) {
            parent.classList.remove('active-font-span');
            writingCanvas.removeEventListener('input', inputHandler);
        }
    };

    writingCanvas.addEventListener('input', inputHandler);
}

// --- DROPDOWN MANAGEMENT ---
let activeDropdown = null;

function closeAllDropdowns() {
    bulletsMenu.classList.remove('active');
    chipsMenu.classList.remove('active');
    activeDropdown = null;
}

document.addEventListener('click', (e) => {
    if (!bulletsBtn.contains(e.target) && !bulletsMenu.contains(e.target) &&
        !chipsBtn.contains(e.target) && !chipsMenu.contains(e.target)) {
        closeAllDropdowns();
    }
});

// --- BULLETS BUTTON ---
bulletsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeDropdown === 'bullets') {
        closeAllDropdowns();
    } else {
        closeAllDropdowns();
        bulletsMenu.classList.add('active');
        activeDropdown = 'bullets';

        const rect = bulletsBtn.getBoundingClientRect();
        bulletsMenu.style.top = `${rect.top}px`;
    }
});

document.querySelectorAll('#bulletsMenu .dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
        const type = item.getAttribute('data-type');
        insertBulletList(type);
        closeAllDropdowns();
    });
});

function insertBulletList(type) {
    writingCanvas.focus();

    const selection = window.getSelection();
    if (!selection.rangeCount) {
        showFormattingIndicator('Please click in the editor first');
        return;
    }

    const range = selection.getRangeAt(0);

    // Don't delete content, just insert at cursor
    let bulletText = '';

    if (type === 'numbered') {
        // Smart numbering: Check if there's a number before cursor
        let currentNode = range.startContainer;
        let textBefore = '';

        if (currentNode.nodeType === 3) { // Text node
            textBefore = currentNode.textContent.substring(0, range.startOffset);
        }

        // Find last number in the text
        const numberMatch = textBefore.match(/(\d+)\.\s*[^\d]*$/);
        let nextNumber = 1;

        if (numberMatch) {
            nextNumber = parseInt(numberMatch[1]) + 1;
        }

        bulletText = `${nextNumber}. `;
    } else {
        // Regular bullet
        bulletText = '• ';
    }

    // Insert bullet text inline
    const textNode = document.createTextNode(bulletText);
    range.insertNode(textNode);

    // Position cursor after bullet
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    showFormattingIndicator(`${type === 'numbered' ? 'Number' : 'Bullet'} inserted`);
    saveCurrentNote();
}

// --- CHIPS BUTTON ---
chipsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeDropdown === 'chips') {
        closeAllDropdowns();
    } else {
        closeAllDropdowns();
        chipsMenu.classList.add('active');
        activeDropdown = 'chips';

        const rect = chipsBtn.getBoundingClientRect();
        chipsMenu.style.top = `${rect.top}px`;
    }
});

document.querySelectorAll('#chipsMenu .dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
        const chipType = item.getAttribute('data-chip');
        insertChip(chipType);
        closeAllDropdowns();
    });
});

function insertChip(type) {
    const chipTexts = {
        'red': 'Important',
        'blue': 'Note',
        'green': 'Success',
        'yellow': 'Warning',
        'purple': 'Idea',
        'pink': 'Reminder'
    };

    writingCanvas.focus();

    const selection = window.getSelection();
    if (!selection.rangeCount) {
        showFormattingIndicator('Please click in the editor first');
        return;
    }

    const range = selection.getRangeAt(0);

    // Delete any selected content
    range.deleteContents();

    // Create chip element
    const chip = document.createElement('span');
    chip.className = `chip-tag chip-${type}`;
    chip.textContent = chipTexts[type];
    chip.contentEditable = 'false';

    // Create space after chip
    const spaceAfter = document.createTextNode(' ');

    // Insert chip and space
    range.insertNode(spaceAfter);
    range.insertNode(chip);

    // Position cursor after the space
    range.setStartAfter(spaceAfter);
    range.setEndAfter(spaceAfter);
    selection.removeAllRanges();
    selection.addRange(range);

    showFormattingIndicator(`${chipTexts[type]} chip inserted`);

    // Auto-save
    saveCurrentNote();
}

// --- LINE BREAK BUTTON ---
lineBreakBtn.addEventListener('click', () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const br = document.createElement('br');
        range.insertNode(br);

        range.setStartAfter(br);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        showFormattingIndicator('Line break inserted');
    }
});

// --- EXPORT BUTTON ---
exportBtn.addEventListener('click', () => {
    showFormattingIndicator('Exporting note...');
    setTimeout(() => {
        const note = notes.find(n => n.id === activeNoteId);
        const content = writingCanvas.innerHTML;
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${note ? note.name : 'note'}-export.html`;
        a.click();
        URL.revokeObjectURL(url);
    }, 500);
});

// --- DELETE BUTTON ---
deleteBtn.addEventListener('click', () => {
    if (notes.length <= 1) {
        showFormattingIndicator('Cannot delete last note!');
        return;
    }
    confirmModal.classList.add('show');
});

cancelDeleteBtn.addEventListener('click', () => {
    confirmModal.classList.remove('show');
});

confirmDeleteBtn.addEventListener('click', () => {
    deleteNote(activeNoteId);
    confirmModal.classList.remove('show');
});

confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        confirmModal.classList.remove('show');
    }
});

// --- NEW NOTE MODAL ---
addNoteBtn.addEventListener('click', () => {
    updateFolderDropdown();
    document.getElementById('newNoteName').value = '';
    newNoteModal.classList.add('show');
    setTimeout(() => document.getElementById('newNoteName').focus(), 100);
});

document.getElementById('cancelNewNote').addEventListener('click', () => {
    newNoteModal.classList.remove('show');
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
});

newNoteModal.addEventListener('click', (e) => {
    if (e.target === newNoteModal) {
        newNoteModal.classList.remove('show');
    }
});

// --- MANAGE FOLDERS MODAL ---
manageFoldersBtn.addEventListener('click', () => {
    renderFolderList();
    document.getElementById('newFolderName').value = '';
    manageFoldersModal.classList.add('show');
    setTimeout(() => document.getElementById('newFolderName').focus(), 100);
});

document.getElementById('createFolderBtn').addEventListener('click', () => {
    const name = document.getElementById('newFolderName').value.trim();

    if (!name) {
        showFormattingIndicator('Please enter a folder name!');
        return;
    }

    createFolder(name);
    document.getElementById('newFolderName').value = '';
});

document.getElementById('closeFoldersModal').addEventListener('click', () => {
    manageFoldersModal.classList.remove('show');
});

manageFoldersModal.addEventListener('click', (e) => {
    if (e.target === manageFoldersModal) {
        manageFoldersModal.classList.remove('show');
    }
});

// --- FOLDER DELETE CONFIRMATION MODAL ---
const confirmFolderDeleteModal = document.getElementById('confirmFolderDeleteModal');
const cancelFolderDeleteBtn = document.getElementById('cancelFolderDelete');
const confirmFolderDeleteBtn = document.getElementById('confirmFolderDelete');

cancelFolderDeleteBtn.addEventListener('click', () => {
    confirmFolderDeleteModal.classList.remove('show');
    delete confirmFolderDeleteModal.dataset.pendingFolderId;
});

confirmFolderDeleteBtn.addEventListener('click', () => {
    const folderId = confirmFolderDeleteModal.dataset.pendingFolderId;

    if (folderId) {
        // Move notes to default folder
        notes.forEach(note => {
            if (note.folderId === folderId) {
                note.folderId = 'default';
            }
        });

        const index = folders.findIndex(f => f.id === folderId);
        if (index > -1) {
            folders.splice(index, 1);
        }

        if (activeFolderId === folderId) {
            activeFolderId = 'default';
        }

        saveToStorage();
        renderFolderList();
        renderNoteChips();
        showFormattingIndicator('Folder deleted!');
    }

    confirmFolderDeleteModal.classList.remove('show');
    delete confirmFolderDeleteModal.dataset.pendingFolderId;
});

confirmFolderDeleteModal.addEventListener('click', (e) => {
    if (e.target === confirmFolderDeleteModal) {
        confirmFolderDeleteModal.classList.remove('show');
        delete confirmFolderDeleteModal.dataset.pendingFolderId;
    }
});

// --- FORMATTING SHORTCUTS ---
function getCurrentLine() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return null;

    let node = selection.anchorNode;
    if (!node) return null;

    if (node.nodeType === 3) {
        node = node.parentNode;
    }

    while (node && node !== writingCanvas) {
        if (node.nodeType === 1 && (node.tagName === 'DIV' || node.tagName === 'P' || node === writingCanvas)) {
            break;
        }
        node = node.parentNode;
    }

    return node === writingCanvas ? selection.anchorNode : node;
}

function processLineFormatting(lineNode) {
    if (!lineNode) return false;

    let text = lineNode.textContent || '';
    let processed = false;
    let newHTML = '';

    if (!text.includes(':')) return false;

    // Process colors
    const colorRegex = /@color\.(\w+):(.*)$/i;
    if (!processed && colorRegex.test(text)) {
        const match = text.match(colorRegex);
        const colorName = match[1].toLowerCase();
        const content = match[2];

        if (isValidColor(colorName)) {
            newHTML = `<span style="color: ${colorName}">${content}</span>`;
            processed = true;
        }
    }

    // Process headings: #head:, #subHead:, #head.center:, #head.red.center:, #head.center.red: (order independent)
    if (!processed) {
        const headingRegex = /#(head|subHead)((?:\.\w+)*):(.*)$/i;
        const match = text.match(headingRegex);
        if (match) {
            const [, type, modifiers, content] = match;
            let className = type === 'head' ? 'heading-main' : 'heading-sub';
            let inlineStyles = '';

            // Parse all modifiers
            if (modifiers) {
                const mods = modifiers.split('.').filter(m => m.length > 0);

                // Check each modifier - could be color or alignment
                mods.forEach(mod => {
                    const modLower = mod.toLowerCase();

                    // Check if it's a valid color
                    if (isValidColor(modLower)) {
                        inlineStyles += `color: ${modLower}; `;
                    }
                    // Check if it's an alignment
                    else if (formattingConfig.alignments[modLower]) {
                        className += ` text-${modLower}`;
                    }
                });
            }

            if (inlineStyles) {
                newHTML = `<div class="${className}" style="${inlineStyles}">${content}</div>`;
            } else {
                newHTML = `<div class="${className}">${content}</div>`;
            }
            processed = true;
        }
    }

    // Process styles
    if (!processed) {
        for (const [style, className] of Object.entries(formattingConfig.styles)) {
            const regex = new RegExp(`@${style}:(.*)$`, 'i');
            if (regex.test(text)) {
                const match = text.match(regex);
                if (style === 'normal') {
                    newHTML = match[1];
                } else {
                    newHTML = `<span class="${className}">${match[1]}</span>`;
                }
                processed = true;
                break;
            }
        }
    }

    // Process alignments
    if (!processed) {
        for (const [align, className] of Object.entries(formattingConfig.alignments)) {
            const regex = new RegExp(`@align\\.${align}:(.*)$`, 'i');
            if (regex.test(text)) {
                const match = text.match(regex);
                newHTML = `<div class="${className}">${match[1]}</div>`;
                processed = true;
                break;
            }
        }
    }

    // Process code blocks
    if (!processed) {
        const codeRegex = /\$code:(.*)$/i;
        if (codeRegex.test(text)) {
            const match = text.match(codeRegex);
            newHTML = `<div class="code-block">${match[1]}</div>`;
            processed = true;
        }
    }

    // Process fonts
    if (!processed) {
        for (const [fontName, fontFamily] of Object.entries(formattingConfig.fonts)) {
            const regex = new RegExp(`@setFont\\.${fontName.replace(/\s+/g, '\\s+')}:(.*)$`, 'i');
            if (regex.test(text)) {
                const match = text.match(regex);
                newHTML = `<span style="font-family: ${fontFamily}">${match[1]}</span>`;
                processed = true;
                break;
            }
        }
    }

    if (processed && newHTML) {
        const temp = document.createElement('div');
        temp.innerHTML = newHTML;
        const newNode = temp.firstChild;

        if (newNode) {
            if (lineNode.nodeType === 3) {
                lineNode.parentNode.replaceChild(newNode, lineNode);
            } else {
                lineNode.parentNode.replaceChild(newNode, lineNode);
            }

            const selection = window.getSelection();
            const range = document.createRange();
            const textNode = newNode.firstChild || newNode;
            const offset = textNode.textContent ? textNode.textContent.length : 0;

            try {
                if (textNode.nodeType === 3) {
                    range.setStart(textNode, offset);
                } else {
                    range.selectNodeContents(textNode);
                    range.collapse(false);
                }
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            } catch (e) {
                range.selectNodeContents(newNode);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }

            return true;
        }
    }

    return false;
}

let processing = false;

writingCanvas.addEventListener('keyup', (e) => {
    if (processing) return;

    if (e.key === ':' || e.key === ' ') {
        processing = true;

        const lineNode = getCurrentLine();
        const wasProcessed = processLineFormatting(lineNode);

        if (wasProcessed) {
            showFormattingIndicator('Formatting applied');
        }

        processing = false;
    }
});

// Auto-save on input
writingCanvas.addEventListener('input', () => {
    saveCurrentNote();
});

// Enter key handler for list continuation
writingCanvas.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        let currentNode = range.startContainer;

        if (currentNode.nodeType === 3) { // Text node
            const textBefore = currentNode.textContent.substring(0, range.startOffset);

            // Check if line starts with bullet or number
            const bulletMatch = textBefore.match(/^(\s*)(•|\d+\.)\s+(.*)$/);

            if (bulletMatch) {
                const [, indent, marker, content] = bulletMatch;

                // If user pressed Enter on empty list item, remove it and exit list
                if (!content.trim()) {
                    e.preventDefault();

                    // Remove the empty bullet/number
                    currentNode.textContent = currentNode.textContent.substring(0, range.startOffset - (indent + marker).length - 1) +
                        currentNode.textContent.substring(range.startOffset);

                    // Insert newline
                    const br = document.createElement('br');
                    const newRange = document.createRange();
                    newRange.setStart(currentNode, range.startOffset - (indent + marker).length - 1);
                    newRange.insertNode(br);

                    newRange.setStartAfter(br);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    return;
                }

                // Continue list with next item
                e.preventDefault();

                let newMarker = marker;

                // If it's a number, increment it
                if (/^\d+\.$/.test(marker)) {
                    const num = parseInt(marker);
                    newMarker = `${num + 1}.`;
                }

                // Insert newline and new marker
                const newLine = document.createTextNode('\n' + indent + newMarker + ' ');
                range.insertNode(newLine);

                // Position cursor after new marker
                range.setStartAfter(newLine);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }
});

// --- KEYBOARD SHORTCUTS ---
document.addEventListener('keydown', (e) => {
    // Font selector shortcut
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        fontSelectorBtn.click();
    }

    // New note shortcut
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        addNoteBtn.click();
    }

    // Escape key handling
    if (e.key === 'Escape') {
        if (fontDropdown.classList.contains('active')) {
            fontSelectorBtn.classList.remove('active');
            fontDropdown.classList.remove('active');
        }
        closeAllDropdowns();

        // Close modals on Escape
        if (newNoteModal.classList.contains('show')) {
            newNoteModal.classList.remove('show');
        }
        if (manageFoldersModal.classList.contains('show')) {
            manageFoldersModal.classList.remove('show');
        }
        if (confirmModal.classList.contains('show')) {
            confirmModal.classList.remove('show');
        }
    }

    // Enter key in new note modal
    if (e.key === 'Enter' && newNoteModal.classList.contains('show')) {
        if (e.target.id === 'newNoteName') {
            e.preventDefault();
            document.getElementById('createNewNote').click();
        }
    }

    // Enter key in folder modal
    if (e.key === 'Enter' && manageFoldersModal.classList.contains('show')) {
        if (e.target.id === 'newFolderName') {
            e.preventDefault();
            document.getElementById('createFolderBtn').click();
        }
    }
});

// --- INITIALIZATION ---
function init() {
    loadTheme();
    loadFromStorage();
    renderNoteChips();
    loadActiveNote();
    writingCanvas.focus();
}

// Start the app
init();
