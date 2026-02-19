// ========================================
// mindJournal - ENHANCED EDITOR
// ========================================

// --- CONFIGURATION ---
const editorConfig = {
    shortcuts: {
        'b': 'bold',
        'i': 'italic',
        'u': 'underline',
        'k': 'createLink' // Ctrl+K is usually link
    }
};

const canvas = document.getElementById('writingCanvas');

// --- SHORTCUT HANDLER ---
canvas.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();

        // 1. Standard Formatting
        if (editorConfig.shortcuts[key]) {
            e.preventDefault();
            if (key === 'k') {
                const url = prompt('Enter link URL:');
                if (url) document.execCommand('createLink', false, url);
            } else {
                document.execCommand(editorConfig.shortcuts[key], false, null);
            }
            // Trigger Save
            if (window.saveCurrentNote) window.saveCurrentNote();
            return;
        }

        // 2. Headings (Ctrl+Alt+1, etc. or just Markdown style)
        // Leaving Markdown style as primary (handled by input event below)
    }

    // 3. Tab Indentation
    if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertHTML', false, '&#009');
    }
});

// --- MARKDOWN TRIGGERS ---
canvas.addEventListener('input', (e) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const anchorNode = selection.anchorNode;
    // Only process text nodes
    if (anchorNode.nodeType !== 3) return;

    const text = anchorNode.textContent;

    // HEADING 1 (# )
    if (text.endsWith('# ') && text.trim() === '#') {
        convertBlock('H1', anchorNode);
    }
    // HEADING 2 (## )
    else if (text.endsWith('## ') && text.trim() === '##') {
        convertBlock('H2', anchorNode);
    }
    // BULLET LIST (* )
    else if (text.endsWith('* ') && text.trim() === '*') {
        convertBlock('UL', anchorNode);
    }
    // CODE BLOCK (``` )
    else if (text.endsWith('``` ') && text.trim() === '```') {
        convertBlock('PRE', anchorNode);
    }

    // Save on input
    // debounce handled in app-core
});

function convertBlock(tagName, textNode) {
    const range = document.createRange();
    range.selectNodeContents(textNode);
    // Delete the trigger text (e.g. "# ")
    textNode.textContent = '';

    const parentBlock = textNode.parentElement;

    // Create new element
    let newEl;
    if (tagName === 'UL') {
        newEl = document.createElement('ul');
        const li = document.createElement('li');
        li.innerHTML = '<br>'; // Placeholder for cursor
        newEl.appendChild(li);
    } else if (tagName === 'PRE') {
        newEl = document.createElement('pre');
        newEl.className = 'code-block';
        newEl.innerHTML = '<br>';
    } else {
        newEl = document.createElement(tagName);
        newEl.innerHTML = '<br>';
    }

    // Replace
    if (parentBlock.tagName === 'DIV' && parentBlock.id === 'writingCanvas') {
        // Direct child text node? Wrap it
        // This is tricky in contentEditable.
        // Simplified: Insert new block, remove text node
        range.insertNode(newEl);
    } else {
        parentBlock.replaceWith(newEl);
    }

    // Set Cursor
    const sel = window.getSelection();
    const newRange = document.createRange();
    if (tagName === 'UL') {
        newRange.setStart(newEl.firstChild, 0);
    } else {
        newRange.setStart(newEl, 0);
    }
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
}

// --- FONT SIZE SELECTOR (New Requirement) ---
// We need to inject this into the UI via app-core or assume static HTML exists.
// Assuming we can add a listener if the element exists.
document.addEventListener('DOMContentLoaded', () => {
    // Check if we need to build the selector UI dynamically?
    // The user asked for "Font selector dropdown" and "Font size selector".
    // Current HTML has font selector. Let's add size selector if missing or hook existing.

    const sizeSelector = document.getElementById('fontSizeSelector'); // Hypothetical ID
    if (sizeSelector) {
        sizeSelector.addEventListener('change', (e) => {
            const size = e.target.value;
            document.execCommand('fontSize', false, '7'); // 1-7 legacy
            // Modern approach: CSS var on selected element?
            // For Vanilla execCommand, we are limited.
            // Better: Apply span with font-size style.
            applyStyleToSelection('fontSize', size + 'px');
        });
    }
});

function applyStyleToSelection(style, value) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const span = document.createElement('span');
    span.style[style] = value;

    const range = sel.getRangeAt(0);
    range.surroundContents(span);
}
