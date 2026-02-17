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
// --- EVENTS ---
let processing = false;

// Enhanced Input Handler for Inline Shortcuts
// Helper to find the nearest block-level parent (div, p, etc.) of a node
function getLineBlock(node) {
    while (node && node.parentElement !== writingCanvas && node !== writingCanvas) {
        node = node.parentElement;
    }
    return node;
}

// Enhanced Input Handler for Inline Shortcuts
function handleInlineShortcuts(e) {
    // 1. Handle Navigation & Block-Breaking keys
    if (e.key === 'Enter') return;
    if (e.inputType === 'deleteContentBackward') return;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    // We only care about text nodes for pattern matching
    if (node.nodeType !== 3) return;

    const text = node.textContent;
    const offset = range.startOffset;

    // --- HELPER: Convert Block to Element (Preserving Content) ---
    const convertBlockTo = (tagName, styles = {}) => {
        const lineBlock = getLineBlock(node);
        if (!lineBlock) return;

        const newEl = document.createElement(tagName);

        // Move children to preserve spans/formatting
        while (lineBlock.firstChild) {
            newEl.appendChild(lineBlock.firstChild);
        }

        // Apply styles
        Object.assign(newEl.style, styles);

        // Replace
        lineBlock.replaceWith(newEl);

        // Restore Cursor (put at end of new element content)
        const newRange = document.createRange();
        newRange.selectNodeContents(newEl);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
        saveCurrentNote();
    };


    // --- 1. HEADING SHORTCUTS (### , ## ) ---
    // Rule: Must preserve existing colors/spans.
    // Logic: Remove the marker text, THEN convert block.

    // H3 (### )
    if (text.slice(0, offset).endsWith('### ')) {
        const start = offset - 4; // Length of "### "
        // Verify it's effectively at the start (ignoring purely whitespace text nodes before it?)
        // For simplicity and strictness requested: Check if text content of block *starts* with it 
        // OR if the node text itself is the trigger.
        // To support "Color then ##": The block text will start with "Text ##". 
        // Wait, "Heading must work even if color is active".
        // Example: "@red. Text" -> user types "## " ?? No.
        // Example: User types "@red. ## " -> Text is red "## ".
        // Then space. 
        // We should just detect if "## " exists and remove it, then promote the block.

        // Remove the characters "### "
        const rangeToDelete = document.createRange();
        rangeToDelete.setStart(node, start);
        rangeToDelete.setEnd(node, offset);
        rangeToDelete.deleteContents();

        convertBlockTo('h3');
        return;
    }

    // H2 (## )
    if (text.slice(0, offset).endsWith('## ')) {
        const start = offset - 3;
        const rangeToDelete = document.createRange();
        rangeToDelete.setStart(node, start);
        rangeToDelete.setEnd(node, offset);
        rangeToDelete.deleteContents();

        convertBlockTo('h2');
        return;
    }

    // LIST SHORTCUT (* )
    if (text.slice(0, offset).endsWith('* ')) {
        // Strict start check for lists usually, but consistent with above:
        const rangeToDelete = document.createRange();
        rangeToDelete.setStart(node, offset - 2);
        rangeToDelete.setEnd(node, offset);
        rangeToDelete.deleteContents();

        // Special: Lists need <ul> wrapper if not present? 
        // Current requirement: "Convert *. "
        // convertBlockTo 'li' ? 
        // If we just make it an 'li', browser might wrap in clean ul or leave it. 
        // Best to wrap in UL.

        const lineBlock = getLineBlock(node);
        if (lineBlock) {
            const ul = document.createElement('ul');
            const li = document.createElement('li');

            // Move children to li
            while (lineBlock.firstChild) {
                li.appendChild(lineBlock.firstChild);
            }
            ul.appendChild(li);
            lineBlock.replaceWith(ul);

            const newRange = document.createRange();
            newRange.selectNodeContents(li);
            newRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(newRange);
            saveCurrentNote();
            return;
        }
    }


    // --- 2. COMBINED SHORTCUTS (#head.center.red:) ---
    // Trigger on ':'
    if (e.data === ':') {
        const textBeforeCursor = text.slice(0, offset);
        // Regex: #head followed by dots and words, ending with :
        // Capture group 1: modifiers (center.red)
        const match = textBeforeCursor.match(/#head\.([a-zA-Z0-9.]+):$/);

        if (match) {
            const modifiersStr = match[1]; // e.g. "center.red"
            const fullMatch = match[0];
            const start = offset - fullMatch.length;

            // Delete command
            const rangeToDelete = document.createRange();
            rangeToDelete.setStart(node, start);
            rangeToDelete.setEnd(node, offset);
            rangeToDelete.deleteContents();

            // Parse Modifiers
            const modifiers = modifiersStr.split('.');
            const styles = {};

            modifiers.forEach(mod => {
                if (['center', 'left', 'right', 'justify'].includes(mod)) {
                    styles.textAlign = mod;
                } else {
                    // Assume color
                    styles.color = mod;
                }
            });

            // Convert to H1 (per user request #head -> h1)
            convertBlockTo('h1', styles);
            return;
        }
    }

    // --- 3. INLINE SHORTCUTS (Trigger: .) ---
    if (e.data === '.') {
        const textBeforeCursor = text.slice(0, offset);

        // Colors: @red., @blue.
        const colorMatch = textBeforeCursor.match(/@([a-zA-Z]+)\.$/);
        if (colorMatch) {
            const colorName = colorMatch[1];
            const matchLength = colorMatch[0].length;
            const start = offset - matchLength;

            const rangeToDelete = document.createRange();
            rangeToDelete.setStart(node, start);
            rangeToDelete.setEnd(node, offset);
            rangeToDelete.deleteContents();

            const span = document.createElement('span');
            span.style.color = colorName;
            span.innerHTML = '&#8203;';

            rangeToDelete.insertNode(span);

            const newRange = document.createRange();
            newRange.setStart(span.firstChild, 1);
            newRange.collapse(true);

            selection.removeAllRanges();
            selection.addRange(newRange);
            saveCurrentNote();
            return;
        }

        // Headings: @head.
        if (textBeforeCursor.endsWith('@head.')) {
            const start = offset - 6;
            const rangeToDelete = document.createRange();
            rangeToDelete.setStart(node, start);
            rangeToDelete.setEnd(node, offset);
            rangeToDelete.deleteContents();

            const el = document.createElement('h2');
            el.className = 'inline-heading';
            el.style.display = 'inline'; // Ensure
            el.innerHTML = '&#8203;';

            rangeToDelete.insertNode(el);

            const newRange = document.createRange();
            newRange.setStart(el.firstChild, 1);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            saveCurrentNote();
            return;
        }

        // Subheadings: @subHead.
        if (textBeforeCursor.endsWith('@subHead.')) {
            const start = offset - 9;
            const rangeToDelete = document.createRange();
            rangeToDelete.setStart(node, start);
            rangeToDelete.setEnd(node, offset);
            rangeToDelete.deleteContents();

            const el = document.createElement('h3');
            el.className = 'inline-subheading';
            el.style.display = 'inline';
            el.innerHTML = '&#8203;';

            rangeToDelete.insertNode(el);

            const newRange = document.createRange();
            newRange.setStart(el.firstChild, 1);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            saveCurrentNote();
            return;
        }

        // Code: @code.
        if (textBeforeCursor.endsWith('@code.')) {
            const start = offset - 6;
            const rangeToReplace = document.createRange();
            rangeToReplace.setStart(node, start);
            rangeToReplace.setEnd(node, offset);
            rangeToReplace.deleteContents();

            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.textContent = '\u200B';
            pre.appendChild(code);

            rangeToReplace.insertNode(pre);

            const newRange = document.createRange();
            newRange.setStart(code.firstChild, 1);
            newRange.collapse(true);

            selection.removeAllRanges();
            selection.addRange(newRange);
            saveCurrentNote();
            return;
        }
    }
}

// Attach Event Listeners
writingCanvas.addEventListener('input', handleInlineShortcuts);

writingCanvas.addEventListener('keyup', (e) => {
    if (processing) return;

    if (e.key === 'Enter') {
        processing = true;
        const lineNode = getCurrentLine();

        // --- Specific HR Handler for '---' ---
        // processLineFormatting already handles '---', so we just need to ensure
        // it's called. The existing logic below calls it.
        // We will add a small safety check to ensure it doesn't leave '---' key presses
        // if for some reason processLineFormatting fails or detects differently.
        const processed = processLineFormatting(lineNode);
        if (processed) showFormattingIndicator('Horizontal Rule inserted');

        processing = false;
    } else if (e.key === ' ') {
        // Space triggers '===' (double line) in processLineFormatting
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