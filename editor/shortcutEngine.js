/**
 * shortcutEngine.js
 * Real-time shortcut detection and application.
 */

import { getCurrentBlock, convertBlockTo, splitList } from './blockManager.js';
import { parseComboShortcut, getHeadingTag } from './parser.js';
import { setCursorAtEnd } from './cursorManager.js';
import { applyColor, getCurrentFontName, getFontFamilyValue } from './formattingEngine.js';

/**
 * Handles all inline shortcuts on input.
 */
export function handleShortcuts(e, writingCanvas, options = {}) {
    const { pushToUndo, saveCurrentNote } = options;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    // Only process shortcuts in text nodes
    if (node.nodeType !== 3) return;

    const text = node.textContent;
    const offset = range.startOffset;
    const textBeforeCursor = text.slice(0, offset);

    const currentBlock = getCurrentBlock(node, writingCanvas);
    if (!currentBlock) return;

    const currentFont = getCurrentFontName(writingCanvas);
    const fontFamily = getFontFamilyValue(currentFont);

    // Helper: check if at the start of the block (ignoring leading whitespace)
    const isAtStart = () => {
        const pattern = textBeforeCursor.trimStart();
        const prefix = textBeforeCursor.slice(0, textBeforeCursor.indexOf(pattern));
        return /^\s*$/.test(prefix);
    };

    // 1. Markdown-style Block Triggers (at start of line)
    if (isAtStart()) {
        const blockTriggers = [
            { pattern: '## ', tag: 'h2' },
            { pattern: '### ', tag: 'h3' },
            { pattern: '#### ', tag: 'h4' },
            { pattern: '> ', tag: 'blockquote' },
            { pattern: '* ', tag: 'list' },
            { pattern: '[] ', tag: 'task' }
        ];

        for (const trigger of blockTriggers) {
            if (textBeforeCursor.endsWith(trigger.pattern)) {
                e.preventDefault();
                if (pushToUndo) pushToUndo();

                // Delete trigger text
                range.setStart(node, offset - trigger.pattern.length);
                range.setEnd(node, offset);
                range.deleteContents();

                let newBlock;
                if (trigger.tag === 'list') {
                    // Manual list creation if not already in LI
                    if (currentBlock.tagName !== 'LI') {
                        const ul = document.createElement('ul');
                        const li = document.createElement('li');
                        if (fontFamily) li.style.fontFamily = fontFamily;
                        while (currentBlock.firstChild) li.appendChild(currentBlock.firstChild);
                        if (!li.textContent.trim()) li.innerHTML = '&#8203;';
                        ul.appendChild(li);
                        currentBlock.replaceWith(ul);
                        newBlock = li;
                    }
                } else if (trigger.tag === 'task') {
                    newBlock = transformToTask(currentBlock, writingCanvas, { fontFamily });
                } else {
                    if (currentBlock.tagName === 'LI') {
                        newBlock = splitList(currentBlock, trigger.tag, '', { fontFamily });
                    } else {
                        newBlock = convertBlockTo(currentBlock, trigger.tag, '', { fontFamily });
                    }
                }

                if (newBlock) setCursorAtEnd(newBlock, writingCanvas);
                if (saveCurrentNote) saveCurrentNote();
                return true;
            }
        }
    }

    // 2. Combo Shortcuts: $head+red+center.
    const comboMatch = textBeforeCursor.match(/\$([a-zA-Z0-9+]+)\.$/);
    if (comboMatch) {
        e.preventDefault();
        if (pushToUndo) pushToUndo();

        const matchText = comboMatch[0];
        const parsed = parseComboShortcut(comboMatch[1]);

        // Remove trigger text
        range.setStart(node, offset - matchText.length);
        range.setEnd(node, offset);
        range.deleteContents();

        const newTag = getHeadingTag(parsed.headingType);
        let targetBlock;

        if (currentBlock.tagName === 'LI') {
            targetBlock = splitList(currentBlock, newTag, '', { fontFamily });
        } else {
            targetBlock = convertBlockTo(currentBlock, newTag, '', { fontFamily });
        }

        if (parsed.color) targetBlock.style.color = parsed.color;
        if (parsed.alignment) targetBlock.style.textAlign = parsed.alignment;

        setCursorAtEnd(targetBlock, writingCanvas);
        if (saveCurrentNote) saveCurrentNote();
        return true;
    }

    // 3. Inline Color Shortcut: @colorName.
    const colorMatch = textBeforeCursor.match(/@([a-zA-Z]+)\.$/);
    if (colorMatch) {
        e.preventDefault();
        if (pushToUndo) pushToUndo();

        const colorName = colorMatch[1];
        range.setStart(node, offset - colorMatch[0].length);
        range.setEnd(node, offset);
        range.deleteContents();

        applyColor(colorName);
        if (saveCurrentNote) saveCurrentNote();
        return true;
    }

    // 4. Alignment Shortcuts: /center, /right, /left (and legacy #center.)
    const alignRegex = /(\/|#)(center|right|left|start|end)\.?$/i;
    const alignMatch = textBeforeCursor.match(alignRegex);
    if (alignMatch) {
        e.preventDefault();
        if (pushToUndo) pushToUndo();

        const alignType = alignMatch[2].toLowerCase();
        const alignMap = {
            'center': 'center',
            'right': 'right',
            'left': 'left',
            'start': 'left',
            'end': 'right'
        };

        range.setStart(node, offset - alignMatch[0].length);
        range.setEnd(node, offset);
        range.deleteContents();

        currentBlock.style.textAlign = alignMap[alignType] || 'left';

        setCursorAtEnd(currentBlock, writingCanvas);
        if (saveCurrentNote) saveCurrentNote();
        return true;
    }

    // 5. Horizontal Rule: ---
    if (isAtStart() && textBeforeCursor.endsWith('---')) {
        e.preventDefault();
        if (pushToUndo) pushToUndo();

        range.setStart(node, offset - 3);
        range.setEnd(node, offset);
        range.deleteContents();

        const hr = document.createElement('hr');
        hr.className = 'horizontal-line';
        const p = document.createElement('div');
        p.innerHTML = '<br>';

        if (currentBlock.tagName === 'LI') {
            const parentUl = currentBlock.parentElement;
            parentUl.after(hr);
            hr.after(p);
            currentBlock.remove();
            if (parentUl.children.length === 0) parentUl.remove();
        } else {
            currentBlock.replaceWith(hr);
            hr.after(p);
        }

        setCursorAtEnd(p, writingCanvas);
        if (saveCurrentNote) saveCurrentNote();
        return true;
    }

    // 6. Markdown-style Inline Shortcuts: *bold*, ~italic~, etc.
    // These must work within the same line.
    const inlineShortcuts = [
        { pattern: /\*\*(?=\S)(.+?[^\s])\*\*$/, wrap: 'b' },
        { pattern: /\*(?=\S)([^*]+?[^\s*])\*$/, wrap: 'b' },
        { pattern: /__(?=\S)(.+?[^\s])__$/, wrap: 'u' },
        { pattern: /~(?=\S)(.+?[^\s])~$/, wrap: 'i' },
        { pattern: /`(?=\S)(.+?[^\s])`$/, wrap: 'code' }
    ];

    for (const shortcut of inlineShortcuts) {
        const match = textBeforeCursor.match(shortcut.pattern);
        if (match) {
            // Check if we should actually trigger.
            // The user wants it to trigger as soon as the closing char is typed.
            // Since this is called on 'input', the textBeforeCursor already includes the closing char.

            e.preventDefault();
            if (pushToUndo) pushToUndo();

            const fullMatch = match[0];
            const content = match[1];

            range.setStart(node, offset - fullMatch.length);
            range.setEnd(node, offset);
            range.deleteContents();

            const el = document.createElement(shortcut.wrap);
            el.textContent = content;
            if (shortcut.wrap === 'code') {
                el.style.backgroundColor = 'rgba(128,128,128,0.1)';
                el.style.padding = '2px 4px';
                el.style.borderRadius = '4px';
                el.style.fontFamily = 'monospace';
            }
            range.insertNode(el);

            // Revert to normal style after the element
            const afterSpan = document.createElement('span');
            afterSpan.innerHTML = '&#8203;';
            el.after(afterSpan);

            setCursorAtEnd(afterSpan, writingCanvas);

            if (saveCurrentNote) saveCurrentNote();
            return true;
        }
    }

    return false;
}

function transformToTask(currentBlock, writingCanvas, options = {}) {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task-item';
    if (options.fontFamily) taskDiv.style.fontFamily = options.fontFamily;
    taskDiv.innerHTML = `
        <label class="custom-checkbox-wrapper" contenteditable="false">
            <input type="checkbox">
            <span class="checkmark"></span>
        </label>
        <span style="flex:1;">&#8203;</span>
    `;
    const contentSpan = taskDiv.querySelector('span:last-child');

    while (currentBlock.firstChild) contentSpan.appendChild(currentBlock.firstChild);
    if (!contentSpan.textContent.trim()) contentSpan.innerHTML = '&#8203;';

    if (currentBlock.tagName === 'LI') {
        const parentUl = currentBlock.parentElement;
        parentUl.after(taskDiv);
        currentBlock.remove();
        if (parentUl.children.length === 0) parentUl.remove();
    } else {
        currentBlock.replaceWith(taskDiv);
    }

    return contentSpan;
}
