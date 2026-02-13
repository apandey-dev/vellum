// ========================================
// mindJournal - EDITOR & FORMATTING (Part 2/2)
// ========================================

// Note: Relies on DOM elements and state defined in app-core.js

// --- CONFIG ---
const formattingConfig = {
    styles: { 'bold': 'text-bold', 'italic': 'text-italic', 'underline': 'text-underline', 'strike': 'text-strike', 'normal': 'format-reset' },
    alignments: { 'left': 'text-left', 'center': 'text-center', 'right': 'text-right' },
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

const colorClassMap = {
    'red': 'text-color-red', 'blue': 'text-color-blue', 'green': 'text-color-green', 'yellow': 'text-color-yellow',
    'purple': 'text-color-purple', 'pink': 'text-color-pink', 'orange': 'text-color-orange', 'gray': 'text-color-gray',
    'black': 'text-color-black', 'white': 'text-color-white', 'tomato': 'text-color-tomato'
    // ... add other colors as needed from original list
};

let isProcessingInlineCommand = false;
let activeFormattingSpan = null;
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

// --- COLOR HELPERS ---
function isValidColor(colorStr) {
    const s = new Option().style;
    s.color = colorStr;
    return s.color !== '';
}

// --- INLINE FORMATTING PARSING ---
function parseInlineCommand(command) {
    const result = { classes: ['inline-format'], styles: {}, elementType: 'span', attributes: {} };
    const cleanCommand = command.startsWith('@') ? command.substring(1) : command.substring(1);
    result.attributes['data-format'] = cleanCommand;

    if (command.startsWith('$') && cleanCommand === 'code') {
        result.classes.push('format-code');
        return result;
    }

    const parts = cleanCommand.split('.');
    parts.forEach(part => {
        const lowerPart = part.toLowerCase();
        if (colorClassMap[lowerPart]) result.classes.push(colorClassMap[lowerPart]);
        else if (isValidColor(part)) result.styles.color = part;
        else {
            switch (lowerPart) {
                case 'head': result.classes.push('inline-head'); break;
                case 'subhead': result.classes.push('inline-subhead'); break;
                case 'bold': result.classes.push('format-bold'); break;
                case 'italic': result.classes.push('format-italic'); break;
                case 'center': result.classes.push('format-center'); break;
            }
        }
    });
    return result;
}

function applyInlineFormatting(command) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    const isCollapsed = range.collapsed;
    const formatInfo = parseInlineCommand(command);

    const formatElement = document.createElement(formatInfo.elementType);
    formatElement.className = formatInfo.classes.join(' ');
    Object.keys(formatInfo.styles).forEach(k => formatElement.style[k] = formatInfo.styles[k]);
    if (formatInfo.attributes) {
        Object.keys(formatInfo.attributes).forEach(a => formatElement.setAttribute(a, formatInfo.attributes[a]));
    }

    const zwsp = document.createTextNode('\u200B');
    formatElement.appendChild(zwsp);

    if (!isCollapsed) {
        const selectedContent = range.extractContents();
        formatElement.appendChild(selectedContent);
        range.insertNode(formatElement);
        const newRange = document.createRange();
        newRange.setStartAfter(formatElement);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    } else {
        range.insertNode(formatElement);
        const newRange = document.createRange();
        newRange.setStart(zwsp, 1);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }

    activeFormattingSpan = formatElement;
    formatElement.classList.add('formatting-active');
    writingCanvas.focus();
    return formatElement;
}

function cleanupZeroWidthSpace(element) {
    if (!element) return;
    const textContent = element.textContent;
    if (textContent.includes('\u200B')) {
        if (textContent.replace(/\u200B/g, '').length > 0) {
            element.innerHTML = element.innerHTML.replace(/\u200B/g, '');
        }
    }
    element.classList.remove('formatting-active');
}

function detectInlineCommand(event) {
    if (isProcessingInlineCommand) return false;
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== 3) return false;

    const text = node.textContent;
    const cursorPos = range.startOffset;
    const textBeforeCursor = text.substring(0, cursorPos);
    const commandMatch = textBeforeCursor.match(/(@[a-zA-Z.]+|\$[a-zA-Z]+)\s+$/);

    if (commandMatch) {
        const fullCommand = commandMatch[1];
        const commandStart = commandMatch.index;
        isProcessingInlineCommand = true;

        const newText = text.substring(0, commandStart) + text.substring(cursorPos);
        node.textContent = newText;
        range.setStart(node, commandStart);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        const formatElement = applyInlineFormatting(fullCommand);
        showFormattingIndicator(`Formatting: ${fullCommand}`);

        setTimeout(() => { isProcessingInlineCommand = false; }, 10);

        if (formatElement) {
            const monitorTyping = () => {
                cleanupZeroWidthSpace(formatElement);
                writingCanvas.removeEventListener('input', monitorTyping);
            };
            writingCanvas.addEventListener('input', monitorTyping);
        }
        saveCurrentNote();
        return true;
    }
    return false;
}

// --- LINE FORMATTING (Shortcuts) ---
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
    let newHTML = '';

    const trimmedText = text.trim();
    if (trimmedText === '===') {
        newHTML = '<div class="horizontal-line thick"></div>';
        processed = true;
    } else if (trimmedText === '---') {
        newHTML = '<div class="horizontal-line dashed"></div>';
        processed = true;
    }

    if (processed) {
        const selection = window.getSelection();
        const temp = document.createElement('div');
        temp.innerHTML = newHTML;
        const newNode = temp.firstChild;
        if (lineNode.nodeType === 3) lineNode.parentNode.replaceChild(newNode, lineNode);
        else lineNode.parentNode.replaceChild(newNode, lineNode);

        const newRange = document.createRange();
        newRange.setStartAfter(newNode);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        saveCurrentNote();
        return true;
    }

    // New Line Shortcuts (@head, @color, etc.)
    const headPattern = /^(#head|#subhead)((?:\.\w+)*)(?:\s+)(.*)$/i;
    const colorPattern = /^@color\.([\w#]+)(?:\s+)(.*)$/i;
    const alignPattern = /^@align\.(center|left|right|justify)(?:\s+)(.*)$/i;
    let match;

    if (match = text.match(headPattern)) {
        const type = match[1].toLowerCase();
        const parts = match[2].split('.').filter(p => p);
        const content = match[3];
        if (!content.trim()) return false;
        let color = null, center = false;
        parts.forEach(p => { if (p.toLowerCase() === 'center') center = true; else if (isValidColor(p)) color = p; });
        let style = color ? `color: ${color}; ` : '';
        if (center) style += 'text-align: center; ';
        const cls = type === '#head' ? 'heading-main' : 'heading-sub';
        newHTML = `<div class="${cls}" style="${style}">${content}</div>`;
        processed = true;
    } else if (match = text.match(colorPattern)) {
        if (isValidColor(match[1]) && match[2].trim()) {
            newHTML = `<div style="color: ${match[1]};">${match[2]}</div>`;
            processed = true;
        }
    } else if (match = text.match(alignPattern)) {
        if (match[2].trim()) {
            newHTML = `<div style="text-align: ${match[1]};">${match[2]}</div>`;
            processed = true;
        }
    }

    // Legacy Support
    if (!processed) {
        const legacyRegex = /^@(head|color|bold|italic|align|setFont)(?:[\.\s]([\w#\-\(\),]+))?\s*:\s*(.*)$/i;
        const lMatch = text.match(legacyRegex);
        if (lMatch) {
            const cmd = lMatch[1].toLowerCase();
            const param = lMatch[2] ? lMatch[2].trim() : null;
            const content = lMatch[3];
            if (cmd === 'head') newHTML = `<h1 class="inline-head" style="${param ? 'color:' + param : ''}">${content}</h1>`;
            else if (cmd === 'color' && param) newHTML = `<span style="color: ${param};">${content}</span>`;
            else if (cmd === 'bold') newHTML = `<span class="format-bold" style="${param ? 'color:' + param : ''}">${content}</span>`;
            else if (cmd === 'italic') newHTML = `<span class="format-italic">${content}</span>`;
            else if (cmd === 'align') newHTML = `<div style="text-align: ${param}; width: 100%; display: block;">${content}</div>`;
            else if (cmd === 'setfont') newHTML = `<span style="font-family: inherit;">${content}</span>`; // Simplified font logic
            processed = true;
        }
    }

    if (processed && newHTML) {
        const temp = document.createElement('div');
        temp.innerHTML = newHTML;
        const newNode = temp.firstChild;
        if (lineNode.parentNode) lineNode.parentNode.replaceChild(newNode, lineNode);
        // Reset cursor logic simplified for split
        const range = document.createRange();
        range.setStartAfter(newNode);
        range.collapse(true);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        saveCurrentNote();
        return true;
    }
    return false;
}

// --- FONT SELECTOR LOGIC ---
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
    const family = formattingConfig.fonts[fontName];
    if (savedCursorRange) restoreCursorRange();
    else writingCanvas.focus();

    document.execCommand('fontName', false, fontName); // Fallback method or usage of span
    // Since execCommand fontName usually expects system fonts, we might need a span insertion if strict
    // For this split, we'll assume standard behavior or the previous span logic.
    // Re-implementing span logic for robustness:
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontFamily = family;

    if (!range.collapsed) {
        span.appendChild(range.extractContents());
        range.insertNode(span);
    } else {
        const zwsp = document.createTextNode('\u200B');
        span.appendChild(zwsp);
        range.insertNode(span);
    }
    showFormattingIndicator(`Font: ${fontName}`);
    saveCurrentNote();
}

// --- BULLETS & DROPDOWNS ---
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
    const div = document.createElement('div');
    div.style.marginLeft = '40px';
    div.style.position = 'relative';
    div.className = 'pdf-list-item ' + (type === 'numbered' ? 'numbered' : 'bullet');

    if (type === 'numbered') {
        // Logic to find previous number would go here, simplified to 1.
        div.textContent = '1. ';
    } else {
        div.textContent = '• ';
    }

    if (!range.collapsed) {
        div.textContent += range.toString();
        range.deleteContents();
    }
    range.insertNode(div);
    range.setStart(div, div.textContent.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    saveCurrentNote();
}

// --- EVENTS ---
let processing = false;
writingCanvas.addEventListener('keyup', (e) => {
    if (processing) return;
    if (e.key === ':' || e.key === ' ' || e.key === 'Enter') {
        processing = true;
        const lineNode = getCurrentLine();
        const processed = processLineFormatting(lineNode);
        if (processed) showFormattingIndicator('Formatting applied');
        processing = false;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) updateFontDisplay();
});

writingCanvas.addEventListener('input', (e) => detectInlineCommand(e));
writingCanvas.addEventListener('keydown', (e) => {
    handleInlineCommandKey(e);
    if (e.key === 'Enter') {
        // List continuation logic would go here
    }
});
writingCanvas.addEventListener('click', (e) => {
    updateFontDisplay();
    if (activeFormattingSpan && !activeFormattingSpan.contains(e.target)) {
        cleanupZeroWidthSpace(activeFormattingSpan);
        activeFormattingSpan = null;
    }
});

// --- CONTEXT MENU ---
const noteContextMenu = document.getElementById('noteContextMenu');
const moveToFolderItem = document.getElementById('moveToFolderItem');
const folderSubmenu = document.getElementById('folderSubmenu');
let contextMenuNoteId = null;

function hideContextMenu() {
    noteContextMenu.classList.remove('show');
    folderSubmenu.classList.remove('show');
    contextMenuNoteId = null;
}

noteChips.addEventListener('contextmenu', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    e.preventDefault();
    contextMenuNoteId = chip.dataset.noteId;
    hideContextMenu();
    noteContextMenu.style.left = `${e.pageX}px`;
    noteContextMenu.style.top = `${e.pageY}px`;
    noteContextMenu.classList.add('show');
});

moveToFolderItem.addEventListener('click', () => {
    if (!contextMenuNoteId) return hideContextMenu();
    folderSubmenu.innerHTML = '';
    folders.forEach(f => {
        const opt = document.createElement('div');
        opt.className = 'folder-option';
        opt.textContent = f.name;
        opt.dataset.folderId = f.id;
        folderSubmenu.appendChild(opt);
    });
    folderSubmenu.classList.add('show');
});

folderSubmenu.addEventListener('click', (e) => {
    const opt = e.target.closest('.folder-option');
    if (!opt || !contextMenuNoteId) return;
    moveNoteToFolder(contextMenuNoteId, opt.dataset.folderId);
    hideContextMenu();
});

document.addEventListener('click', (e) => {
    if (noteContextMenu.classList.contains('show') && !noteContextMenu.contains(e.target)) hideContextMenu();
});

function moveNoteToFolder(nId, fId) {
    const note = notes.find(n => n.id === nId);
    if (!note || note.folderId === fId) return;
    note.folderId = fId;
    saveToStorage();
    if (nId === activeNoteId && activeFolderId !== fId) {
        // moved out of view
        const remaining = getNotesInFolder(activeFolderId);
        activeNoteId = remaining.length ? remaining[0].id : null;
    }
    renderNoteChips();
    loadActiveNote();
    showFormattingIndicator('Note moved', 'success');
}

// --- INITIALIZATION CALL ---
init();