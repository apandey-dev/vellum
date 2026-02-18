// js/editor.js
// Editor functionality and Note management

import { supabase } from '/js/supabase-client.js';
import { escapeHtml } from '/js/utils.js';

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

// --- STATE ---
export let notes = [];
export let folders = [];
export let activeNoteId = null;
export let activeFolderId = null;
export let undoStack = [];
export let undoIndex = -1;
const MAX_UNDO = 50;

let savedCursorRange = null;
let isProcessing = false;

// --- ELEMENT REFERENCES ---
const writingCanvas = document.getElementById('writingCanvas');
const formattingIndicator = document.getElementById('formattingIndicator');
const noteChips = document.getElementById('noteChips');
const deleteBtn = document.getElementById('deleteBtn');
const pinBtn = document.getElementById('pinBtn');
const currentFontSpan = document.getElementById('currentFont');

// --- SETTERS ---
export function setActiveFolder(folderId) {
    activeFolderId = folderId;
    window.activeFolderId = folderId;
}

export function setActiveNote(noteId) {
    activeNoteId = noteId;
    window.activeNoteId = noteId;
}

// --- DATA OPERATIONS ---

export async function loadFolders(userId) {
    const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error loading folders:', error);
        return [];
    }
    folders = data;
    return folders;
}

export async function createFolder(name, userId) {
    const { data, error } = await supabase
        .from('folders')
        .insert([{ name: name, user_id: userId }])
        .select()
        .single();

    if (error) {
        console.error('Error creating folder:', error);
        return null;
    }
    folders.push(data);
    return data;
}

export async function loadNotes(userId) {
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error loading notes:', error);
        return [];
    }
    notes = data;
    return notes;
}

export async function saveCurrentNote() {
    if (!activeNoteId || !writingCanvas) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        note.content = writingCanvas.innerHTML;
        const { error } = await supabase
            .from('notes')
            .update({
                content: note.content,
                updated_at: new Date()
            })
            .eq('id', activeNoteId);

        if (error) console.error('Save failed', error);
    }
}
window.saveCurrentNote = saveCurrentNote;

export async function createNote(title, folderId, userId) {
    const { data, error } = await supabase
        .from('notes')
        .insert([{
            title: title,
            folder_id: folderId,
            content: '',
            user_id: userId,
            is_pinned: false
        }])
        .select()
        .single();

    if (error) {
        console.error('Error creating note:', error);
        return null;
    }

    notes.unshift(data);
    return data;
}

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

function setCursorAtEnd(element) {
    const range = document.createRange();
    const sel = window.getSelection();
    if (!element) return;

    if (element.nodeType === 3) {
        range.setStart(element, element.length);
        range.collapse(true);
    } else {
        range.selectNodeContents(element);
        range.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(range);
    writingCanvas.focus();
}

// --- UNDO / REDO ---
export function pushToUndo() {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;

    if (undoIndex < undoStack.length - 1) {
        undoStack = undoStack.slice(0, undoIndex + 1);
    }
    const snapshot = {
        noteId: activeNoteId,
        content: note.content
    };
    undoStack.push(snapshot);
    if (undoStack.length > MAX_UNDO) {
        undoStack.shift();
    } else {
        undoIndex++;
    }
}
window.pushToUndo = pushToUndo;

// --- EDITOR HELPERS ---
function getCurrentBlock(node) {
    let current = node;
    if (current && current.nodeType === 3) {
        if (current.parentElement === writingCanvas) return current;
        current = current.parentElement;
    }

    while (current && current !== writingCanvas) {
        if (current.tagName === 'LI') return current;
        if (current.classList && current.classList.contains('task-item')) return current;
        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'].includes(current.tagName)) return current;
        if (current.parentElement === writingCanvas) return current;
        current = current.parentElement;
    }
    return null;
}

function convertBlockTo(newTagName, lineBlock, preserveContent = true, className = '') {
    if (!lineBlock) return null;
    const newEl = document.createElement(newTagName);
    if (className) newEl.className = className;

    if (lineBlock.nodeType === 3) {
        newEl.textContent = lineBlock.textContent;
    } else {
        while (lineBlock.firstChild) newEl.appendChild(lineBlock.firstChild);
    }

    if (!newEl.textContent.trim() && newEl.children.length === 0) {
        newEl.innerHTML = '&#8203;';
    }

    lineBlock.replaceWith(newEl);
    return newEl;
}

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

// --- FONT HANDLING ---
function getCurrentFont() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return 'Fredoka';
    let node = selection.getRangeAt(0).startContainer;

    if (selection.isCollapsed) {
        if (node.nodeType === 3) node = node.parentElement;
        while (node && node !== writingCanvas) {
            if (node.tagName === 'SPAN' && node.style.fontFamily) {
                const fam = node.style.fontFamily;
                for (const [name, val] of Object.entries(formattingConfig.fonts)) {
                    if (fam.includes(name) || val.includes(fam)) return name;
                }
            }
            node = node.parentElement;
        }
    } else {
        if (node.nodeType === 3) node = node.parentElement;
    }

    while (node && node !== writingCanvas) {
        const computed = window.getComputedStyle(node).fontFamily;
        for (const [name, fam] of Object.entries(formattingConfig.fonts)) {
            if (computed.includes(name)) return name;
        }
        node = node.parentElement;
    }
    return 'Fredoka';
}

export function updateFontDisplay() {
    if (!currentFontSpan) return;
    const current = getCurrentFont();
    currentFontSpan.textContent = current;
    const fontOptions = document.querySelectorAll('.font-option');
    fontOptions.forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.font === current) opt.classList.add('active');
    });
}
window.updateFontDisplay = updateFontDisplay;

function applyFontAtCursor(fontName) {
    if (savedCursorRange) restoreCursorRange();
    else writingCanvas.focus();

    const selection = window.getSelection();
    if (selection.isCollapsed) {
        const span = document.createElement('span');
        span.style.fontFamily = formattingConfig.fonts[fontName];
        span.innerHTML = '&#8203;';
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(span);
        range.setStart(span, 1);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        updateFontDisplay();
    } else {
        document.execCommand('fontName', false, formattingConfig.fonts[fontName]);
    }
    saveCurrentNote();
}

// --- KEYBOARD HANDLERS ---
function handleInlineShortcuts(e) {
    if (isProcessing) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== 3) return;

    const text = node.textContent;
    const offset = range.startOffset;
    const currentBlock = getCurrentBlock(node);
    if (!currentBlock) return;

    const textBeforeCursor = text.slice(0, offset);

    function isSimulationOfStart(pattern) {
        if (!textBeforeCursor.endsWith(pattern)) return false;
        const prefix = textBeforeCursor.slice(0, -pattern.length);
        if (!/^\s*$/.test(prefix)) return false;
        return true;
    }

    function transformCurrentBlock(newTagName, className = '') {
        range.deleteContents();
        if (currentBlock.tagName === 'LI') {
            const parentUl = currentBlock.parentElement;
            const newEl = document.createElement(newTagName);
            if (className) newEl.className = className;
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
        } else {
            return convertBlockTo(newTagName, currentBlock, true, className);
        }
    }

    // Shortcuts
    if (isSimulationOfStart('## ')) {
        e.preventDefault(); isProcessing = true; pushToUndo();
        range.setStart(node, offset - 3); range.setEnd(node, offset);
        const newBlock = transformCurrentBlock('h2'); setCursorAtEnd(newBlock);
        saveCurrentNote(); isProcessing = false; return;
    }
    if (isSimulationOfStart('### ')) {
        e.preventDefault(); isProcessing = true; pushToUndo();
        range.setStart(node, offset - 4); range.setEnd(node, offset);
        const newBlock = transformCurrentBlock('h3'); setCursorAtEnd(newBlock);
        saveCurrentNote(); isProcessing = false; return;
    }
    if (isSimulationOfStart('#### ')) {
        e.preventDefault(); isProcessing = true; pushToUndo();
        range.setStart(node, offset - 5); range.setEnd(node, offset);
        const newBlock = transformCurrentBlock('h4'); setCursorAtEnd(newBlock);
        saveCurrentNote(); isProcessing = false; return;
    }
    if (isSimulationOfStart('* ')) {
        e.preventDefault(); if (currentBlock.tagName === 'LI') return;
        isProcessing = true; pushToUndo();
        range.setStart(node, offset - 2); range.setEnd(node, offset);
        range.deleteContents();
        const ul = document.createElement('ul'); const li = document.createElement('li');
        if (currentBlock.nodeType === 3) li.textContent = currentBlock.textContent;
        else while (currentBlock.firstChild) li.appendChild(currentBlock.firstChild);
        if (!li.textContent.trim()) li.innerHTML = '&#8203;';
        ul.appendChild(li); currentBlock.replaceWith(ul);
        setCursorAtEnd(li); saveCurrentNote(); isProcessing = false; return;
    }
    if (isSimulationOfStart('[] ')) {
        e.preventDefault(); isProcessing = true; pushToUndo();
        range.setStart(node, offset - 3); range.setEnd(node, offset); range.deleteContents();
        const taskDiv = document.createElement('div'); taskDiv.className = 'task-item';
        taskDiv.innerHTML = `<label class="custom-checkbox-wrapper" contenteditable="false"><input type="checkbox"><span class="checkmark"></span></label><span style="flex:1;">&#8203;</span>`;
        const cb = taskDiv.querySelector('input');
        cb.addEventListener('click', function () { this.closest('.task-item').classList.toggle('completed'); saveCurrentNote(); });
        const contentSpan = taskDiv.querySelector('span:last-child');
        const source = currentBlock;
        while (source.firstChild) contentSpan.appendChild(source.firstChild);
        if (!contentSpan.textContent.trim()) contentSpan.innerHTML = '&#8203;';
        if (source.tagName === 'LI') {
            const parentUl = source.parentElement; const index = Array.from(parentUl.children).indexOf(source);
            const after = Array.from(parentUl.children).slice(index + 1);
            parentUl.after(taskDiv); if (after.length > 0) {
                const ulAfter = document.createElement('ul'); after.forEach(li => ulAfter.appendChild(li)); taskDiv.after(ulAfter);
            }
            source.remove(); if (parentUl.children.length === 0) parentUl.remove();
        } else { source.replaceWith(taskDiv); }
        setCursorAtEnd(contentSpan); saveCurrentNote(); isProcessing = false; return;
    }
    if (isSimulationOfStart('> ')) {
        e.preventDefault(); isProcessing = true; pushToUndo();
        range.setStart(node, offset - 2); range.setEnd(node, offset);
        const newBlock = transformCurrentBlock('blockquote'); setCursorAtEnd(newBlock);
        saveCurrentNote(); isProcessing = false; return;
    }
    if (isSimulationOfStart('---') && offset === text.length) {
        e.preventDefault(); isProcessing = true; pushToUndo();
        const hr = document.createElement('hr'); hr.className = 'horizontal-line';
        const p = document.createElement('div'); p.innerHTML = '<br>';
        if (currentBlock.tagName === 'LI') {
             const parentUl = currentBlock.parentElement; const index = Array.from(parentUl.children).indexOf(currentBlock);
             const after = Array.from(parentUl.children).slice(index + 1);
             parentUl.after(hr); hr.after(p);
             if (after.length > 0) {
                 const ulAfter = document.createElement('ul'); after.forEach(li => ulAfter.appendChild(li)); p.after(ulAfter);
             }
             currentBlock.remove(); if (parentUl.children.length === 0) parentUl.remove();
        } else { currentBlock.replaceWith(hr); hr.after(p); }
        setCursorAtEnd(p); saveCurrentNote(); isProcessing = false; return;
    }

    if (textBeforeCursor.endsWith('.')) {
        const alignMatch = textBeforeCursor.match(/#(center|start|end)\.$/);
        if (alignMatch) {
             e.preventDefault(); isProcessing = true; pushToUndo();
             const alignType = alignMatch[1]; const matchLength = alignMatch[0].length;
             range.setStart(node, offset - matchLength); range.setEnd(node, offset); range.deleteContents();
             const alignMap = { 'center': 'center', 'start': 'left', 'end': 'right' };
             currentBlock.style.textAlign = alignMap[alignType] || 'left';
             setCursorAtEnd(currentBlock); saveCurrentNote(); isProcessing = false; return;
        }
        const complexMatch = textBeforeCursor.match(/\$([a-zA-Z0-9+]+)\.$/);
        if (complexMatch && isSimulationOfStart(complexMatch[0])) {
             const fullString = complexMatch[1]; const parts = fullString.split('+');
             const headingType = parts[0]; let colorName = null; let alignment = null;
             const alignKeywords = ['center', 'start', 'end'];
             for (let i = 1; i < parts.length; i++) {
                 const part = parts[i]; if (alignKeywords.includes(part)) alignment = part; else colorName = part;
             }
             e.preventDefault(); isProcessing = true; pushToUndo();
             const matchLength = complexMatch[0].length; range.setStart(node, offset - matchLength); range.setEnd(node, offset);
             let newTag = 'div';
             if (headingType === 'head') newTag = 'h2';
             else if (headingType === 'subhead') newTag = 'h3';
             else if (headingType === 'subhead2') newTag = 'h4';
             let targetBlock = currentBlock;
             const currentTagName = currentBlock.tagName ? currentBlock.tagName.toLowerCase() : 'div';
             if (newTag !== currentTagName) {
                 range.deleteContents();
                 if (currentBlock.tagName === 'LI') {
                     const parentUl = currentBlock.parentElement; const newEl = document.createElement(newTag);
                     while (currentBlock.firstChild) newEl.appendChild(currentBlock.firstChild);
                     if (!newEl.innerHTML.trim()) newEl.innerHTML = '&#8203;';
                     const index = Array.from(parentUl.children).indexOf(currentBlock);
                     const after = Array.from(parentUl.children).slice(index + 1);
                     parentUl.after(newEl); if (after.length > 0) {
                         const ulAfter = document.createElement('ul'); after.forEach(li => ulAfter.appendChild(li)); newEl.after(ulAfter);
                     }
                     currentBlock.remove(); if (parentUl.children.length === 0) parentUl.remove();
                     targetBlock = newEl;
                 } else { targetBlock = convertBlockTo(newTag, currentBlock, true); }
             } else { range.deleteContents(); }
             if (colorName) targetBlock.style.color = colorName; else targetBlock.style.color = '';
             if (alignment) {
                 const alignMap = { 'center': 'center', 'start': 'left', 'end': 'right' };
                 targetBlock.style.textAlign = alignMap[alignment] || 'left';
             } else { targetBlock.style.textAlign = ''; }
             setCursorAtEnd(targetBlock); saveCurrentNote(); isProcessing = false; return;
        }
        const match = textBeforeCursor.match(/@([a-zA-Z]+)\.$/);
        if (match) {
            e.preventDefault(); isProcessing = true; pushToUndo();
            const colorName = match[1]; const start = offset - match[0].length;
            range.setStart(node, start); range.setEnd(node, offset); range.deleteContents();
            const span = document.createElement('span'); span.style.color = colorName; span.innerHTML = '&#8203;';
            range.insertNode(span); setCursorAtEnd(span.firstChild);
            saveCurrentNote(); isProcessing = false;
        }
    }
}

function handleBackspace(e) {
    if (e.key !== 'Backspace' || isProcessing) return;
    const sel = window.getSelection();
    if (!sel.rangeCount || !sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (range.startOffset !== 0) return;
    const currentBlock = getCurrentBlock(node);
    if (!currentBlock) return;
    const hasStyle = (currentBlock.style && ((currentBlock.style.textAlign && currentBlock.style.textAlign !== 'left') ||
                     (currentBlock.style.color && currentBlock.style.color !== '')));
    const isSpecial = (currentBlock.tagName && ['H1','H2','H3','H4','LI','BLOCKQUOTE'].includes(currentBlock.tagName)) ||
                      currentBlock.classList.contains('task-item') || hasStyle;
    if (!isSpecial) return;
    let isAtStart = false;
    if (node === currentBlock) isAtStart = true;
    else if (node.parentNode === currentBlock && !node.previousSibling) isAtStart = true;
    if (currentBlock.classList.contains('task-item')) {
        const contentSpan = currentBlock.querySelector('span:last-child');
        if (contentSpan && (node === contentSpan || contentSpan.contains(node))) {
             if (node === contentSpan && range.startOffset === 0) isAtStart = true;
             else if (node.parentNode === contentSpan && !node.previousSibling && range.startOffset === 0) isAtStart = true;
        }
    }
    if (!isAtStart) return;
    e.preventDefault(); isProcessing = true; pushToUndo();
    if (currentBlock.tagName === 'LI') {
        const parentUl = currentBlock.parentNode; const newDiv = document.createElement('div');
        while (currentBlock.firstChild) newDiv.appendChild(currentBlock.firstChild);
        if (parentUl.children.length === 1) parentUl.replaceWith(newDiv);
        else {
             const index = Array.from(parentUl.children).indexOf(currentBlock);
             const after = Array.from(parentUl.children).slice(index + 1);
             const ulAfter = document.createElement('ul'); after.forEach(li => ulAfter.appendChild(li));
             currentBlock.remove();
             if (index === 0) { parentUl.before(newDiv); if (after.length === 0) parentUl.remove(); }
             else { parentUl.after(newDiv); if (after.length > 0) newDiv.after(ulAfter); }
        }
        setCursorAtEnd(newDiv);
    } else if (currentBlock.classList.contains('task-item')) {
        const checkboxWrapper = currentBlock.querySelector('.custom-checkbox-wrapper');
        if (checkboxWrapper) checkboxWrapper.remove();
        currentBlock.classList.remove('task-item', 'completed');
        if (!currentBlock.innerHTML.trim()) currentBlock.innerHTML = '<br>';
        const range = document.createRange(); range.selectNodeContents(currentBlock); range.collapse(true);
        sel.removeAllRanges(); sel.addRange(range);
    } else {
        const newDiv = unwrapBlock(currentBlock); newDiv.style.color = ''; newDiv.style.textAlign = '';
        setCursorAtEnd(newDiv);
    }
    saveCurrentNote(); isProcessing = false;
}

function handleEnter(e) {
    if (e.key !== 'Enter' || isProcessing) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const node = sel.anchorNode;
    const currentBlock = getCurrentBlock(node);
    if (!currentBlock) return;
    if (currentBlock.tagName === 'LI') {
        e.preventDefault(); isProcessing = true; pushToUndo();
        const text = currentBlock.textContent.trim();
        if (!text || text === '\u200B') {
             const parentUl = currentBlock.parentElement; const newP = document.createElement('div'); newP.innerHTML = '<br>';
             if (parentUl.children.length === 1) parentUl.replaceWith(newP);
             else {
                 if (currentBlock === parentUl.lastElementChild) { currentBlock.remove(); parentUl.after(newP); }
                 else {
                     const index = Array.from(parentUl.children).indexOf(currentBlock);
                     const after = Array.from(parentUl.children).slice(index + 1);
                     const ulAfter = document.createElement('ul'); after.forEach(li => ulAfter.appendChild(li));
                     currentBlock.remove(); parentUl.after(newP); if (ulAfter.children.length > 0) newP.after(ulAfter);
                 }
             }
             setCursorAtEnd(newP);
        } else {
            const newLi = document.createElement('li'); newLi.innerHTML = '&#8203;'; currentBlock.after(newLi); setCursorAtEnd(newLi);
        }
        saveCurrentNote(); isProcessing = false;
    } else if (currentBlock.classList.contains('task-item')) {
        e.preventDefault(); isProcessing = true; pushToUndo();
        const text = currentBlock.textContent.trim();
        if (!text || text === '\u200B') {
            const newP = document.createElement('div'); newP.innerHTML = '<br>'; currentBlock.replaceWith(newP); setCursorAtEnd(newP);
        } else {
             const newTask = document.createElement('div'); newTask.className = 'task-item';
             newTask.innerHTML = `<label class="custom-checkbox-wrapper" contenteditable="false"><input type="checkbox"><span class="checkmark"></span></label><span style="flex:1;">&#8203;</span>`;
             newTask.querySelector('input').addEventListener('click', function () { this.closest('.task-item').classList.toggle('completed'); saveCurrentNote(); });
             currentBlock.after(newTask); setCursorAtEnd(newTask.querySelector('span:last-child'));
        }
        saveCurrentNote(); isProcessing = false;
    } else if (currentBlock.tagName && ['H1','H2','H3','H4','BLOCKQUOTE'].includes(currentBlock.tagName)) {
        e.preventDefault(); isProcessing = true; pushToUndo();
        const newP = document.createElement('div'); newP.innerHTML = '<br>'; currentBlock.after(newP); setCursorAtEnd(newP);
        saveCurrentNote(); isProcessing = false;
    }
}

function handleTab(e) {
    if (e.key !== 'Tab' || isProcessing) return;
    const sel = window.getSelection(); if (!sel.rangeCount) return;
    const node = sel.anchorNode; const currentBlock = getCurrentBlock(node); if (!currentBlock) return;
    if (currentBlock.tagName === 'LI') {
        e.preventDefault(); isProcessing = true; pushToUndo();
        if (e.shiftKey) {
            const parentUl = currentBlock.parentElement; const grandparentLi = parentUl.parentElement;
            if (grandparentLi && grandparentLi.tagName === 'LI') {
                 grandparentLi.parentElement.insertBefore(currentBlock, grandparentLi.nextSibling);
                 if (parentUl.children.length === 0) parentUl.remove();
                 setCursorAtEnd(currentBlock);
            }
        } else {
            const prevLi = currentBlock.previousElementSibling;
            if (prevLi && prevLi.tagName === 'LI') {
                let nestedUl = prevLi.querySelector('ul');
                if (!nestedUl) { nestedUl = document.createElement('ul'); prevLi.appendChild(nestedUl); }
                nestedUl.appendChild(currentBlock); setCursorAtEnd(currentBlock);
            }
        }
        saveCurrentNote(); isProcessing = false;
    }
}

function handleStandardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        let cmd = '';
        if (e.key === 'b') cmd = 'bold'; else if (e.key === 'i') cmd = 'italic'; else if (e.key === 'u') cmd = 'underline';
        if (cmd) { e.preventDefault(); document.execCommand(cmd, false, null); saveCurrentNote(); updateFontDisplay(); }
    }
}

// --- UI RENDERING ---

export function renderNoteChips() {
    if (!noteChips) return;
    noteChips.innerHTML = '';
    const folderNotes = notes.filter(n => n.folder_id === activeFolderId);
    if (folderNotes.length === 0) {
        const emptyChip = document.createElement('div'); emptyChip.className = 'chip empty-chip';
        emptyChip.textContent = 'No notes'; noteChips.appendChild(emptyChip); return;
    }
    folderNotes.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
        return new Date(b.updated_at) - new Date(a.updated_at);
    });
    folderNotes.forEach(note => {
        const chip = document.createElement('div'); chip.className = `chip ${note.id === activeNoteId ? 'active' : ''} ${note.is_pinned ? 'pinned' : ''}`;
        chip.dataset.noteId = note.id; const chipContent = document.createElement('div'); chipContent.className = 'chip-content';
        if (note.is_pinned) { const pinIcon = document.createElement('i'); pinIcon.className = 'fas fa-thumbtack gap'; chipContent.appendChild(pinIcon); }
        const textSpan = document.createElement('span'); textSpan.textContent = note.title;
        chipContent.appendChild(textSpan); chip.appendChild(chipContent);
        chip.onclick = () => { if (activeNoteId) saveCurrentNote(); setActiveNote(note.id); loadActiveNote(); renderNoteChips(); };
        chip.oncontextmenu = (e) => {
            e.preventDefault(); window.contextMenuNoteId = note.id;
            const menu = document.getElementById('noteContextMenu');
            if (menu) {
                menu.style.left = `${e.pageX}px`; menu.style.top = `${e.pageY}px`; menu.classList.add('show');
                const ctxPin = document.getElementById('ctxPin');
                if (ctxPin) ctxPin.innerHTML = note.is_pinned ? '<i class="fas fa-thumbtack-slash"></i> Unpin Note' : '<i class="fas fa-thumbtack"></i> Pin Note';
            }
        };
        noteChips.appendChild(chip);
    });
}

export function loadActiveNote() {
    if (!writingCanvas) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        writingCanvas.innerHTML = note.content || '';
        writingCanvas.contentEditable = 'true'; writingCanvas.classList.remove('empty-folder-message');
        updatePinButton(); updateFontDisplay();
        if (deleteBtn) deleteBtn.classList.remove('disabled');
    } else {
        const folderNotes = notes.filter(n => n.folder_id === activeFolderId);
        if (folderNotes.length === 0) {
            writingCanvas.innerHTML = `<div class="empty-folder-message"><div class="empty-folder-icon"><i class="fas fa-note-sticky"></i></div><h3>No Notes in This Folder</h3><p>This folder is empty. Create a new note to get started!</p><button class="create-note-btn abc" onclick="window.openModal('newNoteModal')">Create New Note</button></div>`;
            writingCanvas.contentEditable = 'false'; writingCanvas.classList.add('empty-folder-message');
            if (deleteBtn) deleteBtn.classList.add('disabled');
        } else { setActiveNote(folderNotes[0].id); loadActiveNote(); }
    }
}

function updatePinButton() {
    if (!pinBtn) return;
    pinBtn.innerHTML = '<i class="fas fa-thumbtack"></i>';
    const note = notes.find(n => n.id === activeNoteId);
    if (note && note.is_pinned) pinBtn.classList.add('pinned'); else pinBtn.classList.remove('pinned');
}

export function showFormattingIndicator(message, type = 'info') {
    if (!formattingIndicator) return;
    formattingIndicator.textContent = message; formattingIndicator.className = 'formatting-indicator show';
    if (type === 'success') formattingIndicator.classList.add('success'); else if (type === 'error') formattingIndicator.classList.add('error');
    setTimeout(() => { formattingIndicator.classList.remove('show', 'success', 'error'); }, 3000);
}
window.showFormattingIndicator = showFormattingIndicator;

// --- SETUP ---
export function setupEditorListeners() {
    if (!writingCanvas) return;
    writingCanvas.addEventListener('input', (e) => {
        handleInlineShortcuts(e);
        clearTimeout(window.saveTimeout);
        window.saveTimeout = setTimeout(() => { saveCurrentNote(); pushToUndo(); }, 1000);
    });
    writingCanvas.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') handleBackspace(e);
        if (e.key === 'Enter') handleEnter(e);
        if (e.key === 'Tab') handleTab(e);
        handleStandardShortcuts(e);
    });
    writingCanvas.addEventListener('click', () => updateFontDisplay());
    writingCanvas.addEventListener('keyup', (e) => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) updateFontDisplay(); });
    writingCanvas.addEventListener('focus', () => updateFontDisplay());
    document.addEventListener('selectionchange', () => { if (document.activeElement === writingCanvas) updateFontDisplay(); });

    // Font selector
    const fontSelectorBtn = document.getElementById('fontSelectorBtn');
    const fontDropdown = document.getElementById('fontDropdown');
    const fontOptions = document.querySelectorAll('.font-option');
    if (fontSelectorBtn && fontDropdown) {
        fontSelectorBtn.addEventListener('mousedown', saveCursorRange);
        fontSelectorBtn.addEventListener('click', (e) => { e.stopPropagation(); fontSelectorBtn.classList.toggle('active'); fontDropdown.classList.toggle('active'); });
        document.addEventListener('click', (e) => {
            if (!fontSelectorBtn || !fontDropdown) return;
            if (!fontSelectorBtn.contains(e.target) && !fontDropdown.contains(e.target)) {
                fontSelectorBtn.classList.remove('active');
                fontDropdown.classList.remove('active');
            }
        });
        fontOptions.forEach(option => {
            option.addEventListener('click', () => { const selectedFont = option.dataset.font; applyFontAtCursor(selectedFont); fontSelectorBtn.classList.remove('active'); fontDropdown.classList.remove('active'); });
        });
    }

    // Task Item click handlers (delegated)
    writingCanvas.addEventListener('click', (e) => {
        const checkbox = e.target.closest('.custom-checkbox-wrapper input');
        if (checkbox) {
            checkbox.closest('.task-item').classList.toggle('completed');
            saveCurrentNote();
        }
    });

    // Paste handler
    writingCanvas.addEventListener('paste', (e) => {
        e.preventDefault(); const clipboardData = e.clipboardData || window.clipboardData; if (!clipboardData) return;
        let text = clipboardData.getData('text/plain');
        if (text) {
            const selection = window.getSelection(); if (!selection.rangeCount) return;
            const range = selection.getRangeAt(0); range.deleteContents();
            const lines = text.split(/\r\n|\r|\n/); let html = '';
            for (let i = 0; i < lines.length; i++) {
                let line = escapeHtml(lines[i]); line = line.replace(/^ +/g, (match) => '&nbsp;'.repeat(match.length));
                html += line; if (i < lines.length - 1) html += '<br>';
            }
            document.execCommand('insertHTML', false, html); saveCurrentNote(); return;
        }
        let html = clipboardData.getData('text/html');
        if (html) {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null, false);
            while (walker.nextNode()) {
                const el = walker.currentNode; const attrs = el.attributes;
                for (let i = attrs.length - 1; i >= 0; i--) { const attrName = attrs[i].name; if (!['href', 'src', 'alt'].includes(attrName)) el.removeAttribute(attrName); }
                if (['SCRIPT', 'STYLE', 'META', 'LINK', 'OBJECT', 'IFRAME'].includes(el.tagName)) el.remove();
            }
            document.execCommand('insertHTML', false, doc.body.innerHTML); saveCurrentNote();
        }
    });
}
