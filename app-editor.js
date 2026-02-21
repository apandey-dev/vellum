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
    convertBlockTo,
    isInCodeBlock
} from './editor/blockManager.js';

import { handleShortcuts } from './editor/shortcutEngine.js';
import { writingCanvas, pushToUndo, saveCurrentNote } from './app-core.js';
import { parseMarkdown, isMarkdown, isCodeLike, highlightCode } from './editor/markdownParser.js';

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
    // Input for shortcuts and highlighting
    writingCanvas.addEventListener('input', (e) => {
        if (isProcessing) return;
        isProcessing = true;

        const sel = window.getSelection();
        const codeBlock = isInCodeBlock(sel.anchorNode, writingCanvas);

        if (codeBlock) {
            debouncedHighlight(codeBlock);
            saveCurrentNote();
        } else {
            const triggered = handleShortcuts(e, writingCanvas, {
                pushToUndo: pushToUndo,
                saveCurrentNote: saveCurrentNote
            });

            if (!triggered) {
                saveCurrentNote();
            }
        }

        isProcessing = false;
    });

    // Keydown for Enter, Backspace, Tab
    writingCanvas.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') handleBackspace(e);
        if (e.key === 'Enter') handleEnter(e);
        if (e.key === 'Tab') handleTab(e);

        // Ctrl + Shift + V (Clean Paste)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
            handleCleanPaste(e);
            return;
        }

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
 * Modern selection-based text insertion
 */
function insertTextAtCursor(text) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
}

/**
 * Modern selection-based HTML insertion
 */
function insertHTMLAtCursor(html) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const fragment = range.createContextualFragment(html);
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);
    if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
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
    if (currentBlock.tagName === 'DIV' || (currentBlock.parentElement === writingCanvas && currentBlock.tagName !== 'PRE') || currentBlock.nodeType === 3) {
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

        // Only inherit color if it's explicitly set on the source and not the default theme color
        // Actually, to satisfy "Bold text must inherit color from parent", we should avoid hardcoding it.
        // If we don't set it, it will inherit from the canvas/theme.
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

    // 3. Code Block Handling
    const codeBlock = isInCodeBlock(node, writingCanvas);
    if (codeBlock) {
        // Normal Enter and Shift+Enter both stay inside except for Shift+Enter on empty last line
        const textContent = codeBlock.textContent.replace(/\u200B/g, '');
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);

        // Check if we are at the end of the block and it's an empty line
        const isAtEnd = range.startOffset === node.length || node.nodeType !== 3;
        const lineContent = node.textContent || '';
        const isEmptyLine = lineContent.trim().replace(/\u200B/g, '') === '';

        if (e.shiftKey && isEmptyLine && isAtEnd) {
            // Exit code block
            e.preventDefault();
            pushToUndo();

            const newP = document.createElement('div');
            newP.innerHTML = '<br>';
            codeBlock.after(newP);

            // If the code block is empty (except for our exit line), maybe keep it?
            // User said "Remove code block wrapper" - wait, does that mean DELETE the code block or just move out?
            // "Exit the code block -> Create a normal paragraph below -> Remove code block wrapper"
            // Actually "Remove code block wrapper" might mean if it's empty?
            // Usually it means move out. I'll just move out.

            setCursorAtEnd(newP, writingCanvas);
            saveCurrentNote();
            return;
        }

        // Otherwise, just insert a newline
        e.preventDefault();
        insertTextAtCursor('\n');
        saveCurrentNote();
        return;
    }

    // 4. Lists and Tasks
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
    const node = sel.anchorNode;
    const currentBlock = getCurrentBlock(node, writingCanvas);
    if (!currentBlock) return;

    // 1. Code Block Tab Handling
    if (isInCodeBlock(node, writingCanvas)) {
        e.preventDefault();
        pushToUndo();

        const range = sel.getRangeAt(0);
        if (e.shiftKey) {
            if (range.collapsed) {
                const text = node.textContent;
                const offset = range.startOffset;
                if (text.slice(offset - 2, offset) === '  ') {
                    range.setStart(node, offset - 2);
                    range.deleteContents();
                } else if (text.slice(offset - 1, offset) === ' ') {
                    range.setStart(node, offset - 1);
                    range.deleteContents();
                }
            } else {
                // Multi-line Unindent
                const selectedText = range.toString();
                const unindentedText = selectedText.split('\n').map(line => {
                    if (line.startsWith('  ')) return line.slice(2);
                    if (line.startsWith(' ')) return line.slice(1);
                    return line;
                }).join('\n');
                insertTextAtCursor(unindentedText);
            }
        } else {
            if (range.collapsed) {
                insertTextAtCursor('  ');
            } else {
                // Multi-line Indent
                const selectedText = range.toString();
                const indentedText = selectedText.split('\n').map(line => '  ' + line).join('\n');
                insertTextAtCursor(indentedText);
            }
        }

        saveCurrentNote();
        return;
    }

    if (currentBlock.tagName !== 'LI') return;

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
 * Clean Paste logic (Ctrl + Shift + V)
 */
async function handleCleanPaste(e) {
    e.preventDefault();
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            // Normalize: max 1 blank line, trim ends
            const sanitized = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();

            // Insert as simple divs to avoid external styles
            const html = sanitized.split('\n').map(line => {
                const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return escaped.trim() ? `<div>${escaped}</div>` : '<div><br></div>';
            }).join('');

            insertHTMLAtCursor(html);
            saveCurrentNote();
        }
    } catch (err) {
        console.error('Failed to read clipboard:', err);
    }
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
            document.execCommand(cmd); // These standard ones are still okay-ish but I could replace them
            saveCurrentNote();
            updateFontDisplay();
        }
    }
}

// Paste handling (Markdown & Sanitization)
writingCanvas.addEventListener('paste', (e) => {
    // If it's a Ctrl+Shift+V paste, we let the separate listener handle it
    // Wait, the keydown listener for Ctrl+Shift+V won't prevent this 'paste' event
    // unless we check it here too.
    if (e.ctrlKey && e.shiftKey) return;

    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');

    if (text) {
        let htmlToInsert;

        const sel = window.getSelection();
        const node = sel.anchorNode;
        const codeBlock = isInCodeBlock(node, writingCanvas);

        if (codeBlock) {
            // Paste inside code block: Escape and preserve exact text
            const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            insertHTMLAtCursor(escaped);
            saveCurrentNote();
            return;
        }

        // Normalize vertical spacing: Replace 3+ newlines with 2
        const normalizedText = text.replace(/\n{3,}/g, '\n\n').trim();

        if (normalizedText.includes('```') || isCodeLike(normalizedText)) {
            // Auto-wrap code in a block
            // Remove fences if they exist for clean insertion
            const cleanCode = normalizedText.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
            const escaped = cleanCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const highlighted = highlightCode(escaped, 'js');
            htmlToInsert = `<pre class="code-block"><code>${highlighted}</code></pre><div><br></div>`;
        } else if (isMarkdown(normalizedText)) {
            // Transform Markdown to Rich Text
            htmlToInsert = parseMarkdown(normalizedText);
        } else {
            // Standard Sanitization for plain text
            htmlToInsert = normalizedText.split(/\r\n|\r|\n/).map(line => {
                const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return escaped.trim() ? `<div>${escaped}</div>` : '<div><br></div>';
            }).join('');
        }

        insertHTMLAtCursor(htmlToInsert);
        saveCurrentNote();
    }
});

/**
 * Robust cursor position management for real-time highlighting
 */
function getCursorOffset(container) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return 0;
    const range = sel.getRangeAt(0);
    const preCursorRange = range.cloneRange();
    preCursorRange.selectNodeContents(container);
    preCursorRange.setEnd(range.endContainer, range.endOffset);
    return preCursorRange.toString().length;
}

function setCursorOffset(container, offset) {
    const sel = window.getSelection();
    const range = document.createRange();
    let currentOffset = 0;

    const nodeStack = [container];
    while (nodeStack.length > 0) {
        const node = nodeStack.pop();
        if (node.nodeType === 3) {
            const nextOffset = currentOffset + node.length;
            if (offset <= nextOffset) {
                range.setStart(node, offset - currentOffset);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                return;
            }
            currentOffset = nextOffset;
        } else {
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                nodeStack.push(node.childNodes[i]);
            }
        }
    }
    // Fallback to end
    range.selectNodeContents(container);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
}

let highlightTimer;
function debouncedHighlight(codeBlock) {
    clearTimeout(highlightTimer);
    highlightTimer = setTimeout(() => {
        const offset = getCursorOffset(codeBlock);
        const code = codeBlock.textContent;
        const lang = codeBlock.dataset.lang || 'javascript';
        const highlighted = highlightCode(code, lang);

        const codeTag = codeBlock.querySelector('code');
        if (codeTag) {
            codeTag.innerHTML = highlighted + (code.endsWith('\n') ? '\n' : ''); // Ensure trailing newline doesn't collapse
            setCursorOffset(codeBlock, offset);
        }
    }, 500);
}

// Start the editor
initEditor();
