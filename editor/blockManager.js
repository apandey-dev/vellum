/**
 * blockManager.js
 * Handles block-level operations like headings, lists, and tasks.
 */

import { setCursorAtEnd } from './cursorManager.js';

/**
 * Identifies the current block-level element for a given node.
 */
export function getCurrentBlock(node, writingCanvas) {
    let current = node;

    if (current && current.nodeType === 3) {
        if (current.parentElement === writingCanvas) return current;
        current = current.parentElement;
    }

    while (current && current !== writingCanvas) {
        if (current.tagName === 'LI') return current;
        if (current.classList.contains('task-item')) return current;
        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'].includes(current.tagName)) return current;
        if (current.parentElement === writingCanvas) return current;
        current = current.parentElement;
    }
    return null;
}

/**
 * Converts a block to a new tag while preserving content.
 */
export function convertBlockTo(lineBlock, newTagName, className = '', options = {}) {
    if (!lineBlock) return null;
    const newEl = document.createElement(newTagName);
    if (className) newEl.className = className;
    if (options.fontFamily) newEl.style.fontFamily = options.fontFamily;

    if (lineBlock.nodeType === 3) { // text node
        newEl.textContent = lineBlock.textContent;
    } else {
        while (lineBlock.firstChild) newEl.appendChild(lineBlock.firstChild);
    }

    // Ensure empty block is focusable and has consistent height
    if (!newEl.textContent.trim() && newEl.children.length === 0) {
        newEl.innerHTML = '&#8203;';
    }

    lineBlock.replaceWith(newEl);
    return newEl;
}

/**
 * Unwraps a special block back to a normal div.
 */
export function unwrapBlock(lineBlock) {
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

/**
 * Splits a list at the current block.
 */
export function splitList(currentBlock, newTagName, className = '', options = {}) {
    const parentUl = currentBlock.parentElement;
    const newEl = document.createElement(newTagName);
    if (className) newEl.className = className;
    if (options.fontFamily) newEl.style.fontFamily = options.fontFamily;

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

    return newEl;
}
