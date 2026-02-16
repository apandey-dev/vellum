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
    document.execCommand('fontName', false, fontName);
    saveCurrentNote();
}



// ==================== PASTE SANITIZATION (using execCommand for undo) ====================
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
function escapeHtml(unsafe) {
    return unsafe.replace(/[&<>"]/g, function (m) {
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

function hideContextMenu(keepId = false) {
    noteContextMenu.classList.remove('show');
    if (!keepId) {
        window.contextMenuNoteId = null;
    }
}

// Open context menu on right‑click
noteChips.addEventListener('contextmenu', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    e.preventDefault();

    hideContextMenu(false); // Close any existing menu and clear ID first

    window.contextMenuNoteId = chip.dataset.noteId;
    const note = notes.find(n => n.id === window.contextMenuNoteId);
    if (note) {
        ctxPin.innerHTML = note.isPinned ? '<i class="fas fa-thumbtack-slash"></i> Unpin Note' : '<i class="fas fa-thumbtack"></i> Pin Note';
    }

    // Position menu, keep within viewport
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
    hideContextMenu(true); // Keep ID for modal
});

// Pin - FIXED: undo before change, update UI
ctxPin.addEventListener('click', () => {
    if (!window.contextMenuNoteId) return;
    const note = notes.find(n => n.id === window.contextMenuNoteId);
    if (note) {
        pushToUndo(); // capture state before toggle
        note.isPinned = !note.isPinned;
        saveToStorage();
        renderNoteChips();
        // If this is the active note, update the pin button in header
        if (note.id === activeNoteId) {
            updatePinButton();
        }
        showFormattingIndicator(note.isPinned ? 'Note pinned' : 'Note unpinned');
    }
    hideContextMenu(false);
});

// Delete
ctxDelete.addEventListener('click', () => {
    if (!window.contextMenuNoteId) return;
    if (activeNoteId !== window.contextMenuNoteId) {
        switchNote(window.contextMenuNoteId);
    }
    document.getElementById('deleteBtn').click(); // triggers confirm modal
    // Note: deleteBtn click handler sets up the modal. We need to keep the ID.
    // However, deleteBtn handler normally works on activeNoteId. 
    // The modal uses window.contextMenuNoteId if set.
    hideContextMenu(true);
});

// Move to – open move modal
moveToFolderItem.addEventListener('click', () => {
    if (!window.contextMenuNoteId) return;
    openMoveModal(window.contextMenuNoteId);
    hideContextMenu(true); // Keep ID for modal
});

// Close context menu when clicking elsewhere
document.addEventListener('click', (e) => {
    if (noteContextMenu.classList.contains('show') && !noteContextMenu.contains(e.target)) {
        hideContextMenu();
    }
});