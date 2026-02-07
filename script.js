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
const exportModal = document.getElementById('exportModal');
const closeExportModalBtn = document.getElementById('closeExportModal');
const exportConfirmBtn = document.getElementById('exportConfirmBtn');
const exportFileNameInput = document.getElementById('exportFileName');
const exportCards = document.querySelectorAll('.export-card');
const pdfOptions = document.getElementById('pdfOptions');
const themeTogglePill = document.querySelector('.theme-toggle-pill');
const themePillOptions = document.querySelectorAll('.theme-pill-option');
const includeHeaderFooter = document.getElementById('includeHeaderFooter');

// Button elements
const exportBtn = document.getElementById('exportBtn');
const deleteBtn = document.getElementById('deleteBtn');
const bulletsBtn = document.getElementById('bulletsBtn');
const chipsBtn = document.getElementById('chipsBtn');
const addNoteBtn = document.getElementById('addNoteBtn');
const manageFoldersBtn = document.getElementById('manageFoldersBtn');
const shareBtn = document.getElementById('shareBtn');

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
const LAST_NOTE_PER_FOLDER_KEY = 'focuspad_lastNotePerFolder';

// --- DATA STRUCTURES ---
let notes = [];
let folders = [];
let activeNoteId = null;
let activeFolderId = 'default';
let lastNotePerFolder = {}; // Track last opened note per folder

// Export state
let selectedExportFormat = null;

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

// --- GLOBAL CURSOR-RANGE MANAGEMENT ---
let savedCursorRange = null;

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

function clearSavedCursorRange() {
    savedCursorRange = null;
}

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
            content: 'Welcome to FocusPad! 🎨\n\nStart writing amazing notes with advanced formatting!\n\nTry these shortcuts:\n=== (thick line)\n--- (dashed line)',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        notes.push(firstNote);
        activeNoteId = firstNote.id;
    }
}

// --- PASTE SANITIZATION ---
writingCanvas.addEventListener('paste', (e) => {
    e.preventDefault();

    // Get content
    const text = e.clipboardData.getData('text/plain');
    const htmlContent = e.clipboardData.getData('text/html');

    // If we have HTML, we want to extract basic formatting but strip layout styles
    if (htmlContent) {
        // Create a temporary container
        const temp = document.createElement('div');
        temp.innerHTML = htmlContent;

        // Sanitization function
        function sanitize(node) {
            // Remove style attributes
            if (node.hasAttribute && node.hasAttribute('style')) {
                node.removeAttribute('style');
            }
            if (node.hasAttribute && node.hasAttribute('class')) {
                node.removeAttribute('class');
            }
            if (node.hasAttribute && node.hasAttribute('width')) {
                node.removeAttribute('width');
            }
            if (node.hasAttribute && node.hasAttribute('height')) {
                node.removeAttribute('height');
            }

            // Recursively clean children
            const children = Array.from(node.children);
            children.forEach(child => sanitize(child));
        }

        sanitize(temp);

        // Insert cleaned HTML
        try {
            document.execCommand('insertHTML', false, temp.innerHTML);
        } catch (err) {
            document.execCommand('insertText', false, text);
        }
    } else {
        // Fallback to plain text
        document.execCommand('insertText', false, text);
    }
});

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

        // Get current folder notes after deletion
        const folderNotes = getNotesInFolder(activeFolderId);

        if (folderNotes.length === 0) {
            // No notes left in this folder
            activeNoteId = null;
            showFormattingIndicator('Note deleted! No notes in this folder.');
        } else if (activeNoteId === noteId) {
            // If we deleted the active note, switch to first note in folder
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
        // Show the note content
        writingCanvas.innerHTML = note.content || '';
        writingCanvas.contentEditable = 'true';
        writingCanvas.classList.remove('empty-folder-message');

        // Apply theme compatibility to note content
        applyThemeCompatibilityToNote();

        // Enable delete button if we have notes in current folder
        const folderNotes = getNotesInFolder(activeFolderId);
        if (folderNotes.length > 0) {
            deleteBtn.classList.remove('disabled');
        }
    } else {
        // No active note - check if current folder has any notes
        const folderNotes = getNotesInFolder(activeFolderId);

        if (folderNotes.length === 0) {
            // Show "no notes in folder" message
            writingCanvas.innerHTML = `
                <div class="empty-folder-message">
                    <div class="empty-folder-icon">
                        <i class="ph ph-note-blank"></i>
                    </div>
                    <h3>No Notes in This Folder</h3>
                    <p>This folder is empty. Create a new note to get started!</p>
                    <button class="create-note-btn abc" id="createNoteFromEmpty">Create New Note</button>
                </div>
            `;
            writingCanvas.contentEditable = 'false';
            writingCanvas.classList.add('empty-folder-message');

            // Disable delete button when no notes
            deleteBtn.classList.add('disabled');

            // Add event listener to the create note button
            setTimeout(() => {
                const createBtn = document.getElementById('createNoteFromEmpty');
                if (createBtn) {
                    createBtn.addEventListener('click', () => {
                        updateFolderDropdown();
                        document.getElementById('newNoteName').value = '';
                        newNoteModal.classList.add('show');
                        setTimeout(() => document.getElementById('newNoteName').focus(), 100);
                    });
                }
            }, 100);
        } else {
            // Folder has notes but no active note selected - select first note
            activeNoteId = folderNotes[0].id;
            saveToStorage();
            loadActiveNote();
        }
    }
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
    // Save current note before switching
    if (activeNoteId) {
        saveCurrentNote();
        // Remember this was the last note in current folder
        lastNotePerFolder[activeFolderId] = activeNoteId;
    }

    // Switch folder
    activeFolderId = folderId;

    // Get notes in new folder
    const folderNotes = getNotesInFolder(folderId);

    if (folderNotes.length > 0) {
        // Try to load last opened note from this folder
        const lastNoteId = lastNotePerFolder[folderId];
        const lastNote = folderNotes.find(n => n.id === lastNoteId);

        if (lastNote) {
            // Load the last opened note
            activeNoteId = lastNote.id;
        } else {
            // Load first note in folder
            activeNoteId = folderNotes[0].id;
        }
    } else {
        // No notes in folder - clear active note
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
        // Show empty state message
        const emptyChip = document.createElement('div');
        emptyChip.className = 'chip empty-chip';
        emptyChip.textContent = 'No notes';
        noteChips.appendChild(emptyChip);
        return;
    }

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
    return selectedOption ? selectedOption.dataset.folderId : activeFolderId;
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

    // Apply theme compatibility adjustments
    applyThemeCompatibility(savedTheme);
    applyThemeCompatibilityToNote();
}

function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

// ENHANCED THEME COMPATIBILITY FUNCTION
function applyThemeCompatibility(theme) {
    // Apply to all elements with text
    const allElements = document.querySelectorAll('*');

    allElements.forEach(el => {
        // Skip writing canvas elements (handled separately)
        if (el.closest('.writing-canvas')) return;

        const computedStyle = window.getComputedStyle(el);
        const color = computedStyle.color;

        if (color) {
            // Parse RGB color
            const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
                const r = parseInt(rgbMatch[1]);
                const g = parseInt(rgbMatch[2]);
                const b = parseInt(rgbMatch[3]);

                // Calculate luminance
                const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

                // Adjust based on theme
                if (theme === 'light' && luminance < 0.3) {
                    // Too dark for light theme
                    el.style.color = `rgb(${Math.min(255, r + 100)}, ${Math.min(255, g + 100)}, ${Math.min(255, b + 100)})`;
                } else if (theme === 'dark' && luminance > 0.7) {
                    // Too light for dark theme
                    el.style.color = `rgb(${Math.max(0, r - 100)}, ${Math.max(0, g - 100)}, ${Math.max(0, b - 100)})`;
                }
            }
        }
    });
}

// Apply theme compatibility to note content
function applyThemeCompatibilityToNote() {
    const currentTheme = html.getAttribute('data-theme');
    const elements = writingCanvas.querySelectorAll('*');

    elements.forEach(el => {
        // Check for color classes
        if (el.classList.contains('text-black')) {
            if (currentTheme === 'dark') {
                el.style.color = 'var(--color-white)';
            } else {
                el.style.color = 'var(--color-black)';
            }
        } else if (el.classList.contains('text-white')) {
            if (currentTheme === 'light') {
                el.style.color = 'var(--color-black)';
            } else {
                el.style.color = 'var(--color-white)';
            }
        }

        // Check for inline styles
        const inlineColor = el.style.color;
        if (inlineColor) {
            if (inlineColor.includes('black') || inlineColor.includes('#000') || inlineColor.includes('rgb(0,0,0)')) {
                if (currentTheme === 'dark') {
                    el.style.color = 'var(--color-white)';
                }
            } else if (inlineColor.includes('white') || inlineColor.includes('#fff') || inlineColor.includes('rgb(255,255,255)')) {
                if (currentTheme === 'light') {
                    el.style.color = 'var(--color-black)';
                }
            }
        }
    });

    saveCurrentNote();
}

// Enhanced theme toggle with better compatibility
themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');

    if (currentTheme === 'dark') {
        html.setAttribute('data-theme', 'light');
        themeIcon.classList.remove('ph-moon');
        themeIcon.classList.add('ph-sun');
        saveTheme('light');
        applyThemeCompatibility('light');
        applyThemeCompatibilityToNote();
    } else {
        html.setAttribute('data-theme', 'dark');
        themeIcon.classList.remove('ph-sun');
        themeIcon.classList.add('ph-moon');
        saveTheme('dark');
        applyThemeCompatibility('dark');
        applyThemeCompatibilityToNote();
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

// Save cursor range BEFORE dropdown opens (mousedown fires before click steals focus)
fontSelectorBtn.addEventListener('mousedown', (e) => {
    saveCursorRange();
});

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
        const selectedFont = option.getAttribute('data-font');

        fontOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');

        currentFontSpan.style.opacity = '0.5';
        setTimeout(() => {
            currentFontSpan.textContent = selectedFont;
            currentFontSpan.style.opacity = '1';
        }, 150);

        // Use unified font application (cursor-based)
        applyFontAtCursor(selectedFont);

        setTimeout(() => {
            fontSelectorBtn.classList.remove('active');
            fontDropdown.classList.remove('active');
            clearSavedCursorRange();
        }, 300);
    });
});

function getCurrentFont() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return 'Fredoka';

    const range = selection.getRangeAt(0);
    let node = range.startContainer;

    // Get the element node
    if (node.nodeType === 3) {
        node = node.parentElement;
    }

    // Walk up to find font-family
    while (node && node !== writingCanvas) {
        const computedFont = window.getComputedStyle(node).fontFamily;

        // Match computed font to our font list
        for (const [fontName, fontFamily] of Object.entries(formattingConfig.fonts)) {
            if (computedFont.includes(fontName.replace(/\s+/g, ''))) {
                return fontName;
            }
        }

        node = node.parentElement;
    }

    return 'Fredoka'; // Default
}

function updateFontDisplay() {
    const currentFont = getCurrentFont();
    currentFontSpan.textContent = currentFont;

    // Update active state in dropdown
    fontOptions.forEach(opt => {
        const fontName = opt.getAttribute('data-font');
        if (fontName === currentFont) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
}

// --- UNIFIED FONT APPLICATION (Used by both dropdown and @setFont shortcut) ---
function applyFontAtCursor(fontName, useShortcutMode = false) {
    const fontFamily = formattingConfig.fonts[fontName] || "'Fredoka', sans-serif";

    // Try to restore saved cursor range if available
    if (savedCursorRange) {
        restoreCursorRange();
    } else {
        writingCanvas.focus();
    }

    let selection = window.getSelection();
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

            // Keep cursor at end of span
            const newRange = document.createRange();
            newRange.setStartAfter(span);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);

            writingCanvas.focus();
            showFormattingIndicator(`Font: ${fontName} (selection)`);
            clearSavedCursorRange();
            saveCurrentNote();
            return;
        } catch (e) {
            console.error('Font selection error:', e);
        }
    }

    // Case 2: No selection (cursor only) - create typing anchor for future text
    const fontSpan = document.createElement('span');
    fontSpan.style.fontFamily = fontFamily;
    fontSpan.classList.add('cursor-font-marker');

    // Insert zero-width space to anchor cursor
    const anchorText = document.createTextNode('\u200B');
    fontSpan.appendChild(anchorText);

    // Insert span at cursor position
    range.insertNode(fontSpan);

    // Place cursor INSIDE the span after the zero-width space
    const newRange = document.createRange();
    newRange.setStartAfter(anchorText);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    writingCanvas.focus();
    showFormattingIndicator(`Font: ${fontName} (from cursor)`);

    // Update font display
    setTimeout(() => updateFontDisplay(), 50);

    // Monitor typing to clean up zero-width space once user types
    const inputHandler = (e) => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        const currentRange = sel.getRangeAt(0);
        let node = currentRange.startContainer;
        let parent = node.nodeType === 3 ? node.parentElement : node;

        // Check if we're in our font marker span
        if (parent && parent.classList && parent.classList.contains('cursor-font-marker')) {
            // Remove zero-width space if user typed real content
            const content = parent.textContent;
            if (content.length > 1 || (content.length === 1 && content !== '\u200B')) {
                // Replace zero-width space with nothing
                parent.textContent = content.replace(/\u200B/g, '');
                parent.classList.remove('cursor-font-marker');

                // Restore cursor position at end
                const restoreRange = document.createRange();
                const textNode = parent.firstChild;
                if (textNode && textNode.nodeType === 3) {
                    restoreRange.setStart(textNode, textNode.length);
                    restoreRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(restoreRange);
                }

                writingCanvas.removeEventListener('input', inputHandler);
            }
        } else {
            // Cursor moved out, cleanup
            writingCanvas.removeEventListener('input', inputHandler);
        }
    };

    writingCanvas.addEventListener('input', inputHandler);
    clearSavedCursorRange();
    saveCurrentNote();
}

// --- DROPDOWN MANAGEMENT ---
let activeDropdown = null;

function closeAllDropdowns() {
    bulletsMenu.classList.remove('active');
    chipsMenu.classList.remove('active');
    activeDropdown = null;
    clearSavedCursorRange();
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
    // Don't allow insertion if no active note
    if (!activeNoteId) {
        showFormattingIndicator('Please create a note first');
        return;
    }

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
// Save cursor range before dropdown opens
chipsBtn.addEventListener('mousedown', (e) => {
    saveCursorRange();
});

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

// IMPROVED CHIP INSERTION - Inserts at cursor position correctly
function insertChip(type) {
    // Don't allow insertion if no active note
    if (!activeNoteId) {
        showFormattingIndicator('Please create a note first');
        return;
    }

    const chipTexts = {
        'red': 'Important',
        'blue': 'Note',
        'green': 'Success',
        'yellow': 'Warning',
        'purple': 'Idea',
        'pink': 'Reminder'
    };

    // Restore saved cursor range if dropdown stole focus
    if (savedCursorRange) {
        restoreCursorRange();
    } else {
        writingCanvas.focus();
    }

    const selection = window.getSelection();
    if (!selection.rangeCount) {
        showFormattingIndicator('Please click in the editor first');
        return;
    }

    const range = selection.getRangeAt(0);

    // Ensure we're in the writing canvas
    if (!writingCanvas.contains(range.commonAncestorContainer)) {
        writingCanvas.focus();
        return;
    }

    // Delete any selected content
    if (!range.collapsed) {
        range.deleteContents();
    }

    // Create chip element
    const chip = document.createElement('span');
    chip.className = `chip-tag chip-${type}`;
    chip.textContent = chipTexts[type];
    chip.contentEditable = 'false';

    // Create space after chip
    const spaceAfter = document.createTextNode(' ');

    // Insert chip and space at cursor position
    range.insertNode(spaceAfter);
    range.insertNode(chip);

    // Position cursor after the space
    range.setStartAfter(spaceAfter);
    range.setEndAfter(spaceAfter);
    selection.removeAllRanges();
    selection.addRange(range);

    showFormattingIndicator(`${chipTexts[type]} chip inserted`);
    clearSavedCursorRange();

    // Auto-save
    saveCurrentNote();
}

// === AND --- SHORTCUTS FOR HORIZONTAL LINES
function insertHorizontalLine(type) {
    // Don't allow insertion if no active note
    if (!activeNoteId) {
        showFormattingIndicator('Please create a note first');
        return;
    }

    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Create horizontal line element
    const hr = document.createElement('div');
    hr.className = 'horizontal-line';

    if (type === 'thick') {
        hr.classList.add('thick');
    } else if (type === 'dashed') {
        hr.classList.add('dashed');
    }

    // Insert at cursor position
    range.insertNode(hr);

    // Add a new line after the horizontal line
    const br = document.createElement('br');
    range.insertNode(br);

    // Move cursor to after the new line
    range.setStartAfter(br);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    showFormattingIndicator(`Horizontal line inserted`);
    saveCurrentNote();
}

// --- EXPORT MODAL ---
exportBtn.addEventListener('click', () => {
    // Don't show export modal if no active note
    if (!activeNoteId) {
        showFormattingIndicator('No note to export. Create a note first.');
        return;
    }

    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        exportFileNameInput.value = note.name.replace(/[^\w\s]/gi, '');
    }

    // Reset selection
    exportCards.forEach(card => card.classList.remove('selected'));
    selectedExportFormat = null;
    exportConfirmBtn.disabled = true;

    // Set default PDF theme based on current app theme
    const currentTheme = html.getAttribute('data-theme');
    themeTogglePill.dataset.theme = currentTheme;
    themePillOptions.forEach(option => {
        option.classList.remove('active');
        if (option.dataset.theme === currentTheme) {
            option.classList.add('active');
        }
    });

    exportModal.classList.add('show');
});

closeExportModalBtn.addEventListener('click', () => {
    exportModal.classList.remove('show');
});

exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) {
        exportModal.classList.remove('show');
    }
});

// Export card selection
exportCards.forEach(card => {
    card.addEventListener('click', () => {
        // Remove selection from all cards
        exportCards.forEach(c => c.classList.remove('selected'));

        // Select clicked card
        card.classList.add('selected');
        selectedExportFormat = card.dataset.format;
        exportConfirmBtn.disabled = false;
    });
});

// PDF Theme pill toggle
themePillOptions.forEach(option => {
    option.addEventListener('click', () => {
        const selectedTheme = option.dataset.theme;
        themeTogglePill.dataset.theme = selectedTheme;

        themePillOptions.forEach(opt => {
            opt.classList.remove('active');
        });
        option.classList.add('active');
    });
});

// Export confirmation
exportConfirmBtn.addEventListener('click', async () => {
    const fileName = exportFileNameInput.value.trim() || 'note';

    if (!selectedExportFormat) {
        showFormattingIndicator('Please select an export format');
        return;
    }

    exportModal.classList.remove('show');
    showFormattingIndicator(`Exporting as ${selectedExportFormat.toUpperCase()}...`);

    switch (selectedExportFormat) {
        case 'pdf':
            await exportAsPDF(fileName);
            break;
        case 'markdown':
            exportAsMarkdown(fileName);
            break;
        case 'text':
            exportAsText(fileName);
            break;
    }
});

// --- EXPORT FUNCTIONS ---
async function exportAsPDF(fileName) {
    try {
        const note = notes.find(n => n.id === activeNoteId);
        const content = writingCanvas.innerHTML;
        const selectedTheme = themeTogglePill.dataset.theme || 'dark';
        const includeHeader = includeHeaderFooter.checked;

        // Create a temporary container for PDF generation
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '794px'; // A4 width in pixels
        tempContainer.style.padding = '40px';
        tempContainer.style.fontFamily = "'Fredoka', sans-serif";
        tempContainer.style.lineHeight = '1.6';
        tempContainer.style.fontSize = '14px';

        // Apply theme
        if (selectedTheme === 'dark') {
            tempContainer.style.backgroundColor = '#1a1a1a';
            tempContainer.style.color = '#ffffff';
        } else {
            tempContainer.style.backgroundColor = '#ffffff';
            tempContainer.style.color = '#000000';
        }

        // Add header if enabled
        if (includeHeader) {
            const header = document.createElement('div');
            header.style.textAlign = 'center';
            header.style.marginBottom = '30px';
            header.style.paddingBottom = '20px';
            header.style.borderBottom = '1px solid #ddd';

            const title = document.createElement('h1');
            title.textContent = fileName;
            title.style.margin = '0';
            title.style.fontSize = '24px';
            title.style.fontWeight = 'bold';

            header.appendChild(title);
            tempContainer.appendChild(header);
        }

        // Add content
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = content;

        // Adjust content colors for theme compatibility
        const elements = contentDiv.querySelectorAll('[style*="color"]');
        elements.forEach(el => {
            const color = el.style.color;
            if (color && selectedTheme === 'light') {
                // For light theme, adjust very dark colors to be readable
                const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (rgbMatch) {
                    const r = parseInt(rgbMatch[1]);
                    const g = parseInt(rgbMatch[2]);
                    const b = parseInt(rgbMatch[3]);

                    // If color is very dark (close to black), make it darker for light theme
                    if (r < 50 && g < 50 && b < 50) {
                        el.style.color = '#000000';
                    }
                    // If color is very light (close to white), make it darker
                    else if (r > 200 && g > 200 && b > 200) {
                        el.style.color = '#333333';
                    }
                } else if (color.includes('white') || color.includes('#fff')) {
                    el.style.color = '#000000';
                }
            } else if (color && selectedTheme === 'dark') {
                // For dark theme, adjust very light colors
                const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (rgbMatch) {
                    const r = parseInt(rgbMatch[1]);
                    const g = parseInt(rgbMatch[2]);
                    const b = parseInt(rgbMatch[3]);

                    // If color is very light (close to white), make it lighter for dark theme
                    if (r > 200 && g > 200 && b > 200) {
                        el.style.color = '#ffffff';
                    }
                    // If color is very dark (close to black), make it lighter
                    else if (r < 50 && g < 50 && b < 50) {
                        el.style.color = '#cccccc';
                    }
                } else if (color.includes('black') || color.includes('#000')) {
                    el.style.color = '#ffffff';
                }
            }
        });

        tempContainer.appendChild(contentDiv);

        // Add footer if enabled
        if (includeHeader) {
            const footer = document.createElement('div');
            footer.style.textAlign = 'center';
            footer.style.marginTop = '40px';
            footer.style.paddingTop = '20px';
            footer.style.borderTop = '1px solid #ddd';
            footer.style.fontSize = '12px';
            footer.style.color = '#666';

            const appName = document.createElement('div');
            appName.textContent = 'Exported from FocusPad';
            appName.style.marginBottom = '5px';

            const date = document.createElement('div');
            date.textContent = new Date().toLocaleDateString();

            footer.appendChild(appName);
            footer.appendChild(date);
            tempContainer.appendChild(footer);
        }

        document.body.appendChild(tempContainer);

        // Generate PDF with high quality
        const canvas = await html2canvas(tempContainer, {
            scale: 4, // High resolution for vector-like quality
            useCORS: true,
            backgroundColor: selectedTheme === 'dark' ? '#1a1a1a' : '#ffffff',
            logging: false,
            allowTaint: true,
            letterRendering: true
        });

        // Remove temp container
        document.body.removeChild(tempContainer);

        // Create PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${fileName}.pdf`);

        showFormattingIndicator('PDF exported successfully!');
    } catch (error) {
        console.error('PDF export error:', error);
        showFormattingIndicator('Error exporting PDF');
    }
}

function exportAsMarkdown(fileName) {
    const note = notes.find(n => n.id === activeNoteId);
    let content = writingCanvas.innerHTML;

    // Convert HTML to Markdown (simplified conversion)
    let markdown = content
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<u[^>]*>(.*?)<\/u>/gi, '$1')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n')
        .replace(/<div[^>]*class="code-block"[^>]*>(.*?)<\/div>/gi, '```\n$1\n```\n')
        .replace(/<div[^>]*class="horizontal-line"[^>]*>/gi, '\n---\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
        .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();

    // Add metadata
    const metadata = `# ${fileName}\n\nExported from FocusPad on ${new Date().toLocaleDateString()}\n\n---\n\n`;
    markdown = metadata + markdown;

    // Create and download file
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.md`;
    a.click();
    URL.revokeObjectURL(url);

    showFormattingIndicator('Markdown exported successfully!');
}

function exportAsText(fileName) {
    const note = notes.find(n => n.id === activeNoteId);
    let content = writingCanvas.textContent || writingCanvas.innerText;

    // Add metadata
    const metadata = `${fileName}\nExported from FocusPad on ${new Date().toLocaleDateString()}\n\n`;
    content = metadata + content;

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    showFormattingIndicator('Text exported successfully!');
}

// --- DELETE BUTTON ---
deleteBtn.addEventListener('click', () => {
    // Check if we have a note to delete
    if (!activeNoteId) {
        showFormattingIndicator('No note to delete');
        return;
    }

    // Check if we're in empty folder state
    const folderNotes = getNotesInFolder(activeFolderId);
    if (folderNotes.length === 0) {
        showFormattingIndicator('No notes in this folder to delete');
        return;
    }

    // Check if this is the last note in the folder
    if (folderNotes.length === 1) {
        if (folderNotes[0].id === activeNoteId) {
            // This is the last note in folder - show special message
            confirmDeleteBtn.textContent = 'Delete Last Note';
        } else {
            confirmDeleteBtn.textContent = 'Delete';
        }
    } else {
        confirmDeleteBtn.textContent = 'Delete';
    }

    confirmModal.classList.add('show');
});

cancelDeleteBtn.addEventListener('click', () => {
    confirmModal.classList.remove('show');
    confirmDeleteBtn.textContent = 'Delete'; // Reset button text
});

confirmDeleteBtn.addEventListener('click', () => {
    deleteNote(activeNoteId);
    confirmModal.classList.remove('show');
    confirmDeleteBtn.textContent = 'Delete'; // Reset button text
});

confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        confirmModal.classList.remove('show');
        confirmDeleteBtn.textContent = 'Delete'; // Reset button text
    }
});

// --- NEW NOTE MODAL ---
addNoteBtn.addEventListener('click', () => {
    updateFolderDropdown();
    document.getElementById('newNoteName').value = '';

    // Set the selected folder to current active folder
    const options = document.querySelectorAll('#folderSelectOptions .select-option');
    options.forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.folderId === activeFolderId) {
            option.classList.add('selected');
            document.getElementById('selectedFolderName').textContent = option.textContent;
        }
    });

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

        // Load notes for the new active folder
        loadActiveNote();
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

// --- SHARE MODAL & LOGIC ---
const shareModal = document.getElementById('shareModal');
const shareToggle = document.getElementById('shareToggle');
const shareLinkSection = document.getElementById('shareLinkSection');
const sharePrivateMsg = document.getElementById('sharePrivateMsg');
const closeShareModalBtn = document.getElementById('closeShareModal');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const shareLinkInput = document.getElementById('shareLinkInput');

function updateShareUI(isPublic) {
    const slider = shareToggle.querySelector('.toggle-slider');
    const options = shareToggle.querySelectorAll('.toggle-option');

    if (isPublic) {
        shareToggle.classList.add('public');
        shareToggle.classList.remove('private');
        options[1].classList.add('active'); // Public
        options[0].classList.remove('active'); // Private

        shareLinkSection.classList.add('visible');
        sharePrivateMsg.classList.remove('visible');

        // Generate Link (simulated for local file)
        const noteId = activeNoteId || 'default';
        const dummyBase = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
        shareLinkInput.value = `${dummyBase}/share.html?id=${noteId}`;
    } else {
        shareToggle.classList.add('private');
        shareToggle.classList.remove('public');
        options[0].classList.add('active'); // Private
        options[1].classList.remove('active'); // Public

        sharePrivateMsg.classList.add('visible');
        shareLinkSection.classList.remove('visible');
    }
}

shareBtn.addEventListener('click', () => {
    // Don't show share modal if no active note
    if (!activeNoteId) {
        showFormattingIndicator('No note to share. Create a note first.');
        return;
    }

    // Default to private initially or load from note metadata if we had it
    const note = notes.find(n => n.id === activeNoteId);
    const isPublic = note && note.isPublic === true;

    updateShareUI(isPublic);
    shareModal.classList.add('show');
});

shareToggle.addEventListener('click', () => {
    const wasPublic = shareToggle.classList.contains('public');
    const isNowPublic = !wasPublic;

    updateShareUI(isNowPublic);

    // Save state to note
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        note.isPublic = isNowPublic;
        saveToStorage();
    }
});

closeShareModalBtn.addEventListener('click', () => {
    shareModal.classList.remove('show');
});

copyLinkBtn.addEventListener('click', () => {
    shareLinkInput.select();
    document.execCommand('copy');

    const originalIcon = copyLinkBtn.innerHTML;
    copyLinkBtn.innerHTML = '<i class="ph ph-check"></i>';
    setTimeout(() => {
        copyLinkBtn.innerHTML = originalIcon;
    }, 2000);
});

shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) {
        shareModal.classList.remove('show');
    }
});

// --- FORMATTING SHORTCUTS ---
function getCurrentLine() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return null;

    let node = selection.anchorNode;
    if (!node) return null;

    // Return text node if we're in one
    if (node.nodeType === 3) {
        return node;
    }

    // If we're in an element, get the text node at cursor
    if (node.nodeType === 1) {
        const range = selection.getRangeAt(0);
        let targetNode = range.startContainer;

        // If start container is text node, use it
        if (targetNode.nodeType === 3) {
            return targetNode;
        }

        // Otherwise find first text node child
        const walker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        return walker.nextNode() || node;
    }

    return node;
}

function processLineFormatting(lineNode) {
    if (!lineNode) return false;

    let text = lineNode.textContent || '';
    let processed = false;
    let newHTML = '';

    // Check for horizontal line shortcuts
    const trimmedText = text.trim();

    if (trimmedText === '===') {
        newHTML = '<div class="horizontal-line thick"></div>';
        processed = true;
    } else if (trimmedText === '---') {
        newHTML = '<div class="horizontal-line dashed"></div>';
        processed = true;
    }

    if (processed) {
        // Don't process formatting if no active note
        if (!activeNoteId) {
            showFormattingIndicator('Please create a note first');
            return false;
        }

        // Replace the line with horizontal line
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);

        const temp = document.createElement('div');
        temp.innerHTML = newHTML;
        const newNode = temp.firstChild;

        if (lineNode.nodeType === 3) {
            lineNode.parentNode.replaceChild(newNode, lineNode);
        } else {
            lineNode.parentNode.replaceChild(newNode, lineNode);
        }

        // Move cursor to after the horizontal line
        const newRange = document.createRange();
        newRange.setStartAfter(newNode);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        saveCurrentNote();
        return true;
    }

    // If no colon, don't process other formatting
    if (!text.includes(':')) return false;

    // Don't process formatting if no active note
    if (!activeNoteId) {
        showFormattingIndicator('Please create a note first');
        return false;
    }

    // Process colors - Support ALL native CSS color names via inline styles
    const colorRegex = /@color\.(\w+):(.*)$/i;
    if (!processed && colorRegex.test(text)) {
        const match = text.match(colorRegex);
        const colorName = match[1]; // Keep original case for colors like rebeccapurple
        const content = match[2];

        // Validate color using browser's built-in validation
        if (isValidColor(colorName) && content !== undefined) {
            // Apply theme-aware color handling
            const currentTheme = html.getAttribute('data-theme');
            let finalColor = colorName;

            // Handle black/white specifically for theme compatibility
            if (colorName.toLowerCase() === 'black') {
                if (currentTheme === 'dark') {
                    finalColor = 'var(--color-white)';
                    newHTML = `<span style="color: ${finalColor}" class="text-color-aware">${content}</span>`;
                } else {
                    newHTML = `<span style="color: ${finalColor}">${content}</span>`;
                }
            } else if (colorName.toLowerCase() === 'white') {
                if (currentTheme === 'light') {
                    finalColor = 'var(--color-black)';
                    newHTML = `<span style="color: ${finalColor}" class="text-color-aware">${content}</span>`;
                } else {
                    newHTML = `<span style="color: ${finalColor}">${content}</span>`;
                }
            } else {
                newHTML = `<span style="color: ${finalColor}">${content}</span>`;
            }
            processed = true;
        }
    }

    // Process headings: #head:, #subHead:, #head.center:, #head.red.center:, #head.center.red: (order independent)
    if (!processed) {
        const headingRegex = /#(head|subHead)((?:\.\w+)*):(.*)$/i;
        const match = text.match(headingRegex);
        if (match) {
            const [, type, modifiers, content] = match;

            // Process if content exists
            if (content !== undefined) {
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
                            // Handle theme-aware colors
                            const currentTheme = html.getAttribute('data-theme');
                            if (modLower === 'black' && currentTheme === 'dark') {
                                inlineStyles += `color: var(--color-white); `;
                            } else if (modLower === 'white' && currentTheme === 'light') {
                                inlineStyles += `color: var(--color-black); `;
                            } else {
                                inlineStyles += `color: ${modLower}; `;
                            }
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
    }

    // Process styles
    if (!processed) {
        for (const [style, className] of Object.entries(formattingConfig.styles)) {
            const regex = new RegExp(`@${style}:(.*)$`, 'i');
            if (regex.test(text)) {
                const match = text.match(regex);
                const content = match[1];

                // Only process if there's actual content
                if (content !== undefined) {
                    if (style === 'normal') {
                        newHTML = content;
                    } else {
                        newHTML = `<span class="${className}">${content}</span>`;
                    }
                    processed = true;
                    break;
                }
            }
        }
    }

    // Process alignments
    if (!processed) {
        for (const [align, className] of Object.entries(formattingConfig.alignments)) {
            const regex = new RegExp(`@align\\.${align}:(.*)$`, 'i');
            if (regex.test(text)) {
                const match = text.match(regex);
                const content = match[1];

                if (content !== undefined) {
                    newHTML = `<div class="${className}">${content}</div>`;
                    processed = true;
                    break;
                }
            }
        }
    }

    // Process code blocks
    if (!processed) {
        const codeRegex = /\$code:(.*)$/i;
        if (codeRegex.test(text)) {
            const match = text.match(codeRegex);
            const content = match[1];

            if (content.trim().length > 0) {
                newHTML = `<div class="code-block">${content}</div>`;
                processed = true;
            }
        }
    }

    // Process @setFont shortcuts - Use unified cursor-based font application
    if (!processed) {
        for (const [fontName, fontFamily] of Object.entries(formattingConfig.fonts)) {
            const regex = new RegExp(`@setFont\\.${fontName.replace(/\s+/g, '\\s+')}:(.*)$`, 'i');
            if (regex.test(text)) {
                const match = text.match(regex);
                const content = match[1];

                // Always process, even if content is empty (cursor-based application)
                if (content !== undefined) {
                    if (content.trim().length > 0) {
                        // Has content - wrap it with font
                        newHTML = `<span style="font-family: ${fontFamily}">${content}</span>`;
                    } else {
                        // No content - apply font at cursor for future typing
                        // Remove command token and trigger cursor-based font application
                        newHTML = '';
                        // Trigger unified font application after removal
                        setTimeout(() => applyFontAtCursor(fontName, true), 10);
                    }
                    processed = true;
                    break;
                }
            }
        }
    }

    if (processed && newHTML) {
        // Save cursor position BEFORE replacement
        const selection = window.getSelection();
        let savedOffset = 0;

        if (selection.rangeCount > 0) {
            const currentRange = selection.getRangeAt(0);
            const currentNode = currentRange.startContainer;
            savedOffset = currentRange.startOffset;

            // If cursor is in the line being replaced, save its offset
            let walker = currentNode;
            while (walker && walker !== writingCanvas) {
                if (walker === lineNode) {
                    // Calculate total offset from start of line
                    if (currentNode.nodeType === 3) {
                        // Text node - use the offset directly
                        savedOffset = currentRange.startOffset;
                    }
                    break;
                }
                walker = walker.parentNode;
            }
        }

        const temp = document.createElement('div');
        temp.innerHTML = newHTML;
        const newNode = temp.firstChild;

        if (newNode) {
            if (lineNode.nodeType === 3) {
                lineNode.parentNode.replaceChild(newNode, lineNode);
            } else {
                lineNode.parentNode.replaceChild(newNode, lineNode);
            }

            // Restore cursor to saved position
            const range = document.createRange();
            const textNode = newNode.firstChild || newNode;

            try {
                if (textNode.nodeType === 3) {
                    // Restore to exact saved offset in new text node
                    const safeOffset = Math.min(savedOffset, textNode.length);
                    range.setStart(textNode, safeOffset);
                    range.collapse(true);
                } else {
                    // Fallback: place at end
                    range.selectNodeContents(textNode);
                    range.collapse(false);
                }
                selection.removeAllRanges();
                selection.addRange(range);
            } catch (e) {
                // Fallback: place at end of newNode
                range.selectNodeContents(newNode);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }

            saveCurrentNote();
            return true;
        }
    }

    return false;
}

let processing = false;

writingCanvas.addEventListener('keyup', (e) => {
    if (processing) return;

    if (e.key === ':' || e.key === ' ' || e.key === 'Enter') {
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

// Update font display on cursor move
writingCanvas.addEventListener('click', () => {
    updateFontDisplay();
});

writingCanvas.addEventListener('keyup', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        updateFontDisplay();
    }
});

// Enter key handler for list continuation
writingCanvas.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        // Don't process if no active note
        if (!activeNoteId) return;

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

    // Export shortcut
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        exportBtn.click();
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
        if (exportModal.classList.contains('show')) {
            exportModal.classList.remove('show');
        }
        if (shareModal.classList.contains('show')) {
            shareModal.classList.remove('show');
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

    // Enter key in export modal for confirmation
    if (e.key === 'Enter' && exportModal.classList.contains('show') && !exportConfirmBtn.disabled) {
        e.preventDefault();
        exportConfirmBtn.click();
    }
});

// --- INITIALIZATION ---
function init() {
    loadTheme();
    loadFromStorage();
    renderNoteChips();
    loadActiveNote();
    updateFontDisplay();

    // Set initial focus
    if (activeNoteId) {
        writingCanvas.focus();
    }
}

// Start the app
init();