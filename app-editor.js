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

// --- Get the current operational block (LI, Task, Heading, etc.) ---
function getCurrentBlock(node) {
    let current = node;

    // Special handling for text nodes
    if (current && current.nodeType === 3) {
        if (current.parentElement === writingCanvas) return current;
        current = current.parentElement;
    }

    while (current && current !== writingCanvas) {
        if (current.tagName === 'LI') return current;
        if (current.classList.contains('task-item')) return current;
        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'].includes(current.tagName)) return current;
        // If it's a direct child of writingCanvas (like a P div), return it
        if (current.parentElement === writingCanvas) return current;
        current = current.parentElement;
    }
    return null;
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
    if (!element) return;

    if (element.nodeType === 3) {
        range.setStart(element, element.length);
        range.collapse(true);
    } else {
        if (element.lastChild) {
            // Check if last child is BR or empty text
            // Just select end
            range.selectNodeContents(element);
            range.collapse(false);
        } else {
            range.selectNodeContents(element);
            range.collapse(false);
        }
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

    // Use getCurrentBlock to correctly identify LI, Task, etc.
    const currentBlock = getCurrentBlock(node);
    if (!currentBlock) return;

    // Helper to check if cursor is at start of line (ignoring leading whitespace)
    const textBeforeCursor = text.slice(0, offset);

    // Improved start check
    function isSimulationOfStart(pattern) {
        if (!textBeforeCursor.endsWith(pattern)) return false;
        const prefix = textBeforeCursor.slice(0, -pattern.length);
        if (!/^\s*$/.test(prefix)) return false;
        return true;
    }

    // Generic Transform Function to handle LI splitting
    function transformCurrentBlock(newTagName, className = '') {
        // Remove text (pattern + prefix) handled by caller if needed
        range.deleteContents();

        if (currentBlock.tagName === 'LI') {
            const parentUl = currentBlock.parentElement;
            const newEl = document.createElement(newTagName);
            if (className) newEl.className = className;

            // Move content
            while (currentBlock.firstChild) newEl.appendChild(currentBlock.firstChild);
            if (!newEl.innerHTML.trim()) newEl.innerHTML = '&#8203;';

            // Split list logic
            const index = Array.from(parentUl.children).indexOf(currentBlock);
            const after = Array.from(parentUl.children).slice(index + 1);

            // Insert newEl after parentUl (or what remains of it)
            parentUl.after(newEl);

            if (after.length > 0) {
                const ulAfter = document.createElement('ul');
                after.forEach(li => ulAfter.appendChild(li));
                newEl.after(ulAfter);
            }

            currentBlock.remove();
            if (parentUl.children.length === 0) parentUl.remove();

            return newEl;
        } else {
            // Normal conversion
            return convertBlockTo(newTagName, currentBlock, true, className);
        }
    }

    // 1. Headings
    if (isSimulationOfStart('## ')) {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();
        // Adjust range to select pattern for deletion
        const matchLength = 3;
        range.setStart(node, offset - matchLength);
        range.setEnd(node, offset);

        const newBlock = transformCurrentBlock('h2');
        setCursorAtEnd(newBlock);
        saveCurrentNote();
        isProcessing = false;
        return;
    }
    if (isSimulationOfStart('### ')) {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();
        const matchLength = 4;
        range.setStart(node, offset - matchLength);
        range.setEnd(node, offset);

        const newBlock = transformCurrentBlock('h3');
        setCursorAtEnd(newBlock);
        saveCurrentNote();
        isProcessing = false;
        return;
    }
    // New H4 Shortcut
    if (isSimulationOfStart('#### ')) {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();
        const matchLength = 5;
        range.setStart(node, offset - matchLength);
        range.setEnd(node, offset);

        const newBlock = transformCurrentBlock('h4');
        setCursorAtEnd(newBlock);
        saveCurrentNote();
        isProcessing = false;
        return;
    }

    // 2. Bullet list
    if (isSimulationOfStart('* ')) {
        e.preventDefault();
        // If already LI, do nothing
        if (currentBlock.tagName === 'LI') return;

        isProcessing = true;
        pushToUndo();
        const matchLength = 2;
        range.setStart(node, offset - matchLength);
        range.setEnd(node, offset);
        range.deleteContents();

        const ul = document.createElement('ul');
        const li = document.createElement('li');
        // Move content
        if (currentBlock.nodeType === 3) {
             li.textContent = currentBlock.textContent;
        } else {
             while (currentBlock.firstChild) li.appendChild(currentBlock.firstChild);
        }
        if (!li.textContent.trim()) li.innerHTML = '&#8203;';
        ul.appendChild(li);
        currentBlock.replaceWith(ul);
        setCursorAtEnd(li);
        saveCurrentNote();
        isProcessing = false;
        return;
    }

    // 3. Checkbox
    if (isSimulationOfStart('[] ')) {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();
        const matchLength = 3;
        range.setStart(node, offset - matchLength);
        range.setEnd(node, offset);

        range.deleteContents();

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

        const contentSpan = taskDiv.querySelector('span:last-child');

        // Move content
        const source = currentBlock;
        while (source.firstChild) contentSpan.appendChild(source.firstChild);
        if (!contentSpan.textContent.trim()) contentSpan.innerHTML = '&#8203;';

        if (source.tagName === 'LI') {
            const parentUl = source.parentElement;
            const index = Array.from(parentUl.children).indexOf(source);
            const after = Array.from(parentUl.children).slice(index + 1);

            parentUl.after(taskDiv);
            if (after.length > 0) {
                const ulAfter = document.createElement('ul');
                after.forEach(li => ulAfter.appendChild(li));
                taskDiv.after(ulAfter);
            }
            source.remove();
            if (parentUl.children.length === 0) parentUl.remove();
        } else {
            source.replaceWith(taskDiv);
        }

        setCursorAtEnd(contentSpan);
        saveCurrentNote();
        isProcessing = false;
        return;
    }

    // 4. Blockquote
    if (isSimulationOfStart('> ')) {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();
        const matchLength = 2;
        range.setStart(node, offset - matchLength);
        range.setEnd(node, offset);

        const newBlock = transformCurrentBlock('blockquote');
        setCursorAtEnd(newBlock);
        saveCurrentNote();
        isProcessing = false;
        return;
    }

    // 5. Horizontal rule (---)
    if (isSimulationOfStart('---') && offset === text.length) {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();

        const hr = document.createElement('hr');
        hr.className = 'horizontal-line';
        const p = document.createElement('div');
        p.innerHTML = '<br>';

        if (currentBlock.tagName === 'LI') {
             const parentUl = currentBlock.parentElement;
             const index = Array.from(parentUl.children).indexOf(currentBlock);
             const after = Array.from(parentUl.children).slice(index + 1);

             parentUl.after(hr);
             hr.after(p);

             if (after.length > 0) {
                 const ulAfter = document.createElement('ul');
                 after.forEach(li => ulAfter.appendChild(li));
                 p.after(ulAfter);
             }
             currentBlock.remove();
             if (parentUl.children.length === 0) parentUl.remove();
        } else {
             currentBlock.replaceWith(hr);
             hr.after(p);
        }

        setCursorAtEnd(p);
        saveCurrentNote();
        isProcessing = false;
        return;
    }

    // 6. Dot Trigger (Alignment & Advanced $)
    if (textBeforeCursor.endsWith('.')) {

        // --- Alignment Check (#center. #start. #end.) ---
        const alignMatch = textBeforeCursor.match(/#(center|start|end)\.$/);

        if (alignMatch) {
             e.preventDefault();
             isProcessing = true;
             pushToUndo();

             const alignType = alignMatch[1];
             const matchLength = alignMatch[0].length;

             // Remove shortcut text
             range.setStart(node, offset - matchLength);
             range.setEnd(node, offset);
             range.deleteContents();

             // Apply alignment to block
             const alignMap = { 'center': 'center', 'start': 'left', 'end': 'right' };
             currentBlock.style.textAlign = alignMap[alignType] || 'left';

             setCursorAtEnd(currentBlock);
             saveCurrentNote();
             isProcessing = false;
             return;
        }

        // --- Advanced Combined Shortcut ($head+...) ---
        const complexMatch = textBeforeCursor.match(/\$([a-zA-Z0-9+]+)\.$/);

        if (complexMatch && isSimulationOfStart(complexMatch[0])) {
             const fullString = complexMatch[1]; // content between $ and .
             const parts = fullString.split('+');

             // First part is mandatory Heading Type
             const headingType = parts[0];

             // Subsequent parts are Optional (Color OR Alignment)
             let colorName = null;
             let alignment = null;

             const alignKeywords = ['center', 'start', 'end'];

             for (let i = 1; i < parts.length; i++) {
                 const part = parts[i];
                 if (alignKeywords.includes(part)) {
                     alignment = part;
                 } else {
                     // Assume color if not alignment
                     colorName = part;
                 }
             }

             e.preventDefault();
             isProcessing = true;
             pushToUndo();

             // Delete the full shortcut text
             const matchLength = complexMatch[0].length;
             range.setStart(node, offset - matchLength);
             range.setEnd(node, offset);

             // Determine new tag
             let newTag = 'div';
             if (headingType === 'head') newTag = 'h2';
             else if (headingType === 'subhead') newTag = 'h3';
             else if (headingType === 'subhead2') newTag = 'h4';

             // Transform block if tag changes
             let targetBlock = currentBlock;
             const currentTagName = currentBlock.tagName ? currentBlock.tagName.toLowerCase() : 'div';

             if (newTag !== currentTagName) {
                 range.deleteContents(); // Delete the shortcut text first

                 if (currentBlock.tagName === 'LI') {
                     // Split logic
                     const parentUl = currentBlock.parentElement;
                     const newEl = document.createElement(newTag);
                     while (currentBlock.firstChild) newEl.appendChild(currentBlock.firstChild);
                     if (!newEl.innerHTML.trim()) newEl.innerHTML = '&#8203;';

                     const index = Array.from(parentUl.children).indexOf(currentBlock);
                     const after = Array.from(parentUl.children).slice(index + 1);

                     parentUl.after(newEl);
                     if (after.length > 0) {
                         const ulAfter = document.createElement('ul');
                         after.forEach(li => ulAfter.appendChild(li));
                         newEl.after(ulAfter);
                     }
                     currentBlock.remove();
                     if (parentUl.children.length === 0) parentUl.remove();
                     targetBlock = newEl;
                 } else {
                     targetBlock = convertBlockTo(newTag, currentBlock, true);
                 }
             } else {
                 range.deleteContents();
             }

             // Apply styles
             if (colorName) targetBlock.style.color = colorName;
             else targetBlock.style.color = ''; // Reset to default

             if (alignment) {
                 const alignMap = { 'center': 'center', 'start': 'left', 'end': 'right' };
                 targetBlock.style.textAlign = alignMap[alignment] || 'left';
             } else {
                 targetBlock.style.textAlign = '';
             }

             setCursorAtEnd(targetBlock);
             saveCurrentNote();
             isProcessing = false;
             return;
        }

        // --- Inline color (@color.) ---
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

    // Check if truly at start of block
    if (range.startOffset !== 0) return;

    const currentBlock = getCurrentBlock(node);
    if (!currentBlock) return;

    // Check if block has custom styles (color, alignment) -> treat as special
    const hasStyle = (currentBlock.style && ((currentBlock.style.textAlign && currentBlock.style.textAlign !== 'left') ||
                     (currentBlock.style.color && currentBlock.style.color !== '')));

    const isSpecial = (currentBlock.tagName && ['H1','H2','H3','H4','LI','BLOCKQUOTE'].includes(currentBlock.tagName)) ||
                      currentBlock.classList.contains('task-item') ||
                      hasStyle;

    if (!isSpecial) return;

    // Check if previous sibling exists within the block
    let isAtStart = false;
    if (node === currentBlock) {
        isAtStart = true;
    } else if (node.parentNode === currentBlock && !node.previousSibling) {
        isAtStart = true;
    } else if (node.nodeType === 3 && node.parentNode === currentBlock && !node.previousSibling) {
        isAtStart = true;
    }

    if (currentBlock.classList.contains('task-item')) {
        const contentSpan = currentBlock.querySelector('span:last-child');
        if (contentSpan && (node === contentSpan || contentSpan.contains(node))) {
             if (node === contentSpan && range.startOffset === 0) isAtStart = true;
             else if (node.parentNode === contentSpan && !node.previousSibling && range.startOffset === 0) isAtStart = true;
             else isAtStart = false;
        } else {
            isAtStart = false;
        }
    }

    if (!isAtStart) return;

    e.preventDefault();
    isProcessing = true;
    pushToUndo();

    if (currentBlock.tagName === 'LI') {
        const parentUl = currentBlock.parentNode;

        const newDiv = document.createElement('div');
        while (currentBlock.firstChild) newDiv.appendChild(currentBlock.firstChild);

        if (parentUl.children.length === 1) {
            parentUl.replaceWith(newDiv);
        } else {
             const index = Array.from(parentUl.children).indexOf(currentBlock);
             const after = Array.from(parentUl.children).slice(index + 1);
             const ulAfter = document.createElement('ul');
             after.forEach(li => ulAfter.appendChild(li));

             currentBlock.remove();
             if (index === 0) {
                 parentUl.before(newDiv);
                 if (after.length === 0) parentUl.remove();
             } else {
                 parentUl.after(newDiv);
                 if (after.length > 0) newDiv.after(ulAfter);
                 after.forEach(li => li.remove());
             }
        }
        setCursorAtEnd(newDiv);

    } else if (currentBlock.classList.contains('task-item')) {
        const checkboxWrapper = currentBlock.querySelector('.custom-checkbox-wrapper');
        if (checkboxWrapper) checkboxWrapper.remove();

        currentBlock.classList.remove('task-item');
        currentBlock.classList.remove('completed');

        if (!currentBlock.innerHTML.trim()) currentBlock.innerHTML = '<br>';

        const range = document.createRange();
        range.selectNodeContents(currentBlock);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    } else {
        // H2, H3, H4, Blockquote -> P, OR just stripping styles
        // unwrapBlock creates a clean div.
        const newDiv = unwrapBlock(currentBlock);

        // Ensure styling is stripped
        newDiv.style.color = '';
        newDiv.style.textAlign = '';

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
    const currentBlock = getCurrentBlock(node);
    if (!currentBlock) return;

    if (currentBlock.tagName === 'LI') {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();

        const text = currentBlock.textContent.trim();
        // Check if empty -> Escape list
        if (!text || text === '\u200B') {
             const parentUl = currentBlock.parentElement;
             const newP = document.createElement('div');
             newP.innerHTML = '<br>';

             if (parentUl.children.length === 1) {
                 parentUl.replaceWith(newP);
             } else {
                 if (currentBlock === parentUl.lastElementChild) {
                     currentBlock.remove();
                     parentUl.after(newP);
                 } else {
                     const index = Array.from(parentUl.children).indexOf(currentBlock);
                     const after = Array.from(parentUl.children).slice(index + 1);
                     const ulAfter = document.createElement('ul');
                     after.forEach(li => ulAfter.appendChild(li));

                     currentBlock.remove();
                     parentUl.after(newP);
                     if (ulAfter.children.length > 0) newP.after(ulAfter);
                 }
             }
             setCursorAtEnd(newP);
        } else {
            // New LI
            const newLi = document.createElement('li');
            newLi.innerHTML = '&#8203;';
            currentBlock.after(newLi);
            setCursorAtEnd(newLi);
        }
        saveCurrentNote();
        isProcessing = false;
    } else if (currentBlock.classList.contains('task-item')) {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();

        const text = currentBlock.textContent.trim();
        if (!text || text === '\u200B') {
            const newP = document.createElement('div');
            newP.innerHTML = '<br>';
            currentBlock.replaceWith(newP);
            setCursorAtEnd(newP);
        } else {
             const newTask = document.createElement('div');
             newTask.className = 'task-item';
             newTask.innerHTML = `
                <label class="custom-checkbox-wrapper" contenteditable="false">
                    <input type="checkbox">
                    <span class="checkmark"></span>
                </label>
                <span style="flex:1;">&#8203;</span>
            `;
             const cb = newTask.querySelector('input');
             cb.addEventListener('click', function () {
                this.closest('.task-item').classList.toggle('completed');
                saveCurrentNote();
             });

             currentBlock.after(newTask);
             const contentSpan = newTask.querySelector('span:last-child');
             setCursorAtEnd(contentSpan);
        }
        saveCurrentNote();
        isProcessing = false;
    } else if (currentBlock.tagName && ['H1','H2','H3','H4','BLOCKQUOTE'].includes(currentBlock.tagName)) {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();

        const newP = document.createElement('div');
        newP.innerHTML = '<br>';
        currentBlock.after(newP);
        setCursorAtEnd(newP);
        saveCurrentNote();
        isProcessing = false;
    }
}

// --- Tab handler (Indentation) ---
function handleTab(e) {
    if (e.key !== 'Tab' || isProcessing) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const node = sel.anchorNode;
    const currentBlock = getCurrentBlock(node);
    if (!currentBlock) return;

    if (currentBlock.tagName === 'LI') {
        e.preventDefault();
        isProcessing = true;
        pushToUndo();

        if (e.shiftKey) {
            // Unindent (Shift + Tab)
            const parentUl = currentBlock.parentElement;
            const grandparentLi = parentUl.parentElement;

            if (grandparentLi && grandparentLi.tagName === 'LI') {
                 const greatGrandparentUl = grandparentLi.parentElement;
                 greatGrandparentUl.insertBefore(currentBlock, grandparentLi.nextSibling);
                 if (parentUl.children.length === 0) parentUl.remove();
                 setCursorAtEnd(currentBlock);
            }
        } else {
            // Indent (Tab)
            const prevLi = currentBlock.previousElementSibling;
            if (prevLi && prevLi.tagName === 'LI') {
                let nestedUl = prevLi.querySelector('ul');
                if (!nestedUl) {
                    nestedUl = document.createElement('ul');
                    prevLi.appendChild(nestedUl);
                }
                nestedUl.appendChild(currentBlock);
                setCursorAtEnd(currentBlock);
            }
        }
        saveCurrentNote();
        isProcessing = false;
    }
}

// --- Standard Shortcuts (Bold, Italic, Underline) ---
function handleStandardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        let cmd = '';
        if (e.key === 'b') cmd = 'bold';
        else if (e.key === 'i') cmd = 'italic';
        else if (e.key === 'u') cmd = 'underline';

        if (cmd) {
            e.preventDefault();
            document.execCommand(cmd, false, null);
            saveCurrentNote();
            updateFontDisplay();
        }
    }
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

    // Check if collapsed
    if (selection.isCollapsed) {
        // If caret, check current element's computed style, but prioritize any immediate span parent
        if (node.nodeType === 3) node = node.parentElement;

        while (node && node !== writingCanvas) {
            if (node.tagName === 'SPAN' && node.style.fontFamily) {
                // Return font from span if explicitly set
                // Need to match against formattingConfig
                const fam = node.style.fontFamily;
                for (const [name, val] of Object.entries(formattingConfig.fonts)) {
                    if (fam.includes(name) || val.includes(fam)) return name;
                }
            }
            node = node.parentElement;
        }
        // If not found in spans, check computed style?
        // Better to return default if no span found, or check last active command?
        // Let's rely on standard computed style fallback
    } else {
        if (node.nodeType === 3) node = node.parentElement;
    }

    // Standard check
    while (node && node !== writingCanvas) {
        const computed = window.getComputedStyle(node).fontFamily;
        for (const [name, fam] of Object.entries(formattingConfig.fonts)) {
            // Check if computed font family matches our known fonts
            // computed usually returns quoted "Fredoka", sans-serif
            if (computed.includes(name)) return name;
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

    const selection = window.getSelection();
    if (selection.isCollapsed) {
        // --- REALTIME FONT APPLICATION FIX ---
        // If selection is just a cursor, insert a zero-width space wrapped in a span with the font.
        // This ensures the NEXT character typed falls into this span.

        const span = document.createElement('span');
        span.style.fontFamily = formattingConfig.fonts[fontName];
        span.innerHTML = '&#8203;'; // Zero-width space

        const range = selection.getRangeAt(0);
        range.deleteContents(); // Should be empty anyway
        range.insertNode(span);

        // Move cursor inside the span, after the zero-width space?
        // Actually, replacing content usually selects it? No.
        // We need to place cursor *inside* the span.

        range.setStart(span, 1); // After the char
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        // Update display immediately
        updateFontDisplay();
    } else {
        // Standard behavior for selected text
        document.execCommand('fontName', false, formattingConfig.fonts[fontName]);
    }

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
            let line = escapeHtml(lines[i]);
            // Preserve leading whitespace for code indentation
            line = line.replace(/^ +/g, (match) => '&nbsp;'.repeat(match.length));
            html += line;
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

// --- EVENTS ---
writingCanvas.addEventListener('input', handleInlineShortcuts);
writingCanvas.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') handleBackspace(e);
    if (e.key === 'Enter') handleEnter(e);
    if (e.key === 'Tab') handleTab(e);
    handleStandardShortcuts(e);
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