/**
 * cursorManager.js
 * Handles selection, range, and caret normalization.
 */

let savedRange = null;

export function saveSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange();
    }
}

export function restoreSelection(container) {
    if (savedRange) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedRange);
        if (container) container.focus();
    }
}

export function clearSelection() {
    savedRange = null;
}

/**
 * Sets the cursor at the end of the specified element.
 */
export function setCursorAtEnd(element, container) {
    if (!element) return;
    const range = document.createRange();
    const sel = window.getSelection();

    if (element.nodeType === 3) {
        range.setStart(element, element.length);
        range.collapse(true);
    } else {
        range.selectNodeContents(element);
        range.collapse(false);
    }

    sel.removeAllRanges();
    sel.addRange(range);
    if (container) container.focus();
}

/**
 * Normalizes the cursor position within an element to ensure consistent caret height.
 */
export function normalizeCursor(element) {
    // Ensuring consistent line-height and vertical alignment via JS if needed,
    // though CSS is preferred for this.
    // This could also handle inserting ZWSP if an element is empty.
    if (element && element.innerHTML === '') {
        element.innerHTML = '&#8203;';
    }
}
