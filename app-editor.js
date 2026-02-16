// ========================================
// mindJournal - EDITOR & FORMATTING (Part 2/2)
// ========================================

// Note: Relies on DOM elements and state defined in app-core.js

// --- CONFIG ---
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
        // Use execCommand to insert HTML for undo support
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        // Delete the current line content
        range.deleteContents();
        // Insert the new element
        document.execCommand('insertHTML', false, htmlToInsert);
        // Move cursor after inserted element
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

// --- FONT SELECTOR LOGIC (using execCommand) ---
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
    // execCommand('fontName') is undoable
    document.execCommand('fontName', false, fontName);
    saveCurrentNote();
}

// --- BULLETS (using execCommand for undo) ---
const bulletsBtn = document.getElementById('bulletsBtn');
const bulletsMenu = document.getElementById('bulletsMenu');

function closeAllDropdowns() {
    bulletsMenu.classList.remove('active');
    activeDropdown = null;
    clearSavedCursorRange();
}
document.addEventListener('click', (e) => {
    if (!bulletsBtn.contains(e.target) && !bulletsMenu.contains(e.target)) closeAllDropdowns();
});
bulletsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (bulletsMenu.classList.contains('active')) closeAllDropdowns();
    else {
        closeAllDropdowns();
        bulletsMenu.classList.add('active');
        const rect = bulletsBtn.getBoundingClientRect();
        bulletsMenu.style.top = `${rect.top}px`;
    }
});
document.querySelectorAll('#bulletsMenu .dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
        insertBulletList(item.dataset.type);
        closeAllDropdowns();
    });
});
function insertBulletList(type) {
    if (!activeNoteId) return;
    writingCanvas.focus();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    let html;
    if (type === 'numbered') {
        html = '<div style="margin-left:40px;position:relative;" class="pdf-list-item numbered">1. </div>';
    } else {
        html = '<div style="margin-left:40px;position:relative;" class="pdf-list-item bullet">• </div>';
    }
    // Use execCommand for undoable insertion
    document.execCommand('insertHTML', false, html);
    // Place cursor inside the new div
    const newDiv = writingCanvas.lastChild;
    if (newDiv) {
        const newRange = document.createRange();
        newRange.setStart(newDiv, newDiv.childNodes.length);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }
    saveCurrentNote();
}

// ==================== PASTE SANITIZATION (using execCommand for undo) ====================
writingCanvas.addEventListener('paste', (e) => {
    e.preventDefault();
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    // Try plain text first
    let text = clipboardData.getData('text/plain');
    if (text) {
        // Insert plain text, preserving line breaks
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        range.deleteContents();

        // Build HTML with <br> for line breaks
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

    // Fallback to sanitized HTML
    let html = clipboardData.getData('text/html');
    if (html) {
        // Sanitize: remove style, class, id, unwanted tags
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
// Helper to escape HTML (for plain text insertion)
function escapeHtml(unsafe) {
    return unsafe.replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

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
writingCanvas.addEventListener('input', () => {
    saveCurrentNote();
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
const folderSubmenu = document.getElementById('folderSubmenu');

window.contextMenuNoteId = null;

function hideContextMenu() {
    noteContextMenu.classList.remove('show');
    folderSubmenu.classList.remove('show');
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
    hideContextMenu(); // Close any existing menu
    // Position menu near cursor
    noteContextMenu.style.left = `${e.pageX}px`;
    noteContextMenu.style.top = `${e.pageY}px`;
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
        note.isPinned = !note.isPinned;
        saveToStorage();
        renderNoteChips();
        if (note.id === activeNoteId) updatePinButton();
        showFormattingIndicator(note.isPinned ? 'Note pinned' : 'Note unpinned');
    }
    hideContextMenu();
});

// Delete
ctxDelete.addEventListener('click', () => {
    if (!window.contextMenuNoteId) return;
    // Set active note to the one we want to delete (so delete confirmation uses it)
    if (activeNoteId !== window.contextMenuNoteId) {
        switchNote(window.contextMenuNoteId);
    }
    // Open delete confirmation
    document.getElementById('deleteBtn').click(); // triggers confirm modal
    hideContextMenu(); // hide context menu, modal will appear
});

// Move to – build submenu on hover
moveToFolderItem.addEventListener('mouseenter', () => {
    if (!window.contextMenuNoteId) return;
    folderSubmenu.innerHTML = '';
    // List all folders
    folders.forEach(f => {
        const note = notes.find(n => n.id === window.contextMenuNoteId);
        if (note && note.folderId === f.id) return; // skip current folder
        const opt = document.createElement('div');
        opt.className = 'folder-option';
        opt.textContent = f.name;
        opt.dataset.folderId = f.id;
        folderSubmenu.appendChild(opt);
    });
    // Add "New Folder..." option
    const newFolderOpt = document.createElement('div');
    newFolderOpt.className = 'folder-option';
    newFolderOpt.innerHTML = '<i class="fas fa-plus" style="margin-right: 6px;"></i> New Folder...';
    newFolderOpt.dataset.action = 'newFolder';
    folderSubmenu.appendChild(newFolderOpt);

    if (folderSubmenu.children.length === 1 && folderSubmenu.children[0].dataset.action === 'newFolder') {
        // Only "New Folder..." exists (no other folders)
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'folder-option';
        emptyMsg.style.opacity = '0.5';
        emptyMsg.style.cursor = 'default';
        emptyMsg.textContent = 'No other folders';
        folderSubmenu.prepend(emptyMsg);
    }

    folderSubmenu.classList.add('show');
});

// Handle folder selection
folderSubmenu.addEventListener('click', (e) => {
    const opt = e.target.closest('.folder-option');
    if (!opt || !window.contextMenuNoteId) return;

    if (opt.dataset.action === 'newFolder') {
        // Open folder creation modal and after creation, move note to that new folder
        // We'll use the existing manage folders modal, but we need to know when a new folder is created.
        // Simpler: open a small prompt? But we have a modal already. Let's open the manage folders modal,
        // and after the user creates a folder there, we can move the note. However, the modal is independent.
        // Alternative: Use the same "Create Folder" from manage folders, but we need to know when it's done.
        // We'll implement a temporary inline prompt for simplicity.
        const newFolderName = prompt('Enter new folder name:');
        if (newFolderName && newFolderName.trim()) {
            const folder = { id: generateId(), name: newFolderName.trim(), isDefault: false };
            folders.push(folder);
            saveToStorage();
            renderFolderList();      // update folder list in manage modal
            updateFolderDropdown();  // update dropdown in new note modal
            // Now move the note to this new folder
            moveNoteToFolder(window.contextMenuNoteId, folder.id);
        }
        hideContextMenu();
        return;
    }

    const folderId = opt.dataset.folderId;
    if (folderId) {
        moveNoteToFolder(window.contextMenuNoteId, folderId);
    }
    hideContextMenu();
});

// Close context menu when clicking elsewhere
document.addEventListener('click', (e) => {
    if (noteContextMenu.classList.contains('show') && !noteContextMenu.contains(e.target)) {
        hideContextMenu();
    }
});

// Function to move a note to a different folder
function moveNoteToFolder(noteId, targetFolderId) {
    const note = notes.find(n => n.id === noteId);
    if (!note || note.folderId === targetFolderId) return;

    const sourceFolderId = note.folderId;
    note.folderId = targetFolderId;
    saveToStorage();

    // If the moved note was the active note and its source folder is the current folder,
    // we need to switch to another note in the current folder (or show empty)
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
        // Just refresh chips (the note disappears from current folder's list)
        renderNoteChips();
    }

    showFormattingIndicator('Note moved', 'success');
}