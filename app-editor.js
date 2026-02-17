// ========================================
// mindJournal - EDITOR & FORMATTING (Rebuilt)
// ========================================

// --- Dependencies ---
// Uses writingCanvas, pushToUndo, saveCurrentNote, showFormattingIndicator from app-core.js
// Also relies on global notes array, activeNoteId, etc.

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
let isProcessing = false; // Prevent recursive event triggering

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

// --- Get the top-level block (direct child of writingCanvas) containing node ---
function getLineBlock(node) {
    while (node && node.parentElement !== writingCanvas && node !== writingCanvas) {
        node = node.parentElement;
    }
    return node === writingCanvas ? null : node;
}

// --- Convert a block to a new element, preserving content ---
function convertBlockTo(newTagName, lineBlock, preserveContent = true, className = '') {
    if (!lineBlock) return null;
    const newEl = document.createElement(newTagName);
    if (className) newEl.className = className;

    // Move all children / text content
    if (lineBlock.nodeType === 3) { // text node
        newEl.textContent = lineBlock.textContent;
    } else {
        while (lineBlock.firstChild) newEl.appendChild(lineBlock.firstChild);
    }

    // Ensure empty block is focusable
    if (!newEl.textContent.trim() && newEl.children.length === 0) {
        newEl.innerHTML = '&#8203;';
    }

    lineBlock.replaceWith(newEl);
    return newEl;
}

// --- Unwrap a special block to a normal paragraph (div) ---
function unwrapBlock(lineBlock) {
    if (!lineBlock) return null;
    const newDiv = document.createElement('div');
    if (lineBlock.nodeType === 3) {
        newDiv.textContent = lineBlock.textContent;
    } else {
        while (lineBlock.firstChild) newDiv.appendChild(lineBlock.firstChild);
    }
    if (!newDiv.textContent.trim() && newDiv.children.length === 0) {
        newDiv.innerHTML = '<br>';
    }
    lineBlock.replaceWith(newDiv);
    return newDiv;
}

// --- Restore cursor after DOM mutation ---
function setCursorAtEnd(element) {
    const range = document.createRange();
    const sel = window.getSelection();
    if (element.nodeType === 3) {
        range.setStart(element, element.length);
        range.collapse(true);
    } else {
        if (element.lastChild) {
            range.setStartAfter(element.lastChild);
        } else {
            range.selectNodeContents(element);
        }
        range.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(range);
    writingCanvas.focus();
}

// --- Inline color handler ---
function applyColorAtCursor(colorName) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) {
        // Wrap selection with color span
        const span = document.createElement('span');
        span.style.color = colorName;
        range.surroundContents(span);
        setCursorAtEnd(span);
    } else {
        // Insert color span at cursor
        const span = document.createElement('span');
        span.style.color = colorName;
        span.innerHTML = '&#8203;'; // zero-width space
        range.insertNode(span);
        setCursorAtEnd(span.firstChild);
    }
    saveCurrentNote();
}

// --- Transform current line based on typed pattern (called from input) ---
function handleInlineShortcuts(e) {
    if (isProcessing) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== 3) return; // only text nodes

    const text = node.textContent;
    const offset = range.startOffset;
    const lineBlock = getLineBlock(node);
    if (!lineBlock) return;

    // Helper to check if cursor is at start of line (ignoring leading whitespace)
    const textBeforeCursor = text.slice(0, offset);
    const trimmedBefore = textBeforeCursor.trim();
    const isLineStart = (trimmedBefore.length === 0);

    // 1. Headings
    if (isLineStart && textBeforeCursor.endsWith('## ')) {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();
        const start = offset - 3;
        range.setStart(node, start);
        range.setEnd(node, offset);
        range.deleteContents();
        const newBlock = convertBlockTo('h2', lineBlock);
        setCursorAtEnd(newBlock);
        saveCurrentNote();
        isProcessing = false;
        return;
    }
    if (isLineStart && textBeforeCursor.endsWith('### ')) {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();
        const start = offset - 4;
        range.setStart(node, start);
        range.setEnd(node, offset);
        range.deleteContents();
        const newBlock = convertBlockTo('h3', lineBlock);
        setCursorAtEnd(newBlock);
        saveCurrentNote();
        isProcessing = false;
        return;
    }

    // 2. Bullet list
    if (isLineStart && textBeforeCursor.endsWith('* ')) {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();
        const start = offset - 2;
        range.setStart(node, start);
        range.setEnd(node, offset);
        range.deleteContents();

        const ul = document.createElement('ul');
        const li = document.createElement('li');
        if (lineBlock.nodeType === 3) {
            li.textContent = lineBlock.textContent;
        } else {
            while (lineBlock.firstChild) li.appendChild(lineBlock.firstChild);
        }
        if (!li.textContent.trim()) li.innerHTML = '&#8203;';
        ul.appendChild(li);
        lineBlock.replaceWith(ul);
        setCursorAtEnd(li);
        saveCurrentNote();
        isProcessing = false;
        return;
    }

    // 3. Checkbox
    if (isLineStart && textBeforeCursor.endsWith('[] ')) {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();
        const start = offset - 3;
        range.setStart(node, start);
        range.setEnd(node, offset);
        range.deleteContents();

        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-item';

        const label = document.createElement('label');
        label.className = 'custom-checkbox-wrapper';
        label.contentEditable = 'false';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('click', function () {
            this.closest('.task-item').classList.toggle('completed');
            saveCurrentNote();
        });

        const checkmark = document.createElement('span');
        checkmark.className = 'checkmark';

        label.appendChild(checkbox);
        label.appendChild(checkmark);

        const contentSpan = document.createElement('span');
        contentSpan.style.flex = '1';
        if (lineBlock.nodeType === 3) {
            contentSpan.textContent = lineBlock.textContent;
        } else {
            while (lineBlock.firstChild) contentSpan.appendChild(lineBlock.firstChild);
        }
        if (!contentSpan.textContent.trim()) contentSpan.innerHTML = '&#8203;';

        taskDiv.appendChild(label);
        taskDiv.appendChild(contentSpan);
        lineBlock.replaceWith(taskDiv);
        setCursorAtEnd(contentSpan);
        saveCurrentNote();
        isProcessing = false;
        return;
    }

    // 4. Blockquote
    if (isLineStart && textBeforeCursor.endsWith('> ')) {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();
        const start = offset - 2;
        range.setStart(node, start);
        range.setEnd(node, offset);
        range.deleteContents();
        const newBlock = convertBlockTo('blockquote', lineBlock);
        setCursorAtEnd(newBlock);
        saveCurrentNote();
        isProcessing = false;
        return;
    }

    // 5. Horizontal rule (---) – must be the whole line
    if (isLineStart && text.trim() === '---' && offset === text.length) {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();
        const hr = document.createElement('hr');
        hr.className = 'horizontal-line';
        const p = document.createElement('div');
        p.innerHTML = '<br>';
        lineBlock.replaceWith(hr);
        hr.after(p);
        setCursorAtEnd(p);
        saveCurrentNote();
        isProcessing = false;
        return;
    }

    // 6. Inline color (@color.)
    if (e.data === '.') {
        const match = textBeforeCursor.match(/@([a-zA-Z]+)\.$/);
        if (match) {
            e.preventDefault();
            isProcessing = true;
            pushToUndo();
            const colorName = match[1];
            const start = offset - match[0].length;
            range.setStart(node, start);
            range.setEnd(node, offset);
            range.deleteContents();

            const span = document.createElement('span');
            span.style.color = colorName;
            span.innerHTML = '&#8203;';
            range.insertNode(span);
            setCursorAtEnd(span.firstChild);
            saveCurrentNote();
            isProcessing = false;
        }
    }
}

// --- Backspace handler (unwrap at start) ---
function handleBackspace(e) {
    if (e.key !== 'Backspace' || isProcessing) return;
    const sel = window.getSelection();
    if (!sel.rangeCount || !sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (range.startOffset !== 0) return; // not at start

    const lineBlock = getLineBlock(node);
    if (!lineBlock) return;

    const isSpecial = lineBlock.tagName === 'H2' || lineBlock.tagName === 'H3' ||
        lineBlock.tagName === 'LI' || lineBlock.tagName === 'BLOCKQUOTE' ||
        lineBlock.classList.contains('task-item');

    if (!isSpecial) return;

    e.preventDefault();
    isProcessing = true;
    pushToUndo();

    // For list items, need to handle list structure
    if (lineBlock.tagName === 'LI') {
        const parentUl = lineBlock.parentNode;
        if (parentUl.children.length === 1) {
            // Only one item, replace whole ul with div
            const newDiv = document.createElement('div');
            while (lineBlock.firstChild) newDiv.appendChild(lineBlock.firstChild);
            parentUl.replaceWith(newDiv);
            setCursorAtEnd(newDiv);
        } else {
            // More than one item, split the list
            const index = Array.from(parentUl.children).indexOf(lineBlock);
            const before = Array.from(parentUl.children).slice(0, index);
            const after = Array.from(parentUl.children).slice(index + 1);

            const newDiv = document.createElement('div');
            while (lineBlock.firstChild) newDiv.appendChild(lineBlock.firstChild);

            // Replace the current li with newDiv, then reinsert remaining lists
            const fragment = document.createDocumentFragment();
            if (before.length) {
                const ulBefore = document.createElement('ul');
                before.forEach(li => ulBefore.appendChild(li));
                fragment.appendChild(ulBefore);
            }
            fragment.appendChild(newDiv);
            if (after.length) {
                const ulAfter = document.createElement('ul');
                after.forEach(li => ulAfter.appendChild(li));
                fragment.appendChild(ulAfter);
            }
            parentUl.replaceWith(fragment);
            setCursorAtEnd(newDiv);
        }
    } else {
        // Non-list special blocks
        const newDiv = unwrapBlock(lineBlock);
        setCursorAtEnd(newDiv);
    }
    saveCurrentNote();
    isProcessing = false;
}

// --- Enter key handler (create new line in lists/tasks) ---
function handleEnter(e) {
    if (e.key !== 'Enter' || isProcessing) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const node = sel.anchorNode;
    const lineBlock = getLineBlock(node);
    if (!lineBlock) return;

    if (lineBlock.tagName === 'LI') {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();

        const newLi = document.createElement('li');
        newLi.innerHTML = '&#8203;';
        lineBlock.parentNode.insertBefore(newLi, lineBlock.nextSibling);
        setCursorAtEnd(newLi);
        saveCurrentNote();
        isProcessing = false;
    } else if (lineBlock.classList.contains('task-item')) {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();

        const newTask = document.createElement('div');
        newTask.className = 'task-item';
        newTask.innerHTML = `
            <label class="custom-checkbox-wrapper" contenteditable="false">
                <input type="checkbox">
                <span class="checkmark"></span>
            </label>
            <span style="flex:1;">&#8203;</span>
        `;
        // Add click handler to the new checkbox
        const cb = newTask.querySelector('input');
        cb.addEventListener('click', function () {
            this.closest('.task-item').classList.toggle('completed');
            saveCurrentNote();
        });
        lineBlock.parentNode.insertBefore(newTask, lineBlock.nextSibling);
        const contentSpan = newTask.querySelector('span:last-child');
        setCursorAtEnd(contentSpan);
        saveCurrentNote();
        isProcessing = false;
    } else if (lineBlock.tagName === 'H2' || lineBlock.tagName === 'H3' || lineBlock.tagName === 'BLOCKQUOTE') {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();

        const newP = document.createElement('div');
        newP.innerHTML = '<br>';
        lineBlock.parentNode.insertBefore(newP, lineBlock.nextSibling);
        setCursorAtEnd(newP);
        saveCurrentNote();
        isProcessing = false;
    }
}

// --- Editor Context Menu ---
const editorContextMenu = document.getElementById('editorContextMenu');
const colorSubmenuTrigger = document.getElementById('colorSubmenuTrigger');
const colorSubmenu = document.getElementById('colorSubmenu');

writingCanvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // Hide any other context menus
    document.getElementById('noteContextMenu').classList.remove('show');
    editorContextMenu.classList.remove('show');

    // Position near cursor
    const x = Math.min(e.pageX, window.innerWidth - 250);
    const y = Math.min(e.pageY, window.innerHeight - 300);
    editorContextMenu.style.left = x + 'px';
    editorContextMenu.style.top = y + 'px';
    editorContextMenu.classList.add('show');
});

// Hide when clicking outside
document.addEventListener('click', (e) => {
    if (!editorContextMenu.contains(e.target) && e.target !== writingCanvas) {
        editorContextMenu.classList.remove('show');
    }
});

// Submenu positioning
colorSubmenuTrigger.addEventListener('mouseenter', () => {
    const rect = colorSubmenuTrigger.getBoundingClientRect();
    colorSubmenu.style.left = rect.width + 'px';
    colorSubmenu.style.top = '0';
});

// Context menu actions
editorContextMenu.addEventListener('click', (e) => {
    const target = e.target.closest('.context-menu-item');
    if (!target || target.classList.contains('has-submenu')) return;

    const action = target.dataset.action;
    const color = target.dataset.color;
    if (!action && !color) return;

    e.preventDefault();
    editorContextMenu.classList.remove('show');

    // Get current line block
    const sel = window.getSelection();
    let lineBlock = null;
    if (sel.rangeCount) {
        lineBlock = getLineBlock(sel.anchorNode);
    }
    if (!lineBlock) {
        // If no selection, use first child? fallback: create new line at end
        lineBlock = document.createElement('div');
        writingCanvas.appendChild(lineBlock);
    }

    pushToUndo();

    if (action === 'heading1') {
        const newEl = convertBlockTo('h2', lineBlock); // using h2 for heading1
        setCursorAtEnd(newEl);
    } else if (action === 'heading2') {
        const newEl = convertBlockTo('h3', lineBlock);
        setCursorAtEnd(newEl);
    } else if (action === 'bulletList') {
        const ul = document.createElement('ul');
        const li = document.createElement('li');
        if (lineBlock.nodeType === 3) {
            li.textContent = lineBlock.textContent;
        } else {
            while (lineBlock.firstChild) li.appendChild(lineBlock.firstChild);
        }
        if (!li.textContent.trim()) li.innerHTML = '&#8203;';
        ul.appendChild(li);
        lineBlock.replaceWith(ul);
        setCursorAtEnd(li);
    } else if (action === 'checkbox') {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-item';
        taskDiv.innerHTML = `
            <label class="custom-checkbox-wrapper" contenteditable="false">
                <input type="checkbox">
                <span class="checkmark"></span>
            </label>
            <span style="flex:1;">&#8203;</span>
        `;
        const cb = taskDiv.querySelector('input');
        cb.addEventListener('click', function () {
            this.closest('.task-item').classList.toggle('completed');
            saveCurrentNote();
        });
        // Move content if any
        const contentSpan = taskDiv.querySelector('span:last-child');
        if (lineBlock.nodeType === 3) {
            contentSpan.textContent = lineBlock.textContent;
        } else {
            while (lineBlock.firstChild) contentSpan.appendChild(lineBlock.firstChild);
        }
        if (!contentSpan.textContent.trim()) contentSpan.innerHTML = '&#8203;';
        lineBlock.replaceWith(taskDiv);
        setCursorAtEnd(contentSpan);
    } else if (action === 'blockquote') {
        const newEl = convertBlockTo('blockquote', lineBlock);
        setCursorAtEnd(newEl);
    } else if (color) {
        applyColorAtCursor(color);
    }

    saveCurrentNote();
    showFormattingIndicator('Applied', 'success');
});

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

// --- PASTE SANITIZATION ---
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
writingCanvas.addEventListener('input', handleInlineShortcuts);
writingCanvas.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') handleBackspace(e);
    if (e.key === 'Enter') handleEnter(e);
});
writingCanvas.addEventListener('click', () => {
    updateFontDisplay();
});
writingCanvas.addEventListener('keyup', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) updateFontDisplay();
});
writingCanvas.addEventListener('focus', () => updateFontDisplay());

// Also update font when selection changes (for cursor moves)
document.addEventListener('selectionchange', () => {
    if (document.activeElement === writingCanvas) {
        updateFontDisplay();
    }
});

// --- Ensure the font display is correct after the editor loads ---
updateFontDisplay();