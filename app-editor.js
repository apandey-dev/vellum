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

// --- LINE FORMATTING (Basic Structure Shortcuts Only) ---
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

    document.execCommand('fontName', false, fontName);
    // Basic font fallback using legacy execCommand as requested in previous iterations for simplicity
    // More robust implementations use CSS spans, but for "no changes/breaks" we stick to basics where possible
    // unless specific logic for spans was required. Given the removal of formatting shortcuts, simpler is safer here.

    // To ensure specific fonts apply correctly since execCommand fontName uses system fonts usually:
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
        // Move cursor inside
        range.setStart(zwsp, 1);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }
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

    // Simple block insertion for PDF compatibility style
    const div = document.createElement('div');
    div.style.marginLeft = '40px';
    div.style.position = 'relative';
    div.className = 'pdf-list-item ' + (type === 'numbered' ? 'numbered' : 'bullet');

    if (type === 'numbered') {
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
    if (e.key === ' ' || e.key === 'Enter') {
        processing = true;
        const lineNode = getCurrentLine();
        const processed = processLineFormatting(lineNode); // Only checks --- and ===
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