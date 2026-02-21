/**
 * app-editor.js
 * Entry point for the Vellum Editor.
 * Orchestrates modules and handles high-level events.
 */

import {
    saveSelection,
    restoreSelection,
    clearSelection,
    setCursorAtEnd
} from './editor/cursorManager.js';

import {
    applyFont,
    applyColor,
    execCommand,
    getCurrentFontName,
    getFontFamilyValue,
    formattingConfig
} from './editor/formattingEngine.js';

import {
    getCurrentBlock,
    unwrapBlock,
    convertBlockTo
} from './editor/blockManager.js';

import { handleShortcuts } from './editor/shortcutEngine.js';
import { writingCanvas, pushToUndo, saveCurrentNote } from './app-core.js';
import { smartParse } from './editor/markdownParser.js';

let isProcessing = false;

/**
 * Initialization
 */
function initEditor() {
    updateFontDisplay();
    attachEventListeners();

    // Export functions to window for app-core.js or inline scripts if needed
    window.getCurrentFont = () => getCurrentFontName(writingCanvas);
    window.applyFontAtCursor = applyFont;
}

/**
 * UI Updates
 */
function updateFontDisplay() {
    const current = getCurrentFontName(writingCanvas);
    const currentFontSpan = document.getElementById('currentFont');
    const fontOptions = document.querySelectorAll('.font-option');

    if (currentFontSpan) currentFontSpan.textContent = current;

    fontOptions.forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.font === current) opt.classList.add('active');
    });
}

/**
 * Event Listeners
 */
function attachEventListeners() {
    // Input for shortcuts
    writingCanvas.addEventListener('input', (e) => {
        if (isProcessing) return;
        isProcessing = true;

        const triggered = handleShortcuts(e, writingCanvas, {
            pushToUndo: pushToUndo,
            saveCurrentNote: saveCurrentNote
        });

        if (!triggered) {
            saveCurrentNote();
        }

        isProcessing = false;
    });

    // Keydown for Enter, Backspace, Tab
    writingCanvas.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') handleBackspace(e);
        if (e.key === 'Enter') handleEnter(e);
        if (e.key === 'Tab') handleTab(e);
        handleStandardShortcuts(e);
    });

    // Selection/Focus changes
    writingCanvas.addEventListener('click', (e) => {
        updateFontDisplay();

        // Handle checkbox clicks (Event Delegation)
        if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
            const taskItem = e.target.closest('.task-item');
            if (taskItem) {
                taskItem.classList.toggle('completed', e.target.checked);
                saveCurrentNote();
            }
        }
    });
    writingCanvas.addEventListener('keyup', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) updateFontDisplay();
    });
    writingCanvas.addEventListener('focus', updateFontDisplay);
    document.addEventListener('selectionchange', () => {
        if (document.activeElement === writingCanvas) {
            updateFontDisplay();
        }
    });

    // Font Selector UI
    const fontSelectorBtn = document.getElementById('fontSelectorBtn');
    const fontDropdown = document.getElementById('fontDropdown');
    const fontOptions = document.querySelectorAll('.font-option');

    if (fontSelectorBtn) {
        fontSelectorBtn.addEventListener('mousedown', saveSelection);
        fontSelectorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fontSelectorBtn.classList.toggle('active');
            fontDropdown.classList.toggle('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (fontSelectorBtn && !fontSelectorBtn.contains(e.target) && fontDropdown && !fontDropdown.contains(e.target)) {
            fontSelectorBtn.classList.remove('active');
            fontDropdown.classList.remove('active');
            clearSelection();
        }
    });

    fontOptions.forEach(option => {
        option.addEventListener('click', () => {
            const selectedFont = option.dataset.font;
            restoreSelection(writingCanvas);
            applyFont(selectedFont);
            updateFontDisplay();
            fontSelectorBtn.classList.remove('active');
            fontDropdown.classList.remove('active');
            clearSelection();
        });
    });
}

/**
 * Backspace logic
 */
function handleBackspace(e) {
    const sel = window.getSelection();
    if (!sel.rangeCount || !sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (range.startOffset !== 0) return;

    const node = range.startContainer;
    const currentBlock = getCurrentBlock(node, writingCanvas);
    if (!currentBlock) return;

    // Check if at start of special block
    let isAtStart = false;
    if (node === currentBlock || (node.parentNode === currentBlock && !node.previousSibling)) {
        isAtStart = true;
    }

    if (isAtStart && currentBlock.tagName !== 'DIV' && currentBlock.parentElement === writingCanvas) {
        e.preventDefault();
        pushToUndo();
        const newDiv = unwrapBlock(currentBlock);
        newDiv.style.color = '';
        newDiv.style.textAlign = '';
        setCursorAtEnd(newDiv, writingCanvas);
        saveCurrentNote();
    }
}

/**
 * Enter key logic
 */
function handleEnter(e) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const node = sel.anchorNode;
    const currentBlock = getCurrentBlock(node, writingCanvas);
    if (!currentBlock) return;

    // 1. Heading Behavior Fix: Reset to normal paragraph
    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(currentBlock.tagName)) {
        e.preventDefault();
        pushToUndo();

        const newP = document.createElement('div');
        newP.innerHTML = '<br>';
        // Reset styles for the new paragraph after a heading
        newP.style.color = '';

        // Maintain the currently selected font even after heading reset
        const currentFont = getCurrentFontName(writingCanvas);
        newP.style.fontFamily = getFontFamilyValue(currentFont);

        newP.style.fontWeight = 'normal';
        newP.style.textAlign = 'left';

        currentBlock.after(newP);
        setCursorAtEnd(newP, writingCanvas);
        saveCurrentNote();
        return;
    }

    // 2. Normal paragraph behavior: Reset alignment but keep color/font/bold
    if (currentBlock.tagName === 'DIV' || currentBlock.parentElement === writingCanvas || currentBlock.nodeType === 3) {
        // If it's a normal block, we want to continue formatting but reset alignment
        // Actually, if we use default browser behavior, it might inherit alignment.
        // So we intercept and handle it.
        e.preventDefault();
        pushToUndo();

        const newP = document.createElement('div');
        newP.innerHTML = '<br>';

        // Inherit styles (color, font, weight, etc.) from the cursor position
        const styleSource = node.nodeType === 3 ? node.parentElement : node;
        const computed = window.getComputedStyle(styleSource);

        newP.style.color = computed.color;
        newP.style.fontFamily = computed.fontFamily;
        newP.style.fontWeight = computed.fontWeight;
        newP.style.fontStyle = computed.fontStyle;
        newP.style.textDecoration = computed.textDecoration;

        // Reset alignment
        newP.style.textAlign = 'left';

        currentBlock.after(newP);
        setCursorAtEnd(newP, writingCanvas);
        saveCurrentNote();
        return;
    }

    // 3. Lists and Tasks
    if (currentBlock.tagName === 'LI' || currentBlock.classList.contains('task-item')) {
        const text = currentBlock.textContent.trim().replace(/\u200B/g, '');
        if (!text) {
            // Escape list/task
            e.preventDefault();
            pushToUndo();
            const newP = document.createElement('div');
            newP.innerHTML = '<br>';

            if (currentBlock.tagName === 'LI') {
                const parentUl = currentBlock.parentElement;
                if (parentUl.children.length === 1) {
                    parentUl.replaceWith(newP);
                } else {
                    currentBlock.remove();
                    parentUl.after(newP);
                }
            } else {
                currentBlock.replaceWith(newP);
            }
            setCursorAtEnd(newP, writingCanvas);
            saveCurrentNote();
            return;
        }

        // Continue list/task (handled by default behavior mostly, but we want consistency)
        if (currentBlock.classList.contains('task-item')) {
            e.preventDefault();
            pushToUndo();
            const newTask = currentBlock.cloneNode(true);
            newTask.classList.remove('completed');
            const cb = newTask.querySelector('input');
            if (cb) {
                cb.checked = false;
                cb.addEventListener('click', function() {
                    this.closest('.task-item').classList.toggle('completed');
                    saveCurrentNote();
                });
            }
            const contentSpan = newTask.querySelector('span:last-child');
            contentSpan.innerHTML = '&#8203;';
            currentBlock.after(newTask);
            setCursorAtEnd(contentSpan, writingCanvas);
            saveCurrentNote();
            return;
        }
    }

    // 3. Normal paragraph inheritance
    // Browser does this by default, but we ensure color/font/bold continue.
    // (Wait, document.execCommand handles this usually if we are inside a span)
}

/**
 * Tab logic
 */
function handleTab(e) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const currentBlock = getCurrentBlock(sel.anchorNode, writingCanvas);
    if (!currentBlock || currentBlock.tagName !== 'LI') return;

    e.preventDefault();
    pushToUndo();

    if (e.shiftKey) {
        // Unindent
        const parentUl = currentBlock.parentElement;
        const grandparentLi = parentUl.parentElement;
        if (grandparentLi && grandparentLi.tagName === 'LI') {
            grandparentLi.parentElement.insertBefore(currentBlock, grandparentLi.nextSibling);
            if (parentUl.children.length === 0) parentUl.remove();
        }
    } else {
        // Indent
        const prevLi = currentBlock.previousElementSibling;
        if (prevLi && prevLi.tagName === 'LI') {
            let nestedUl = prevLi.querySelector('ul');
            if (!nestedUl) {
                nestedUl = document.createElement('ul');
                prevLi.appendChild(nestedUl);
            }
            nestedUl.appendChild(currentBlock);
        }
    }
    setCursorAtEnd(currentBlock, writingCanvas);
    saveCurrentNote();
}

/**
 * Standard Shortcuts (Bold, Italic, Underline)
 */
function handleStandardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        let cmd = '';
        if (e.key === 'b') cmd = 'bold';
        else if (e.key === 'i') cmd = 'italic';
        else if (e.key === 'u') cmd = 'underline';

        if (cmd) {
            e.preventDefault();
            execCommand(cmd);
            saveCurrentNote();
            updateFontDisplay();
        }
    }
}

// Paste handling (Smart Detection: Markdown / Code / Plain Text)
writingCanvas.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');

    if (text) {
        // Use intelligent smartParse to decide strategy (MD vs Code vs Text)
        const htmlToInsert = smartParse(text);

        execCommand('insertHTML', htmlToInsert);
        saveCurrentNote();
        pushToUndo();
    }
});

// Start the editor
initEditor();
