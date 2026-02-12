// ========================================
// mindJournal - COMPLETE NOTES APP
// ========================================

// --- ELEMENT REFERENCES ---
const sidebar = document.getElementById('sidebar');
const topBar = document.getElementById('topBar');
const workspace = document.querySelector('.workspace');
const focusBtn = document.getElementById('focusBtn');
const restoreBtn = document.getElementById('restoreBtn');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const html = document.documentElement;
const writingCanvas = document.getElementById('writingCanvas');
const fontSelectorBtn = document.getElementById('fontSelectorBtn');
const fontDropdown = document.getElementById('fontDropdown');
const currentFontSpan = document.getElementById('currentFont');
const fontOptions = document.querySelectorAll('.font-option');
const formattingIndicator = document.getElementById('formattingIndicator');

// Modal elements
const confirmModal = document.getElementById('confirmModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const newNoteModal = document.getElementById('newNoteModal');
const manageFoldersModal = document.getElementById('manageFoldersModal');
const exportModal = document.getElementById('exportModal');
const closeExportModalBtn = document.getElementById('closeExportModal');
const exportConfirmBtn = document.getElementById('exportConfirmBtn');
const exportFileNameInput = document.getElementById('exportFileName');
const exportCards = document.querySelectorAll('.export-card');
const pdfOptions = document.getElementById('pdfOptions');
const themeTogglePill = document.querySelector('.theme-toggle-pill');
const themePillOptions = document.querySelectorAll('.theme-pill-option');
const includeHeaderFooter = document.getElementById('includeHeaderFooter');

// Button elements
const exportBtn = document.getElementById('exportBtn');
const deleteBtn = document.getElementById('deleteBtn');
const bulletsBtn = document.getElementById('bulletsBtn');
const addNoteBtn = document.getElementById('addNoteBtn');
const pinBtn = document.getElementById('pinBtn');
const manageFoldersBtn = document.getElementById('manageFoldersBtn');
const shareBtn = document.getElementById('shareBtn');

// Dropdown menus
const bulletsMenu = document.getElementById('bulletsMenu');

// Note chips container
const noteChips = document.getElementById('noteChips');

// === NEW: Move Modal elements ===
const moveFileModal = document.getElementById('moveFileModal');
const moveFileNameSpan = document.getElementById('moveFileName');
const moveCurrentFolderSpan = document.getElementById('moveCurrentFolder');
const moveFolderSelectWrapper = document.getElementById('moveFolderSelectWrapper');
const moveFolderSelectTrigger = document.getElementById('moveFolderSelectTrigger');
const moveSelectedFolderName = document.getElementById('moveSelectedFolderName');
const moveFolderSelectOptions = document.getElementById('moveFolderSelectOptions');
const cancelMoveBtn = document.getElementById('cancelMoveBtn');
const confirmMoveBtn = document.getElementById('confirmMoveBtn');
const moveSuccess = document.getElementById('moveSuccess');

// === NEW: Track which note is being moved ===
let pendingMoveNoteId = null;

// --- STORAGE KEYS ---
const THEME_KEY = 'focuspad_theme';
const NOTES_KEY = 'focuspad_notes';
const FOLDERS_KEY = 'focuspad_folders';
const ACTIVE_NOTE_KEY = 'focuspad_activeNote';
const ACTIVE_FOLDER_KEY = 'focuspad_activeFolder';
const LAST_NOTE_PER_FOLDER_KEY = 'focuspad_lastNotePerFolder';

// --- DATA STRUCTURES ---
let notes = [];
let folders = [];
let activeNoteId = null;
let activeFolderId = 'default';
let lastNotePerFolder = {};

// Export state
let selectedExportFormat = null;

// ESC Key Hierarchy Management
let modalStack = [];

// --- FORMATTING CONFIG ---
const formattingConfig = {
    styles: {
        'bold': 'text-bold',
        'italic': 'text-italic',
        'underline': 'text-underline',
        'strike': 'text-strike',
        'normal': 'format-reset'
    },
    alignments: {
        'left': 'text-left',
        'center': 'text-center',
        'right': 'text-right'
    },
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

// --- INLINE FORMATTING SYSTEM ---
let isProcessingInlineCommand = false;
let activeFormattingSpan = null;

// Color name to class mapping
const colorClassMap = {
    'red': 'text-color-red',
    'blue': 'text-color-blue',
    'green': 'text-color-green',
    'yellow': 'text-color-yellow',
    'purple': 'text-color-purple',
    'pink': 'text-color-pink',
    'orange': 'text-color-orange',
    'gray': 'text-color-gray',
    'black': 'text-color-black',
    'white': 'text-color-white',
    'tomato': 'text-color-tomato',
    'cyan': 'text-color-cyan',
    'magenta': 'text-color-magenta',
    'brown': 'text-color-brown',
    'gold': 'text-color-gold',
    'silver': 'text-color-silver',
    'violet': 'text-color-violet',
    'indigo': 'text-color-indigo',
    'teal': 'text-color-teal',
    'maroon': 'text-color-maroon',
    'navy': 'text-color-navy',
    'olive': 'text-color-olive',
    'lime': 'text-color-lime',
    'aqua': 'text-color-aqua',
    'fuchsia': 'text-color-fuchsia',
    'coral': 'text-color-coral',
    'orangered': 'text-color-orangered',
    'deeppink': 'text-color-deeppink',
    'mediumvioletred': 'text-color-mediumvioletred',
    'darkviolet': 'text-color-darkviolet',
    'darkorchid': 'text-color-darkorchid',
    'darkmagenta': 'text-color-darkmagenta',
    'darkred': 'text-color-darkred',
    'darkgreen': 'text-color-darkgreen',
    'darkblue': 'text-color-darkblue',
    'darkcyan': 'text-color-darkcyan',
    'darkgoldenrod': 'text-color-darkgoldenrod',
    'darkgray': 'text-color-darkgray',
    'darkslategray': 'text-color-darkslategray',
    'lightslategray': 'text-color-lightslategray',
    'lightgray': 'text-color-lightgray',
    'whitesmoke': 'text-color-whitesmoke',
    'snow': 'text-color-snow',
    'ivory': 'text-color-ivory',
    'honeydew': 'text-color-honeydew',
    'mintcream': 'text-color-mintcream',
    'azure': 'text-color-azure',
    'aliceblue': 'text-color-aliceblue',
    'ghostwhite': 'text-color-ghostwhite',
    'lavender': 'text-color-lavender',
    'lavenderblush': 'text-color-lavenderblush',
    'mistyrose': 'text-color-mistyrose',
    'seashell': 'text-color-seashell',
    'oldlace': 'text-color-oldlace',
    'linen': 'text-color-linen',
    'beige': 'text-color-beige',
    'floralwhite': 'text-color-floralwhite',
    'cornsilk': 'text-color-cornsilk',
    'lemonchiffon': 'text-color-lemonchiffon',
    'lightyellow': 'text-color-lightyellow',
    'lightgoldenrodyellow': 'text-color-lightgoldenrodyellow',
    'papayawhip': 'text-color-papayawhip',
    'peachpuff': 'text-color-peachpuff',
    'bisque': 'text-color-bisque',
    'antiquewhite': 'text-color-antiquewhite',
    'blanchedalmond': 'text-color-blanchedalmond',
    'wheat': 'text-color-wheat',
    'navajowhite': 'text-color-navajowhite',
    'tan': 'text-color-tan',
    'burlywood': 'text-color-burlywood',
    'sandybrown': 'text-color-sandybrown',
    'peru': 'text-color-peru',
    'chocolate': 'text-color-chocolate',
    'saddlebrown': 'text-color-saddlebrown',
    'sienna': 'text-color-sienna',
    'rosybrown': 'text-color-rosybrown',
    'firebrick': 'text-color-firebrick',
    'indianred': 'text-color-indianred',
    'salmon': 'text-color-salmon',
    'lightsalmon': 'text-color-lightsalmon',
    'darksalmon': 'text-color-darksalmon',
    'lightcoral': 'text-color-lightcoral',
    'palevioletred': 'text-color-palevioletred',
    'hotpink': 'text-color-hotpink',
    'lightpink': 'text-color-lightpink',
    'plum': 'text-color-plum',
    'thistle': 'text-color-thistle',
    'orchid': 'text-color-orchid',
    'mediumorchid': 'text-color-mediumorchid',
    'mediumpurple': 'text-color-mediumpurple',
    'slateblue': 'text-color-slateblue',
    'mediumslateblue': 'text-color-mediumslateblue',
    'darkslateblue': 'text-color-darkslateblue',
    'midnightblue': 'text-color-midnightblue',
    'royalblue': 'text-color-royalblue',
    'steelblue': 'text-color-steelblue',
    'dodgerblue': 'text-color-dodgerblue',
    'deepskyblue': 'text-color-deepskyblue',
    'skyblue': 'text-color-skyblue',
    'lightskyblue': 'text-color-lightskyblue',
    'lightblue': 'text-color-lightblue',
    'powderblue': 'text-color-powderblue',
    'paleturquoise': 'text-color-paleturquoise',
    'lightcyan': 'text-color-lightcyan',
    'cadetblue': 'text-color-cadetblue',
    'darkturquoise': 'text-color-darkturquoise',
    'mediumturquoise': 'text-color-mediumturquoise',
    'turquoise': 'text-color-turquoise',
    'aquamarine': 'text-color-aquamarine',
    'seagreen': 'text-color-seagreen',
    'mediumseagreen': 'text-color-mediumseagreen',
    'springgreen': 'text-color-springgreen',
    'lawngreen': 'text-color-lawngreen',
    'chartreuse': 'text-color-chartreuse',
    'greenyellow': 'text-color-greenyellow',
    'palegreen': 'text-color-palegreen',
    'lightgreen': 'text-color-lightgreen',
    'mediumspringgreen': 'text-color-mediumspringgreen',
    'darkseagreen': 'text-color-darkseagreen',
    'forestgreen': 'text-color-forestgreen',
    'olivedrab': 'text-color-olivedrab',
    'darkolivegreen': 'text-color-darkolivegreen',
    'yellowgreen': 'text-color-yellowgreen',
    'khaki': 'text-color-khaki',
    'darkkhaki': 'text-color-darkkhaki',
    'rebeccapurple': 'text-color-rebeccapurple',
    'cornflowerblue': 'text-color-cornflowerblue',
    'mediumaquamarine': 'text-color-mediumaquamarine',
    'darkslategrey': 'text-color-darkslategrey',
    'dimgrey': 'text-color-dimgrey',
    'grey': 'text-color-grey',
    'lightgrey': 'text-color-lightgrey',
    'lightslategrey': 'text-color-lightslategrey',
    'slategrey': 'text-color-slategrey'
};

function isValidColor(colorStr) {
    const s = new Option().style;
    s.color = colorStr;
    return s.color !== '';
}

// Parse inline formatting command
function parseInlineCommand(command) {
    const result = {
        classes: ['inline-format'],
        styles: {},
        elementType: 'span',
        attributes: {}
    };

    const cleanCommand = command.startsWith('@') ? command.substring(1) : command.substring(1);
    result.attributes['data-format'] = cleanCommand;

    if (command.startsWith('$')) {
        if (cleanCommand === 'code') {
            result.classes.push('format-code');
        }
        return result;
    }

    const parts = cleanCommand.split('.');
    parts.forEach(part => {
        const lowerPart = part.toLowerCase();
        if (colorClassMap[lowerPart]) {
            result.classes.push(colorClassMap[lowerPart]);
        } else if (part.startsWith('#') || part.startsWith('rgb') || part.startsWith('hsl')) {
            if (isValidColor(part)) {
                result.styles.color = part;
            }
        } else if (isValidColor(part)) {
            result.styles.color = part;
        } else {
            switch (lowerPart) {
                case 'head':
                    result.classes.push('inline-head');
                    break;
                case 'subhead':
                    result.classes.push('inline-subhead');
                    break;
                case 'bold':
                    result.classes.push('format-bold');
                    break;
                case 'italic':
                    result.classes.push('format-italic');
                    break;
                case 'center':
                    result.classes.push('format-center');
                    break;
                case 'align':
                case 'color':
                    break;
            }
        }
    });
    return result;
}

// === FIXED: Reverse typing bug – preserve selection order and cursor ===
function applyInlineFormatting(command) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const savedRange = range.cloneRange();
    const isCollapsed = range.collapsed;

    const formatInfo = parseInlineCommand(command);
    const formatElement = document.createElement(formatInfo.elementType);
    formatElement.className = formatInfo.classes.join(' ');
    Object.keys(formatInfo.styles).forEach(styleKey => {
        formatElement.style[styleKey] = formatInfo.styles[styleKey];
    });
    if (formatInfo.attributes) {
        Object.keys(formatInfo.attributes).forEach(attr => {
            formatElement.setAttribute(attr, formatInfo.attributes[attr]);
        });
    }

    const zwsp = document.createTextNode('\u200B');
    formatElement.appendChild(zwsp);

    if (!isCollapsed) {
        const selectedContent = range.extractContents();
        formatElement.appendChild(selectedContent);
        range.insertNode(formatElement);
    } else {
        range.insertNode(formatElement);
    }

    const newRange = document.createRange();
    if (!isCollapsed) {
        newRange.setStartAfter(formatElement);
        newRange.collapse(true);
    } else {
        newRange.setStart(zwsp, 1);
        newRange.collapse(true);
    }
    selection.removeAllRanges();
    selection.addRange(newRange);

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

// === MODIFIED: Colon required for inline command detection ===
function detectInlineCommand(event) {
    // === NEW: Colon is mandatory – if no colon in text before cursor, exit ===
    const selection = window.getSelection();
    if (selection.rangeCount) {
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        if (node.nodeType === 3) {
            const textBeforeCursor = node.textContent.substring(0, range.startOffset);
            if (!textBeforeCursor.includes(':')) return false;
        }
    }

    if (isProcessingInlineCommand) return false;

    const sel = window.getSelection();
    if (!sel.rangeCount) return false;

    const range = sel.getRangeAt(0);
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
        sel.removeAllRanges();
        sel.addRange(range);

        const formatElement = applyInlineFormatting(fullCommand);
        showFormattingIndicator(`Formatting: ${fullCommand}`);

        setTimeout(() => {
            isProcessingInlineCommand = false;
        }, 10);

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

function handleInlineCommandKey(event) {
    if (event.key === ' ') {
        setTimeout(() => {
            detectInlineCommand(event);
        }, 10);
    }
    if (event.key === 'Enter') {
        if (activeFormattingSpan) {
            cleanupZeroWidthSpace(activeFormattingSpan);
            activeFormattingSpan = null;
        }
    }
    if (event.key === 'Escape') {
        if (activeFormattingSpan) {
            cleanupZeroWidthSpace(activeFormattingSpan);
            activeFormattingSpan = null;
            showFormattingIndicator('Formatting ended');
        }
    }
}

// --- GLOBAL CURSOR-RANGE MANAGEMENT ---
let savedCursorRange = null;

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

function clearSavedCursorRange() {
    savedCursorRange = null;
}

function isValidColorOld(colorName) {
    const testElement = document.createElement('div');
    testElement.style.color = colorName;
    const testElement2 = document.createElement('div');
    testElement2.style.color = '#' + colorName;
    if (colorName.startsWith('#') || /^[0-9A-Fa-f]{3,6}$/.test(colorName)) {
        const hexColor = colorName.startsWith('#') ? colorName : '#' + colorName;
        testElement.style.color = hexColor;
    }
    return testElement.style.color !== '' || testElement2.style.color !== '';
}

function normalizeColor(colorName) {
    if (colorName.startsWith('#') || /^[0-9A-Fa-f]{3,6}$/.test(colorName)) {
        const hex = colorName.replace('#', '');
        if (hex.length === 3) {
            return '#' + hex.split('').map(c => c + c).join('');
        } else if (hex.length === 6) {
            return '#' + hex.toLowerCase();
        }
    }
    const colorLower = colorName.toLowerCase();
    const colorMap = {
        'red': '#ff0000',
        'blue': '#0000ff',
        'green': '#008000',
        'yellow': '#ffff00',
        'purple': '#800080',
        'pink': '#ffc0cb',
        'orange': '#ffa500',
        'gray': '#808080',
        'black': '#000000',
        'white': '#ffffff',
        'cyan': '#00ffff',
        'magenta': '#ff00ff',
        'brown': '#a52a2a',
        'gold': '#ffd700',
        'silver': '#c0c0c0',
        'violet': '#ee82ee',
        'indigo': '#4b0082',
        'teal': '#008080',
        'maroon': '#800000',
        'navy': '#000080',
        'olive': '#808000',
        'lime': '#00ff00',
        'aqua': '#00ffff',
        'fuchsia': '#ff00ff',
        'coral': '#ff7f50',
        'tomato': '#ff6347',
        'orangered': '#ff4500',
        'deeppink': '#ff1493',
        'mediumvioletred': '#c71585',
        'darkviolet': '#9400d3',
        'darkorchid': '#9932cc',
        'darkmagenta': '#8b008b',
        'darkred': '#8b0000',
        'darkgreen': '#006400',
        'darkblue': '#00008b',
        'darkcyan': '#008b8b',
        'darkgoldenrod': '#b8860b',
        'darkgray': '#a9a9a9',
        'darkslategray': '#2f4f4f',
        'lightslategray': '#778899',
        'lightgray': '#d3d3d3',
        'whitesmoke': '#f5f5f5',
        'snow': '#fffafa',
        'ivory': '#fffff0',
        'honeydew': '#f0fff0',
        'mintcream': '#f5fffa',
        'azure': '#f0ffff',
        'aliceblue': '#f0f8ff',
        'ghostwhite': '#f8f8ff',
        'lavender': '#e6e6fa',
        'lavenderblush': '#fff0f5',
        'mistyrose': '#ffe4e1',
        'seashell': '#fff5ee',
        'oldlace': '#fdf5e6',
        'linen': '#faf0e6',
        'beige': '#f5f5dc',
        'floralwhite': '#fffaf0',
        'cornsilk': '#fff8dc',
        'lemonchiffon': '#fffacd',
        'lightyellow': '#ffffe0',
        'lightgoldenrodyellow': '#fafad2',
        'papayawhip': '#ffefd5',
        'peachpuff': '#ffdab9',
        'bisque': '#ffe4c4',
        'antiquewhite': '#faebd7',
        'blanchedalmond': '#ffebcd',
        'wheat': '#f5deb3',
        'navajowhite': '#ffdead',
        'tan': '#d2b48c',
        'burlywood': '#deb887',
        'sandybrown': '#f4a460',
        'peru': '#cd853f',
        'chocolate': '#d2691e',
        'saddlebrown': '#8b4513',
        'sienna': '#a0522d',
        'rosybrown': '#bc8f8f',
        'firebrick': '#b22222',
        'indianred': '#cd5c5c',
        'salmon': '#fa8072',
        'lightsalmon': '#ffa07a',
        'darksalmon': '#e9967a',
        'lightcoral': '#f08080',
        'palevioletred': '#db7093',
        'hotpink': '#ff69b4',
        'lightpink': '#ffb6c1',
        'plum': '#dda0dd',
        'thistle': '#d8bfd8',
        'orchid': '#da70d6',
        'mediumorchid': '#ba55d3',
        'mediumpurple': '#9370db',
        'slateblue': '#6a5acd',
        'mediumslateblue': '#7b68ee',
        'darkslateblue': '#483d8b',
        'midnightblue': '#191970',
        'royalblue': '#4169e1',
        'steelblue': '#4682b4',
        'dodgerblue': '#1e90ff',
        'deepskyblue': '#00bfff',
        'skyblue': '#87ceeb',
        'lightskyblue': '#87cefa',
        'lightblue': '#add8e6',
        'powderblue': '#b0e0e6',
        'paleturquoise': '#afeeee',
        'lightcyan': '#e0ffff',
        'cadetblue': '#5f9ea0',
        'darkturquoise': '#00ced1',
        'mediumturquoise': '#48d1cc',
        'turquoise': '#40e0d0',
        'aquamarine': '#7fffd4',
        'seagreen': '#2e8b57',
        'mediumseagreen': '#3cb371',
        'springgreen': '#00ff7f',
        'lawngreen': '#7cfc00',
        'chartreuse': '#7fff00',
        'greenyellow': '#adff2f',
        'palegreen': '#98fb98',
        'lightgreen': '#90ee90',
        'mediumspringgreen': '#00fa9a',
        'darkseagreen': '#8fbc8f',
        'forestgreen': '#228b22',
        'olivedrab': '#6b8e23',
        'darkolivegreen': '#556b2f',
        'yellowgreen': '#9acd32',
        'khaki': '#f0e68c',
        'darkkhaki': '#bdb76b',
        'rebeccapurple': '#663399',
        'cornflowerblue': '#6495ed',
        'mediumaquamarine': '#66cdaa',
        'darkslategrey': '#2f4f4f',
        'dimgrey': '#696969',
        'grey': '#808080',
        'lightgrey': '#d3d3d3',
        'lightslategrey': '#778899',
        'slategrey': '#708090',
        'darkslategrey': '#2f4f4f'
    };
    return colorMap[colorLower] || colorName;
}

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function showFormattingIndicator(message, type = 'info') {
    formattingIndicator.textContent = message;
    formattingIndicator.className = 'formatting-indicator';
    formattingIndicator.classList.add('show');
    if (type === 'success') {
        formattingIndicator.classList.add('success');
    } else if (type === 'error') {
        formattingIndicator.classList.add('error');
    }
    setTimeout(() => {
        formattingIndicator.classList.remove('show');
        formattingIndicator.classList.remove('success', 'error');
    }, 3000);
}

// --- STORAGE FUNCTIONS ---
function saveToStorage() {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
    localStorage.setItem(ACTIVE_NOTE_KEY, activeNoteId);
    localStorage.setItem(ACTIVE_FOLDER_KEY, activeFolderId);
    localStorage.setItem(LAST_NOTE_PER_FOLDER_KEY, JSON.stringify(lastNotePerFolder));
}

function loadFromStorage() {
    const savedNotes = localStorage.getItem(NOTES_KEY);
    const savedFolders = localStorage.getItem(FOLDERS_KEY);
    const savedActiveNote = localStorage.getItem(ACTIVE_NOTE_KEY);
    const savedActiveFolder = localStorage.getItem(ACTIVE_FOLDER_KEY);
    const savedLastNotePerFolder = localStorage.getItem(LAST_NOTE_PER_FOLDER_KEY);

    if (savedNotes) notes = JSON.parse(savedNotes);
    if (savedFolders) folders = JSON.parse(savedFolders);
    if (savedActiveNote) activeNoteId = savedActiveNote;
    if (savedActiveFolder) activeFolderId = savedActiveFolder;
    if (savedLastNotePerFolder) lastNotePerFolder = JSON.parse(savedLastNotePerFolder);

    if (folders.length === 0) {
        folders.push({ id: 'default', name: 'Default', isDefault: true });
    }

    if (notes.length === 0) {
        const firstNote = {
            id: generateId(),
            name: 'Welcome to FocusPad',
            folderId: 'default',
            content: 'Welcome to FocusPad! 🎨<br><br>Try these <strong>colon-based shortcuts</strong>:<br><br>Type <code>@head:My Title</code> then Enter – creates a heading<br>Type <code>@color.red:Red text</code> then Enter – red text<br>Type <code>@bold:Bold text</code> then Enter – bold<br>Type <code>@align.center:Centered</code> then Enter – centered<br><br>All formatting now requires a colon (:) and works perfectly!',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isPinned: false
        };
        notes.push(firstNote);
        activeNoteId = firstNote.id;
    }
}

// --- ESC KEY HIERARCHY MANAGEMENT ---
function pushToModalStack(modal) {
    modalStack.push(modal);
}

function popFromModalStack() {
    return modalStack.pop();
}

function closeTopModal() {
    if (modalStack.length > 0) {
        const modal = modalStack[modalStack.length - 1];
        modal.classList.remove('show');
        modalStack.pop();
        return true;
    }
    return false;
}

// --- PIN BUTTON FUNCTIONALITY ---
function updatePinButton() {
    if (!activeNoteId) {
        pinBtn.classList.remove('pinned');
        pinBtn.innerHTML = '<i class="ph ph-push-pin"></i>';
        return;
    }
    const note = notes.find(n => n.id === activeNoteId);
    if (note && note.isPinned) {
        pinBtn.classList.add('pinned');
        pinBtn.innerHTML = '<i class="ph ph-push-pin-slash"></i>';
    } else {
        pinBtn.classList.remove('pinned');
        pinBtn.innerHTML = '<i class="ph ph-push-pin"></i>';
    }
}

function togglePinNote() {
    if (!activeNoteId) {
        showFormattingIndicator('No active note to pin');
        return;
    }
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        note.isPinned = !note.isPinned;
        saveToStorage();
        updatePinButton();
        showFormattingIndicator(note.isPinned ? 'Note pinned' : 'Note unpinned');
    }
}

pinBtn.addEventListener('click', togglePinNote);

// --- PASTE SANITIZATION ---
writingCanvas.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const htmlContent = e.clipboardData.getData('text/html');
    if (htmlContent) {
        const temp = document.createElement('div');
        temp.innerHTML = htmlContent;
        function sanitize(node) {
            if (node.hasAttribute && node.hasAttribute('style')) node.removeAttribute('style');
            if (node.hasAttribute && node.hasAttribute('class')) node.removeAttribute('class');
            if (node.hasAttribute && node.hasAttribute('width')) node.removeAttribute('width');
            if (node.hasAttribute && node.hasAttribute('height')) node.removeAttribute('height');
            const children = Array.from(node.children);
            children.forEach(child => sanitize(child));
        }
        sanitize(temp);
        try {
            document.execCommand('insertHTML', false, temp.innerHTML);
        } catch (err) {
            document.execCommand('insertText', false, text);
        }
    } else {
        document.execCommand('insertText', false, text);
    }
});

// --- NOTE FUNCTIONS ---
function createNote(name, folderId) {
    const note = {
        id: generateId(),
        name: name,
        folderId: folderId,
        content: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPinned: false
    };
    notes.push(note);
    activeNoteId = note.id;
    saveToStorage();
    renderNoteChips();
    loadActiveNote();
    showFormattingIndicator('Note created!');
}

function deleteNote(noteId) {
    const index = notes.findIndex(n => n.id === noteId);
    if (index > -1) {
        notes.splice(index, 1);
        const folderNotes = getNotesInFolder(activeFolderId);
        if (folderNotes.length === 0) {
            activeNoteId = null;
            showFormattingIndicator('Note deleted! No notes in this folder.');
        } else if (activeNoteId === noteId) {
            activeNoteId = folderNotes[0].id;
            showFormattingIndicator('Note deleted! Switched to next note.');
        } else {
            showFormattingIndicator('Note deleted!');
        }
        saveToStorage();
        renderNoteChips();
        loadActiveNote();
    }
}

function switchNote(noteId) {
    saveCurrentNote();
    activeNoteId = noteId;
    saveToStorage();
    loadActiveNote();
    renderNoteChips();
}

function loadActiveNote() {
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        writingCanvas.innerHTML = note.content || '';
        writingCanvas.contentEditable = 'true';
        writingCanvas.classList.remove('empty-folder-message');
        updatePinButton();
        const folderNotes = getNotesInFolder(activeFolderId);
        if (folderNotes.length > 0) {
            deleteBtn.classList.remove('disabled');
        }
    } else {
        const folderNotes = getNotesInFolder(activeFolderId);
        if (folderNotes.length === 0) {
            writingCanvas.innerHTML = `
                <div class="empty-folder-message">
                    <div class="empty-folder-icon">
                        <i class="ph ph-note-blank"></i>
                    </div>
                    <h3>No Notes in This Folder</h3>
                    <p>This folder is empty. Create a new note to get started!</p>
                    <button class="create-note-btn abc" id="createNoteFromEmpty">Create New Note</button>
                </div>
            `;
            writingCanvas.contentEditable = 'false';
            writingCanvas.classList.add('empty-folder-message');
            deleteBtn.classList.add('disabled');
            updatePinButton();
            setTimeout(() => {
                const createBtn = document.getElementById('createNoteFromEmpty');
                if (createBtn) {
                    createBtn.addEventListener('click', () => {
                        updateFolderDropdown();
                        document.getElementById('newNoteName').value = '';
                        newNoteModal.classList.add('show');
                        pushToModalStack(newNoteModal);
                        setTimeout(() => document.getElementById('newNoteName').focus(), 100);
                    });
                }
            }, 100);
        } else {
            activeNoteId = folderNotes[0].id;
            saveToStorage();
            loadActiveNote();
        }
    }
}

function saveCurrentNote() {
    if (!activeNoteId) return;
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        note.content = writingCanvas.innerHTML;
        note.updatedAt = Date.now();
        saveToStorage();
    }
}

function getNotesInFolder(folderId) {
    return notes.filter(n => n.folderId === folderId);
}

// --- FOLDER FUNCTIONS ---
function createFolder(name) {
    const folder = {
        id: generateId(),
        name: name,
        isDefault: false
    };
    folders.push(folder);
    saveToStorage();
    renderFolderList();
    updateFolderDropdown();
    showFormattingIndicator('Folder created!');
}

function deleteFolder(folderId) {
    if (folderId === 'default') {
        showFormattingIndicator('Cannot delete default folder!');
        return;
    }
    const folder = folders.find(f => f.id === folderId);
    const folderNotes = notes.filter(n => n.folderId === folderId);
    const modal = document.getElementById('confirmFolderDeleteModal');
    const titleEl = document.getElementById('folderDeleteTitle');
    const messageEl = document.getElementById('folderDeleteMessage');
    titleEl.textContent = `Delete "${folder.name}"?`;
    if (folderNotes.length > 0) {
        messageEl.textContent = `${folderNotes.length} note(s) will be moved to Default folder.`;
    } else {
        messageEl.textContent = 'This folder will be deleted.';
    }
    modal.classList.add('show');
    pushToModalStack(modal);
    modal.dataset.pendingFolderId = folderId;
}

function setActiveFolder(folderId) {
    if (activeNoteId) {
        saveCurrentNote();
        lastNotePerFolder[activeFolderId] = activeNoteId;
    }
    activeFolderId = folderId;
    const folderNotes = getNotesInFolder(folderId);
    if (folderNotes.length > 0) {
        const lastNoteId = lastNotePerFolder[folderId];
        const lastNote = folderNotes.find(n => n.id === lastNoteId);
        if (lastNote) {
            activeNoteId = lastNote.id;
        } else {
            activeNoteId = folderNotes[0].id;
        }
    } else {
        activeNoteId = null;
    }
    saveToStorage();
    renderNoteChips();
    renderFolderList();
    loadActiveNote();
}

// --- RENDER FUNCTIONS ---
function renderNoteChips() {
    noteChips.innerHTML = '';
    const folderNotes = getNotesInFolder(activeFolderId);

    if (folderNotes.length === 0) {
        const emptyChip = document.createElement('div');
        emptyChip.className = 'chip empty-chip';
        emptyChip.textContent = 'No notes';
        noteChips.appendChild(emptyChip);
        return;
    }

    folderNotes.forEach(note => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        if (note.id === activeNoteId) chip.classList.add('active');
        if (note.isPinned) chip.classList.add('pinned-chip');
        chip.dataset.noteId = note.id;

        // === NEW: Move button (absolute positioned) ===
        const moveBtn = document.createElement('div');
        moveBtn.className = 'move-chip-btn';
        moveBtn.innerHTML = '<i class="ph ph-folder-arrow-up"></i>';
        moveBtn.title = 'Move to folder';
        moveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openMoveModal(note.id);
        });
        chip.appendChild(moveBtn);
        // === END NEW ===

        const chipContent = document.createElement('div');
        chipContent.className = 'chip-content';
        if (note.isPinned) {
            const pinIcon = document.createElement('i');
            pinIcon.className = 'ph ph-push-pin gap';
            chipContent.appendChild(pinIcon);
        }
        const textSpan = document.createElement('span');
        textSpan.textContent = note.name;
        chipContent.appendChild(textSpan);
        chip.appendChild(chipContent);
        chip.onclick = () => switchNote(note.id);
        noteChips.appendChild(chip);
    });
}

function renderFolderList() {
    const folderList = document.getElementById('folderList');
    if (!folderList) return;
    folderList.innerHTML = '';
    folders.forEach(folder => {
        const item = document.createElement('div');
        item.className = 'folder-item';
        if (folder.id === activeFolderId) item.classList.add('active');
        const nameDiv = document.createElement('div');
        nameDiv.className = 'folder-name';
        nameDiv.textContent = folder.name;
        nameDiv.onclick = () => {
            setActiveFolder(folder.id);
            manageFoldersModal.classList.remove('show');
            const index = modalStack.indexOf(manageFoldersModal);
            if (index > -1) modalStack.splice(index, 1);
        };
        const actions = document.createElement('div');
        actions.className = 'folder-actions';
        if (!folder.isDefault) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'folder-action-btn';
            deleteBtn.innerHTML = '<i class="ph ph-trash"></i>';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteFolder(folder.id);
            };
            actions.appendChild(deleteBtn);
        }
        item.appendChild(nameDiv);
        item.appendChild(actions);
        folderList.appendChild(item);
    });
}

function updateFolderDropdown() {
    const optionsContainer = document.getElementById('folderSelectOptions');
    const trigger = document.getElementById('folderSelectTrigger');
    const selectedNameSpan = document.getElementById('selectedFolderName');
    const wrapper = document.getElementById('folderSelectWrapper');
    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';
    let selectedFolderId = activeFolderId;
    folders.forEach(folder => {
        const option = document.createElement('div');
        option.className = 'select-option';
        option.textContent = folder.name;
        option.dataset.folderId = folder.id;
        if (folder.id === selectedFolderId) {
            option.classList.add('selected');
            selectedNameSpan.textContent = folder.name;
        }
        option.addEventListener('click', () => {
            selectedFolderId = folder.id;
            selectedNameSpan.textContent = folder.name;
            optionsContainer.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            wrapper.classList.remove('active');
        });
        optionsContainer.appendChild(option);
    });
    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);
    newTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        wrapper.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) wrapper.classList.remove('active');
    });
}

function getSelectedFolderId() {
    const selectedOption = document.querySelector('.select-option.selected');
    return selectedOption ? selectedOption.dataset.folderId : activeFolderId;
}

// --- THEME FUNCTIONS ---
function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    html.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'light') {
        themeIcon.classList.remove('ph-moon');
        themeIcon.classList.add('ph-sun');
    } else {
        themeIcon.classList.remove('ph-sun');
        themeIcon.classList.add('ph-moon');
    }
    applyThemeCompatibility(savedTheme);
}

function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

function applyThemeCompatibility(theme) {
    const walker = document.createTreeWalker(
        writingCanvas,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        if (node.textContent.trim()) textNodes.push(node);
    }
    const allElements = writingCanvas.querySelectorAll('*');
    allElements.forEach(el => {
        const computedStyle = window.getComputedStyle(el);
        const color = computedStyle.color;
        const bgColor = computedStyle.backgroundColor;
        if (!color) return;
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!rgbMatch) return;
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (theme === 'light' && luminance > 0.7) {
            el.style.color = `rgb(${Math.max(0, r - 100)}, ${Math.max(0, g - 100)}, ${Math.max(0, b - 100)})`;
            el.dataset.themeAdjusted = 'true';
        } else if (theme === 'dark' && luminance < 0.3) {
            el.style.color = `rgb(${Math.min(255, r + 100)}, ${Math.min(255, g + 100)}, ${Math.min(255, b + 100)})`;
            el.dataset.themeAdjusted = 'true';
        }
    });
    const colorClasses = ['text-red', 'text-blue', 'text-green', 'text-yellow',
        'text-purple', 'text-pink', 'text-orange', 'text-gray'];
    colorClasses.forEach(className => {
        const elements = writingCanvas.querySelectorAll(`.${className}`);
        elements.forEach(el => {
            if (theme === 'light') {
                if (className === 'text-white') {
                    el.style.color = '#101828';
                    el.classList.remove('text-white');
                    el.classList.add('text-color-aware');
                }
            } else if (theme === 'dark') {
                if (className === 'text-black') {
                    el.style.color = '#ffffff';
                    el.classList.remove('text-black');
                    el.classList.add('text-color-aware');
                }
            }
        });
    });
    saveCurrentNote();
}

themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        html.setAttribute('data-theme', 'light');
        themeIcon.classList.remove('ph-moon');
        themeIcon.classList.add('ph-sun');
        saveTheme('light');
        applyThemeCompatibility('light');
    } else {
        html.setAttribute('data-theme', 'dark');
        themeIcon.classList.remove('ph-sun');
        themeIcon.classList.add('ph-moon');
        saveTheme('dark');
        applyThemeCompatibility('dark');
    }
});

// --- FOCUS MODE ---
function toggleFocus() {
    const isHidden = sidebar.classList.contains('hidden');
    if (!isHidden) {
        sidebar.classList.add('hidden');
        topBar.classList.add('hidden');
        workspace.classList.add('focus-mode');
        restoreBtn.classList.add('visible');
        if (html.requestFullscreen) html.requestFullscreen();
    } else {
        sidebar.classList.remove('hidden');
        topBar.classList.remove('hidden');
        workspace.classList.remove('focus-mode');
        restoreBtn.classList.remove('visible');
        if (document.fullscreenElement) document.exitFullscreen();
    }
}
focusBtn.addEventListener('click', toggleFocus);
restoreBtn.addEventListener('click', toggleFocus);
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && sidebar.classList.contains('hidden')) {
        toggleFocus();
    }
});

// --- FONT SELECTOR ---
fontSelectorBtn.addEventListener('mousedown', (e) => {
    saveCursorRange();
});
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
        const selectedFont = option.getAttribute('data-font');
        fontOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        currentFontSpan.style.opacity = '0.5';
        setTimeout(() => {
            currentFontSpan.textContent = selectedFont;
            currentFontSpan.style.opacity = '1';
        }, 150);
        applyFontAtCursor(selectedFont);
        setTimeout(() => {
            fontSelectorBtn.classList.remove('active');
            fontDropdown.classList.remove('active');
            clearSavedCursorRange();
        }, 300);
    });
});

function getCurrentFont() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return 'Fredoka';
    const range = selection.getRangeAt(0);
    let node = range.startContainer;
    if (node.nodeType === 3) node = node.parentElement;
    while (node && node !== writingCanvas) {
        const computedFont = window.getComputedStyle(node).fontFamily;
        for (const [fontName, fontFamily] of Object.entries(formattingConfig.fonts)) {
            if (computedFont.includes(fontName.replace(/\s+/g, ''))) return fontName;
        }
        node = node.parentElement;
    }
    return 'Fredoka';
}

function updateFontDisplay() {
    const currentFont = getCurrentFont();
    currentFontSpan.textContent = currentFont;
    fontOptions.forEach(opt => {
        const fontName = opt.getAttribute('data-font');
        if (fontName === currentFont) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
}

function applyFontAtCursor(fontName, useShortcutMode = false) {
    const fontFamily = formattingConfig.fonts[fontName] || "'Fredoka', sans-serif";
    if (savedCursorRange) {
        restoreCursorRange();
    } else {
        writingCanvas.focus();
    }
    let selection = window.getSelection();
    if (!selection.rangeCount) {
        writingCanvas.focus();
        return;
    }
    const range = selection.getRangeAt(0);
    if (!range.collapsed) {
        try {
            const span = document.createElement('span');
            span.style.fontFamily = fontFamily;
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
            const newRange = document.createRange();
            newRange.setStartAfter(span);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            writingCanvas.focus();
            showFormattingIndicator(`Font: ${fontName} (selection)`);
            clearSavedCursorRange();
            saveCurrentNote();
            return;
        } catch (e) {
            console.error('Font selection error:', e);
        }
    }
    const fontSpan = document.createElement('span');
    fontSpan.style.fontFamily = fontFamily;
    fontSpan.classList.add('cursor-font-marker');
    const anchorText = document.createTextNode('\u200B');
    fontSpan.appendChild(anchorText);
    range.insertNode(fontSpan);
    const newRange = document.createRange();
    newRange.setStartAfter(anchorText);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    writingCanvas.focus();
    showFormattingIndicator(`Font: ${fontName} (from cursor)`);
    setTimeout(() => updateFontDisplay(), 50);
    const inputHandler = (e) => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const currentRange = sel.getRangeAt(0);
        let node = currentRange.startContainer;
        let parent = node.nodeType === 3 ? node.parentElement : node;
        if (parent && parent.classList && parent.classList.contains('cursor-font-marker')) {
            const content = parent.textContent;
            if (content.length > 1 || (content.length === 1 && content !== '\u200B')) {
                parent.textContent = content.replace(/\u200B/g, '');
                parent.classList.remove('cursor-font-marker');
                const restoreRange = document.createRange();
                const textNode = parent.firstChild;
                if (textNode && textNode.nodeType === 3) {
                    restoreRange.setStart(textNode, textNode.length);
                    restoreRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(restoreRange);
                }
                writingCanvas.removeEventListener('input', inputHandler);
            }
        } else {
            writingCanvas.removeEventListener('input', inputHandler);
        }
    };
    writingCanvas.addEventListener('input', inputHandler);
    clearSavedCursorRange();
    saveCurrentNote();
}

// --- DROPDOWN MANAGEMENT ---
let activeDropdown = null;
function closeAllDropdowns() {
    bulletsMenu.classList.remove('active');
    activeDropdown = null;
    clearSavedCursorRange();
}
document.addEventListener('click', (e) => {
    if (!bulletsBtn.contains(e.target) && !bulletsMenu.contains(e.target)) {
        closeAllDropdowns();
    }
});

// --- BULLETS BUTTON ---
bulletsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeDropdown === 'bullets') {
        closeAllDropdowns();
    } else {
        closeAllDropdowns();
        bulletsMenu.classList.add('active');
        activeDropdown = 'bullets';
        const rect = bulletsBtn.getBoundingClientRect();
        bulletsMenu.style.top = `${rect.top}px`;
    }
});
document.querySelectorAll('#bulletsMenu .dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
        const type = item.getAttribute('data-type');
        insertBulletList(type);
        closeAllDropdowns();
    });
});

function insertBulletList(type) {
    if (!activeNoteId) {
        showFormattingIndicator('Please create a note first');
        return;
    }
    writingCanvas.focus();
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        showFormattingIndicator('Please click in the editor first');
        return;
    }
    const range = selection.getRangeAt(0);
    const isCollapsed = range.collapsed;
    const listItem = document.createElement('div');
    listItem.style.marginLeft = '40px';
    listItem.style.padding = '2px 0';
    listItem.style.position = 'relative';
    listItem.classList.add('pdf-list-item');
    if (type === 'numbered') {
        let currentNode = range.startContainer;
        let textBefore = '';
        if (currentNode.nodeType === 3) {
            textBefore = currentNode.textContent.substring(0, range.startOffset);
        }
        const numberMatch = textBefore.match(/(\d+)\.\s*[^\d]*$/);
        let nextNumber = 1;
        if (numberMatch) nextNumber = parseInt(numberMatch[1]) + 1;
        listItem.textContent = `${nextNumber}. `;
        listItem.classList.add('numbered');
    } else {
        listItem.textContent = '• ';
        listItem.classList.add('bullet');
    }
    if (!isCollapsed) {
        const selectedText = range.toString();
        listItem.textContent += selectedText;
        range.deleteContents();
        range.insertNode(listItem);
    } else {
        range.insertNode(listItem);
    }
    range.setStart(listItem, listItem.textContent.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    showFormattingIndicator(`${type === 'numbered' ? 'Numbered' : 'Bullet'} list inserted`);
    saveCurrentNote();
}

function insertHorizontalLine(type) {
    if (!activeNoteId) {
        showFormattingIndicator('Please create a note first');
        return;
    }
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const hr = document.createElement('div');
    hr.className = 'horizontal-line';
    if (type === 'thick') hr.classList.add('thick');
    else if (type === 'dashed') hr.classList.add('dashed');
    range.insertNode(hr);
    const br = document.createElement('br');
    range.insertNode(br);
    range.setStartAfter(br);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    showFormattingIndicator(`Horizontal line inserted`);
    saveCurrentNote();
}

// --- EXPORT MODAL ---
exportBtn.addEventListener('click', () => {
    if (!activeNoteId) {
        showFormattingIndicator('No note to export. Create a note first.');
        return;
    }
    const note = notes.find(n => n.id === activeNoteId);
    if (note) exportFileNameInput.value = note.name.replace(/[^\w\s]/gi, '');
    exportCards.forEach(card => card.classList.remove('selected'));
    selectedExportFormat = null;
    exportConfirmBtn.disabled = true;
    const currentTheme = html.getAttribute('data-theme');
    themeTogglePill.dataset.theme = currentTheme;
    themePillOptions.forEach(option => {
        option.classList.remove('active');
        if (option.dataset.theme === currentTheme) option.classList.add('active');
    });
    exportModal.classList.add('show');
    pushToModalStack(exportModal);
});
closeExportModalBtn.addEventListener('click', () => {
    exportModal.classList.remove('show');
    const index = modalStack.indexOf(exportModal);
    if (index > -1) modalStack.splice(index, 1);
});
exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) {
        exportModal.classList.remove('show');
        const index = modalStack.indexOf(exportModal);
        if (index > -1) modalStack.splice(index, 1);
    }
});
exportCards.forEach(card => {
    card.addEventListener('click', () => {
        exportCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedExportFormat = card.dataset.format;
        exportConfirmBtn.disabled = false;
    });
});
themePillOptions.forEach(option => {
    option.addEventListener('click', () => {
        const selectedTheme = option.dataset.theme;
        themeTogglePill.dataset.theme = selectedTheme;
        themePillOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
    });
});
exportConfirmBtn.addEventListener('click', async () => {
    const fileName = exportFileNameInput.value.trim() || 'note';
    if (!selectedExportFormat) {
        showFormattingIndicator('Please select an export format');
        return;
    }
    exportModal.classList.remove('show');
    const index = modalStack.indexOf(exportModal);
    if (index > -1) modalStack.splice(index, 1);
    showFormattingIndicator(`Exporting as ${selectedExportFormat.toUpperCase()}...`, 'info');
    switch (selectedExportFormat) {
        case 'pdf':
            await exportAsPDF(fileName);
            break;
        case 'markdown':
            exportAsMarkdown(fileName);
            break;
        case 'text':
            exportAsText(fileName);
            break;
    }
});

async function exportAsPDF(fileName) {
    try {
        const note = notes.find(n => n.id === activeNoteId);
        const content = writingCanvas.innerHTML;
        const selectedTheme = themeTogglePill.dataset.theme || 'dark';
        const currentFont = getCurrentFont();

        const tempContainer = document.createElement('div');
        tempContainer.id = 'pdf-export-container';
        tempContainer.setAttribute('data-theme', selectedTheme);
        tempContainer.setAttribute('data-font', currentFont);
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '794px';
        tempContainer.style.minHeight = '1123px';
        tempContainer.style.padding = '60px 80px';
        tempContainer.style.fontFamily = formattingConfig.fonts[currentFont] || "'Fredoka', sans-serif";
        tempContainer.style.lineHeight = '1.6';
        tempContainer.style.fontSize = '16px';
        tempContainer.style.wordBreak = 'break-word';
        tempContainer.style.boxSizing = 'border-box';
        if (selectedTheme === 'dark') {
            tempContainer.style.backgroundColor = '#1a1a1a';
            tempContainer.style.color = '#ffffff';
        } else {
            tempContainer.style.backgroundColor = '#ffffff';
            tempContainer.style.color = '#000000';
        }

        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = content;
        fixListsForPDF(contentDiv);
        preserveFormattingForPDF(contentDiv, selectedTheme);
        tempContainer.appendChild(contentDiv);
        document.body.appendChild(tempContainer);

        const canvas = await html2canvas(tempContainer, {
            scale: 4,
            useCORS: true,
            backgroundColor: selectedTheme === 'dark' ? '#1a1a1a' : '#ffffff',
            logging: false,
            allowTaint: true,
            letterRendering: true,
            onclone: function (clonedDoc) {
                const clonedContainer = clonedDoc.getElementById('pdf-export-container');
                if (clonedContainer) {
                    applyPDFStylesToClone(clonedContainer, selectedTheme, currentFont);
                }
            }
        });

        document.body.removeChild(tempContainer);

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        pdf.save(`${fileName}.pdf`);

        showFormattingIndicator('PDF exported successfully!', 'success');
    } catch (error) {
        console.error('PDF export error:', error);
        showFormattingIndicator('Error exporting PDF', 'error');
    }
}

function fixListsForPDF(container) {
    const divs = container.querySelectorAll('div');
    const listItems = [];
    divs.forEach(div => {
        const text = div.textContent || '';
        const style = div.getAttribute('style') || '';
        if (style.includes('margin-left') || text.match(/^[•\d]/)) {
            listItems.push(div);
        }
    });
    listItems.forEach(item => {
        const text = item.textContent || '';
        item.classList.add('pdf-list-item');
        if (text.match(/^\d/)) item.classList.add('numbered');
        else if (text.includes('•')) item.classList.add('bullet');
        item.style.marginLeft = '40px';
        item.style.padding = '2px 0';
        item.style.position = 'relative';
        item.style.display = 'block';
    });
}

function preserveFormattingForPDF(container, theme) {
    const colorElements = container.querySelectorAll('[class*="text-"]');
    colorElements.forEach(el => {
        const classes = Array.from(el.classList);
        classes.forEach(cls => {
            if (cls.startsWith('text-')) {
                const computedColor = window.getComputedStyle(el).color;
                el.style.color = computedColor;
            }
        });
    });
    const alignElements = container.querySelectorAll('[class*="text-"]');
    alignElements.forEach(el => {
        if (el.classList.contains('text-center') || el.classList.contains('format-center')) {
            el.style.textAlign = 'center';
            el.style.display = 'block';
            el.style.width = '100%';
        } else if (el.classList.contains('text-left')) {
            el.style.textAlign = 'left';
        } else if (el.classList.contains('text-right')) {
            el.style.textAlign = 'right';
        }
    });
    const headings = container.querySelectorAll('.heading-main, .heading-sub, .inline-head, .inline-subhead');
    headings.forEach(heading => {
        if (heading.classList.contains('heading-main') || heading.classList.contains('inline-head')) {
            heading.style.fontSize = '32px';
            heading.style.fontWeight = '700';
            heading.style.margin = '30px 0 15px 0';
            heading.style.display = 'block';
            heading.style.lineHeight = '1.3';
        } else {
            heading.style.fontSize = '24px';
            heading.style.fontWeight = '600';
            heading.style.margin = '25px 0 12px 0';
            heading.style.display = 'block';
            heading.style.lineHeight = '1.4';
        }
    });
    const codeBlocks = container.querySelectorAll('.code-block, .format-code, code');
    codeBlocks.forEach(block => {
        block.style.fontFamily = "'Courier New', monospace";
        block.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#f5f5f5';
        block.style.padding = '12px';
        block.style.borderRadius = '6px';
        block.style.borderLeft = '4px solid #3b82f6';
        block.style.margin = '16px 0';
        block.style.overflowX = 'auto';
        block.style.whiteSpace = 'pre-wrap';
        block.style.display = 'block';
    });
    const hrElements = container.querySelectorAll('.horizontal-line');
    hrElements.forEach(hr => {
        hr.style.height = '2px';
        hr.style.background = 'currentColor';
        hr.style.opacity = '0.3';
        hr.style.margin = '30px 0';
        hr.style.border = 'none';
        hr.style.display = 'block';
        hr.style.width = '100%';
        if (hr.classList.contains('thick')) hr.style.height = '4px';
        else if (hr.classList.contains('dashed')) {
            hr.style.background = 'none';
            hr.style.borderTop = '2px dashed currentColor';
        }
    });
    const boldElements = container.querySelectorAll('.text-bold, .format-bold');
    boldElements.forEach(el => el.style.fontWeight = '700');
    const italicElements = container.querySelectorAll('.text-italic, .format-italic');
    italicElements.forEach(el => el.style.fontStyle = 'italic');
    const chipTags = container.querySelectorAll('.chip-tag');
    chipTags.forEach(chip => {
        chip.style.display = 'inline-block';
        chip.style.padding = '4px 12px';
        chip.style.borderRadius = '20px';
        chip.style.fontSize = '12px';
        chip.style.fontWeight = '500';
        chip.style.margin = '0 4px';
    });
}

function applyPDFStylesToClone(container, theme, font) {
    container.style.fontFamily = formattingConfig.fonts[font] || "'Fredoka', sans-serif";
    if (theme === 'dark') {
        container.style.backgroundColor = '#1a1a1a';
        container.style.color = '#ffffff';
    } else {
        container.style.backgroundColor = '#ffffff';
        container.style.color = '#000000';
    }
    const allElements = container.querySelectorAll('*');
    allElements.forEach(el => {
        el.style.boxSizing = 'border-box';
        el.style.maxWidth = '100%';
        const computed = window.getComputedStyle(el);
        el.style.cssText += computed.cssText;
    });
}

function exportAsMarkdown(fileName) {
    const note = notes.find(n => n.id === activeNoteId);
    let content = writingCanvas.innerHTML;
    let markdown = content
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<u[^>]*>(.*?)<\/u>/gi, '$1')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n')
        .replace(/<div[^>]*class="code-block"[^>]*>(.*?)<\/div>/gi, '```\n$1\n```\n')
        .replace(/<div[^>]*class="horizontal-line"[^>]*>/gi, '\n---\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
        .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
    const metadata = `# ${fileName}\n\nExported from FocusPad on ${new Date().toLocaleDateString()}\n\n---\n\n`;
    markdown = metadata + markdown;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showFormattingIndicator('Markdown exported successfully!', 'success');
}

function exportAsText(fileName) {
    const note = notes.find(n => n.id === activeNoteId);
    let content = writingCanvas.textContent || writingCanvas.innerText;
    const metadata = `${fileName}\nExported from FocusPad on ${new Date().toLocaleDateString()}\n\n`;
    content = metadata + content;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showFormattingIndicator('Text exported successfully!', 'success');
}

// --- DELETE BUTTON ---
deleteBtn.addEventListener('click', () => {
    if (!activeNoteId) {
        showFormattingIndicator('No note to delete');
        return;
    }
    const folderNotes = getNotesInFolder(activeFolderId);
    if (folderNotes.length === 0) {
        showFormattingIndicator('No notes in this folder to delete');
        return;
    }
    if (folderNotes.length === 1 && folderNotes[0].id === activeNoteId) {
        confirmDeleteBtn.textContent = 'Delete Last Note';
    } else {
        confirmDeleteBtn.textContent = 'Delete';
    }
    confirmModal.classList.add('show');
    pushToModalStack(confirmModal);
});
cancelDeleteBtn.addEventListener('click', () => {
    confirmModal.classList.remove('show');
    const index = modalStack.indexOf(confirmModal);
    if (index > -1) modalStack.splice(index, 1);
    confirmDeleteBtn.textContent = 'Delete';
});
confirmDeleteBtn.addEventListener('click', () => {
    deleteNote(activeNoteId);
    confirmModal.classList.remove('show');
    const index = modalStack.indexOf(confirmModal);
    if (index > -1) modalStack.splice(index, 1);
    confirmDeleteBtn.textContent = 'Delete';
});
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        confirmModal.classList.remove('show');
        const index = modalStack.indexOf(confirmModal);
        if (index > -1) modalStack.splice(index, 1);
        confirmDeleteBtn.textContent = 'Delete';
    }
});

// --- NEW NOTE MODAL ---
addNoteBtn.addEventListener('click', () => {
    updateFolderDropdown();
    document.getElementById('newNoteName').value = '';
    const options = document.querySelectorAll('#folderSelectOptions .select-option');
    options.forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.folderId === activeFolderId) {
            option.classList.add('selected');
            document.getElementById('selectedFolderName').textContent = option.textContent;
        }
    });
    newNoteModal.classList.add('show');
    pushToModalStack(newNoteModal);
    setTimeout(() => document.getElementById('newNoteName').focus(), 100);
});
document.getElementById('cancelNewNote').addEventListener('click', () => {
    newNoteModal.classList.remove('show');
    const index = modalStack.indexOf(newNoteModal);
    if (index > -1) modalStack.splice(index, 1);
});
document.getElementById('createNewNote').addEventListener('click', () => {
    const name = document.getElementById('newNoteName').value.trim();
    const folderId = getSelectedFolderId();
    if (!name) {
        showFormattingIndicator('Please enter a note name!');
        return;
    }
    createNote(name, folderId);
    newNoteModal.classList.remove('show');
    const index = modalStack.indexOf(newNoteModal);
    if (index > -1) modalStack.splice(index, 1);
});
newNoteModal.addEventListener('click', (e) => {
    if (e.target === newNoteModal) {
        newNoteModal.classList.remove('show');
        const index = modalStack.indexOf(newNoteModal);
        if (index > -1) modalStack.splice(index, 1);
    }
});

// --- MANAGE FOLDERS MODAL ---
manageFoldersBtn.addEventListener('click', () => {
    renderFolderList();
    document.getElementById('newFolderName').value = '';
    manageFoldersModal.classList.add('show');
    pushToModalStack(manageFoldersModal);
    setTimeout(() => document.getElementById('newFolderName').focus(), 100);
});
document.getElementById('createFolderBtn').addEventListener('click', () => {
    const name = document.getElementById('newFolderName').value.trim();
    if (!name) {
        showFormattingIndicator('Please enter a folder name!');
        return;
    }
    createFolder(name);
    document.getElementById('newFolderName').value = '';
});
document.getElementById('closeFoldersModal').addEventListener('click', () => {
    manageFoldersModal.classList.remove('show');
    const index = modalStack.indexOf(manageFoldersModal);
    if (index > -1) modalStack.splice(index, 1);
});
manageFoldersModal.addEventListener('click', (e) => {
    if (e.target === manageFoldersModal) {
        manageFoldersModal.classList.remove('show');
        const index = modalStack.indexOf(manageFoldersModal);
        if (index > -1) modalStack.splice(index, 1);
    }
});

// --- FOLDER DELETE CONFIRMATION MODAL ---
const confirmFolderDeleteModal = document.getElementById('confirmFolderDeleteModal');
const cancelFolderDeleteBtn = document.getElementById('cancelFolderDelete');
const confirmFolderDeleteBtn = document.getElementById('confirmFolderDelete');
cancelFolderDeleteBtn.addEventListener('click', () => {
    confirmFolderDeleteModal.classList.remove('show');
    const index = modalStack.indexOf(confirmFolderDeleteModal);
    if (index > -1) modalStack.splice(index, 1);
    delete confirmFolderDeleteModal.dataset.pendingFolderId;
});
confirmFolderDeleteBtn.addEventListener('click', () => {
    const folderId = confirmFolderDeleteModal.dataset.pendingFolderId;
    if (folderId) {
        notes.forEach(note => {
            if (note.folderId === folderId) note.folderId = 'default';
        });
        const index = folders.findIndex(f => f.id === folderId);
        if (index > -1) folders.splice(index, 1);
        if (activeFolderId === folderId) activeFolderId = 'default';
        saveToStorage();
        renderFolderList();
        renderNoteChips();
        showFormattingIndicator('Folder deleted!');
        loadActiveNote();
    }
    confirmFolderDeleteModal.classList.remove('show');
    const index = modalStack.indexOf(confirmFolderDeleteModal);
    if (index > -1) modalStack.splice(index, 1);
    delete confirmFolderDeleteModal.dataset.pendingFolderId;
});
confirmFolderDeleteModal.addEventListener('click', (e) => {
    if (e.target === confirmFolderDeleteModal) {
        confirmFolderDeleteModal.classList.remove('show');
        const index = modalStack.indexOf(confirmFolderDeleteModal);
        if (index > -1) modalStack.splice(index, 1);
        delete confirmFolderDeleteModal.dataset.pendingFolderId;
    }
});

// --- SHARE MODAL ---
const shareModal = document.getElementById('shareModal');
const shareToggle = document.getElementById('shareToggle');
const shareLinkSection = document.getElementById('shareLinkSection');
const sharePrivateMsg = document.getElementById('sharePrivateMsg');
const closeShareModalBtn = document.getElementById('closeShareModal');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const shareLinkInput = document.getElementById('shareLinkInput');
function updateShareUI(isPublic) {
    const slider = shareToggle.querySelector('.toggle-slider');
    const options = shareToggle.querySelectorAll('.toggle-option');
    if (isPublic) {
        shareToggle.classList.add('public');
        shareToggle.classList.remove('private');
        options[1].classList.add('active');
        options[0].classList.remove('active');
        shareLinkSection.classList.add('visible');
        sharePrivateMsg.classList.remove('visible');
        const noteId = activeNoteId || 'default';
        const dummyBase = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
        shareLinkInput.value = `${dummyBase}/share.html?id=${noteId}`;
    } else {
        shareToggle.classList.add('private');
        shareToggle.classList.remove('public');
        options[0].classList.add('active');
        options[1].classList.remove('active');
        sharePrivateMsg.classList.add('visible');
        shareLinkSection.classList.remove('visible');
    }
}
shareBtn.addEventListener('click', () => {
    if (!activeNoteId) {
        showFormattingIndicator('No note to share. Create a note first.');
        return;
    }
    const note = notes.find(n => n.id === activeNoteId);
    const isPublic = note && note.isPublic === true;
    updateShareUI(isPublic);
    shareModal.classList.add('show');
    pushToModalStack(shareModal);
});
shareToggle.addEventListener('click', () => {
    const wasPublic = shareToggle.classList.contains('public');
    const isNowPublic = !wasPublic;
    updateShareUI(isNowPublic);
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        note.isPublic = isNowPublic;
        saveToStorage();
    }
});
closeShareModalBtn.addEventListener('click', () => {
    shareModal.classList.remove('show');
    const index = modalStack.indexOf(shareModal);
    if (index > -1) modalStack.splice(index, 1);
});
copyLinkBtn.addEventListener('click', () => {
    shareLinkInput.select();
    document.execCommand('copy');
    const originalIcon = copyLinkBtn.innerHTML;
    copyLinkBtn.innerHTML = '<i class="ph ph-check"></i>';
    setTimeout(() => {
        copyLinkBtn.innerHTML = originalIcon;
    }, 2000);
});
shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) {
        shareModal.classList.remove('show');
        const index = modalStack.indexOf(shareModal);
        if (index > -1) modalStack.splice(index, 1);
    }
});

// --- FORMATTING SHORTCUTS ---
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

// === MODIFIED: Colon required for line formatting commands ===
function processLineFormatting(lineNode) {
    // === NEW: Colon is mandatory – if line has no colon, exit ===
    if (!lineNode || !lineNode.textContent || !lineNode.textContent.includes(':')) {
        return false;
    }

    if (window.pasteInProgress) return false;
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
        const range = selection.getRangeAt(0);
        const temp = document.createElement('div');
        temp.innerHTML = newHTML;
        const newNode = temp.firstChild;
        if (lineNode.nodeType === 3) {
            lineNode.parentNode.replaceChild(newNode, lineNode);
        } else {
            lineNode.parentNode.replaceChild(newNode, lineNode);
        }
        const newRange = document.createRange();
        newRange.setStartAfter(newNode);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        saveCurrentNote();
        return true;
    }

    const headPattern = /^(#head|#subhead)((?:\.\w+)*)(?:\s+)(.*)$/i;
    const colorPattern = /^@color\.([\w#]+)(?:\s+)(.*)$/i;
    const alignPattern = /^@align\.(center|left|right|justify)(?:\s+)(.*)$/i;
    let match;

    if (match = text.match(headPattern)) {
        const type = match[1].toLowerCase();
        const dots = match[2];
        const content = match[3];
        if (!content.trim()) return false;
        const parts = dots.split('.').filter(p => p);
        let color = null;
        let center = false;
        parts.forEach(part => {
            if (part.toLowerCase() === 'center') center = true;
            else if (isValidColor(part)) color = part;
        });
        const className = type === '#head' ? 'heading-main' : 'heading-sub';
        let styles = '';
        if (color) styles += `color: ${color}; `;
        if (center) styles += 'text-align: center; ';
        if (styles) newHTML = `<div class="${className}" style="${styles}">${content}</div>`;
        else newHTML = `<div class="${className}">${content}</div>`;
        processed = true;
    } else if (match = text.match(colorPattern)) {
        const color = match[1];
        const content = match[2];
        if (!isValidColor(color)) return false;
        if (!content.trim()) return false;
        newHTML = `<div style="color: ${color};">${content}</div>`;
        processed = true;
    } else if (match = text.match(alignPattern)) {
        const align = match[1].toLowerCase();
        const content = match[2];
        if (!content.trim()) return false;
        newHTML = `<div style="text-align: ${align};">${content}</div>`;
        processed = true;
    }

    if (!processed) {
        const commandRegex = /^@(head|color|bold|italic|align|setFont)(?:[\.\s]([\w#\-\(\),]+))?\s*:\s*(.*)$/i;
        const legacyMatch = text.match(commandRegex);
        if (legacyMatch) {
            const command = legacyMatch[1].toLowerCase();
            const param = legacyMatch[2] ? legacyMatch[2].trim() : null;
            const content = legacyMatch[3];
            if (command === 'head') {
                let style = '';
                if (param) style = `style="color: ${param};"`;
                newHTML = `<h1 class="inline-head" ${style}>${content}</h1>`;
                processed = true;
            } else if (command === 'color') {
                if (param) {
                    newHTML = `<span style="color: ${param};">${content}</span>`;
                    processed = true;
                }
            } else if (command === 'bold') {
                let style = '';
                if (param) style = `style="color: ${param};"`;
                newHTML = `<span class="format-bold" ${style}>${content}</span>`;
                processed = true;
            } else if (command === 'italic') {
                newHTML = `<span class="format-italic">${content}</span>`;
                processed = true;
            } else if (command === 'align') {
                const align = ['center', 'right', 'justify'].includes(param?.toLowerCase()) ? param : 'left';
                newHTML = `<div style="text-align: ${align}; width: 100%; display: block;">${content}</div>`;
                processed = true;
            } else if (command === 'setfont') {
                const fontMap = {
                    'kalam': "'Kalam', cursive",
                    'caveat': "'Caveat', cursive",
                    'sacramento': "'Sacramento', cursive",
                    'patrickhand': "'Patrick Hand', cursive",
                    'amaticsc': "'Amatic SC', cursive",
                    'playpensans': "'Playpen Sans', cursive",
                    'fredoka': "'Fredoka', sans-serif",
                    'comicsans': "'Comic Sans MS', 'Comic Sans', cursive",
                    'courier': "'Courier New', monospace"
                };
                const key = param ? param.toLowerCase().replace(/\s+/g, '') : '';
                let family = 'inherit';
                for (const k in fontMap) {
                    if (key.includes(k)) {
                        family = fontMap[k];
                        break;
                    }
                }
                newHTML = `<span style="font-family: ${family};">${content}</span>`;
                processed = true;
                if (!content) {
                    newHTML = '';
                    setTimeout(() => {
                        const fontKey = Object.keys(formattingConfig.fonts).find(k => k.toLowerCase().replace(/\s+/g, '') === key);
                        if (fontKey) applyFontAtCursor(fontKey, true);
                    }, 10);
                }
            }
        }
    }

    if (!processed && text.trim().startsWith('$code:')) {
        const content = text.replace(/^\$code:\s*/i, '');
        if (content.trim().length > 0) {
            newHTML = `<div class="code-block">${content}</div>`;
            processed = true;
        }
    }

    if (processed && newHTML !== null) {
        if (!activeNoteId) {
            showFormattingIndicator('Please create a note first');
            return false;
        }
        const selection = window.getSelection();
        let currentRange = null;
        if (selection.rangeCount > 0) currentRange = selection.getRangeAt(0);
        if (newHTML === '') {
            lineNode.textContent = '';
            return true;
        }
        const temp = document.createElement('div');
        temp.innerHTML = newHTML;
        const newNode = temp.firstChild;
        if (newNode) {
            if (lineNode.parentNode) lineNode.parentNode.replaceChild(newNode, lineNode);
            const range = document.createRange();
            function getLastTextNode(node) {
                if (node.nodeType === 3) return node;
                for (let i = node.childNodes.length - 1; i >= 0; i--) {
                    const result = getLastTextNode(node.childNodes[i]);
                    if (result) return result;
                }
                return null;
            }
            const lastText = getLastTextNode(newNode);
            if (lastText) {
                range.setStart(lastText, lastText.length);
                range.collapse(true);
            } else {
                range.selectNodeContents(newNode);
                range.collapse(false);
            }
            selection.removeAllRanges();
            selection.addRange(range);
            saveCurrentNote();
            return true;
        }
    }
    return false;
}

let processing = false;
writingCanvas.addEventListener('keyup', (e) => {
    if (processing) return;
    if (e.inputType === 'insertFromPaste') return;
    if (e.key === ':' || e.key === ' ' || e.key === 'Enter') {
        processing = true;
        const lineNode = getCurrentLine();
        const wasProcessed = processLineFormatting(lineNode);
        if (wasProcessed) showFormattingIndicator('Formatting applied');
        processing = false;
    }
});

writingCanvas.addEventListener('input', () => saveCurrentNote());
writingCanvas.addEventListener('click', updateFontDisplay);
writingCanvas.addEventListener('keyup', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) updateFontDisplay();
});
writingCanvas.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (!activeNoteId) return;
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        let currentNode = range.startContainer;
        if (currentNode.nodeType === 3) {
            const textBefore = currentNode.textContent.substring(0, range.startOffset);
            const bulletMatch = textBefore.match(/^(\s*)(•|\d+\.)\s+(.*)$/);
            if (bulletMatch) {
                const [, indent, marker, content] = bulletMatch;
                if (!content.trim()) {
                    e.preventDefault();
                    currentNode.textContent = currentNode.textContent.substring(0, range.startOffset - (indent + marker).length - 1) +
                        currentNode.textContent.substring(range.startOffset);
                    const br = document.createElement('br');
                    const newRange = document.createRange();
                    newRange.setStart(currentNode, range.startOffset - (indent + marker).length - 1);
                    newRange.insertNode(br);
                    newRange.setStartAfter(br);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    return;
                }
                e.preventDefault();
                let newMarker = marker;
                if (/^\d+\.$/.test(marker)) {
                    const num = parseInt(marker);
                    newMarker = `${num + 1}.`;
                }
                const newLine = document.createTextNode('\n' + indent + newMarker + ' ');
                range.insertNode(newLine);
                range.setStartAfter(newLine);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }
});

writingCanvas.addEventListener('input', (e) => detectInlineCommand(e));
writingCanvas.addEventListener('keydown', (e) => handleInlineCommandKey(e));
writingCanvas.addEventListener('click', (e) => {
    if (activeFormattingSpan && !activeFormattingSpan.contains(e.target)) {
        cleanupZeroWidthSpace(activeFormattingSpan);
        activeFormattingSpan = null;
    }
});

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        fontSelectorBtn.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        addNoteBtn.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        exportBtn.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        togglePinNote();
    }
    if (e.key === 'Escape') {
        if (fontDropdown.classList.contains('active')) {
            fontSelectorBtn.classList.remove('active');
            fontDropdown.classList.remove('active');
            clearSavedCursorRange();
            e.preventDefault();
            return;
        }
        if (activeDropdown) {
            closeAllDropdowns();
            e.preventDefault();
            return;
        }
        if (noteContextMenu.classList.contains('show')) {
            hideContextMenu();
            e.preventDefault();
            return;
        }
        if (modalStack.length > 0) {
            const modal = modalStack.pop();
            modal.classList.remove('show');
            e.preventDefault();
            return;
        }
        if (sidebar.classList.contains('hidden')) {
            toggleFocus();
            e.preventDefault();
        }
    }
    if (e.key === 'Enter' && newNoteModal.classList.contains('show') && e.target.id === 'newNoteName') {
        e.preventDefault();
        document.getElementById('createNewNote').click();
    }
    if (e.key === 'Enter' && manageFoldersModal.classList.contains('show') && e.target.id === 'newFolderName') {
        e.preventDefault();
        document.getElementById('createFolderBtn').click();
    }
    if (e.key === 'Enter' && exportModal.classList.contains('show') && !exportConfirmBtn.disabled) {
        e.preventDefault();
        exportConfirmBtn.click();
    }
});

// ==================== NOTE CHIP CONTEXT MENU ====================
const noteContextMenu = document.getElementById('noteContextMenu');
const moveToFolderItem = document.getElementById('moveToFolderItem');
const folderSubmenu = document.getElementById('folderSubmenu');
let contextMenuNoteId = null;
let contextMenuVisible = false;

function showContextMenu(x, y) {
    noteContextMenu.style.left = x + 'px';
    noteContextMenu.style.top = y + 'px';
    noteContextMenu.classList.add('show');
    contextMenuVisible = true;
    const rect = noteContextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        noteContextMenu.style.left = (window.innerWidth - rect.width - 5) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
        noteContextMenu.style.top = (window.innerHeight - rect.height - 5) + 'px';
    }
    folderSubmenu.classList.remove('show');
}

function hideContextMenu() {
    noteContextMenu.classList.remove('show');
    folderSubmenu.classList.remove('show');
    contextMenuNoteId = null;
    contextMenuVisible = false;
}

noteChips.addEventListener('contextmenu', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    e.preventDefault();
    contextMenuNoteId = chip.dataset.noteId;
    hideContextMenu();
    showContextMenu(e.pageX, e.pageY);
});

moveToFolderItem.addEventListener('click', () => {
    if (!contextMenuNoteId) {
        hideContextMenu();
        return;
    }
    folderSubmenu.innerHTML = '';
    folders.forEach(folder => {
        const option = document.createElement('div');
        option.className = 'folder-option';
        option.textContent = folder.name;
        option.dataset.folderId = folder.id;
        folderSubmenu.appendChild(option);
    });
    folderSubmenu.classList.add('show');
});

folderSubmenu.addEventListener('click', (e) => {
    const option = e.target.closest('.folder-option');
    if (!option) return;
    const targetFolderId = option.dataset.folderId;
    if (!contextMenuNoteId || !targetFolderId) return;
    moveNoteToFolder(contextMenuNoteId, targetFolderId);
    hideContextMenu();
});

document.addEventListener('click', (e) => {
    if (noteContextMenu.classList.contains('show') && !noteContextMenu.contains(e.target)) {
        hideContextMenu();
    }
});

window.addEventListener('scroll', () => {
    if (noteContextMenu.classList.contains('show')) hideContextMenu();
}, { passive: true });

function moveNoteToFolder(noteId, targetFolderId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const oldFolderId = note.folderId;
    if (oldFolderId === targetFolderId) {
        showFormattingIndicator('Note already in this folder', 'info');
        return;
    }
    note.folderId = targetFolderId;
    saveToStorage();
    if (noteId === activeNoteId) {
        if (oldFolderId === activeFolderId) {
            const folderNotes = getNotesInFolder(activeFolderId);
            if (folderNotes.length > 0) activeNoteId = folderNotes[0].id;
            else activeNoteId = null;
        }
    }
    renderNoteChips();
    loadActiveNote();
    const folderName = folders.find(f => f.id === targetFolderId)?.name || 'Default';
    showFormattingIndicator(`Note moved to "${folderName}"`, 'success');
}

// === NEW: Move Modal Functions ===
function openMoveModal(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    pendingMoveNoteId = noteId;
    moveFileNameSpan.textContent = note.name;
    const currentFolder = folders.find(f => f.id === note.folderId) || { name: 'Default' };
    moveCurrentFolderSpan.textContent = currentFolder.name;
    populateMoveFolderDropdown(note.folderId);
    moveSuccess.classList.remove('show');
    moveFileModal.classList.add('show');
    pushToModalStack(moveFileModal);
}

function populateMoveFolderDropdown(currentFolderId) {
    moveFolderSelectOptions.innerHTML = '';
    const availableFolders = folders.filter(f => f.id !== currentFolderId);
    if (availableFolders.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'select-option disabled';
        placeholder.textContent = 'No other folders';
        placeholder.style.opacity = '0.5';
        placeholder.style.cursor = 'not-allowed';
        moveFolderSelectOptions.appendChild(placeholder);
        confirmMoveBtn.disabled = true;
        moveSelectedFolderName.textContent = 'No destination';
        return;
    }
    confirmMoveBtn.disabled = false;
    moveSelectedFolderName.textContent = availableFolders[0].name;
    availableFolders.forEach(folder => {
        const option = document.createElement('div');
        option.className = 'select-option';
        option.textContent = folder.name;
        option.dataset.folderId = folder.id;
        if (folder.id === availableFolders[0].id) option.classList.add('selected');
        option.addEventListener('click', () => {
            moveFolderSelectOptions.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            moveSelectedFolderName.textContent = folder.name;
            confirmMoveBtn.disabled = false;
        });
        moveFolderSelectOptions.appendChild(option);
    });
}

moveFolderSelectTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    moveFolderSelectWrapper.classList.toggle('active');
});
document.addEventListener('click', (e) => {
    if (!moveFolderSelectWrapper.contains(e.target)) {
        moveFolderSelectWrapper.classList.remove('active');
    }
});

cancelMoveBtn.addEventListener('click', () => {
    moveFileModal.classList.remove('show');
    const index = modalStack.indexOf(moveFileModal);
    if (index > -1) modalStack.splice(index, 1);
    pendingMoveNoteId = null;
});

confirmMoveBtn.addEventListener('click', async () => {
    if (!pendingMoveNoteId) {
        showFormattingIndicator('No note selected', 'error');
        return;
    }
    const selectedOption = moveFolderSelectOptions.querySelector('.select-option.selected');
    if (!selectedOption) {
        showFormattingIndicator('Please select a folder', 'error');
        return;
    }
    const targetFolderId = selectedOption.dataset.folderId;
    const note = notes.find(n => n.id === pendingMoveNoteId);
    if (!note) return;
    if (note.folderId === targetFolderId) {
        showFormattingIndicator('Note already in this folder', 'info');
        return;
    }
    confirmMoveBtn.disabled = true;
    const originalText = confirmMoveBtn.textContent;
    confirmMoveBtn.textContent = 'Moving...';
    setTimeout(() => {
        const oldFolderId = note.folderId;
        note.folderId = targetFolderId;
        saveToStorage();
        if (pendingMoveNoteId === activeNoteId && oldFolderId === activeFolderId) {
            const folderNotes = getNotesInFolder(activeFolderId);
            if (folderNotes.length > 0) activeNoteId = folderNotes[0].id;
            else activeNoteId = null;
            saveToStorage();
            renderNoteChips();
            loadActiveNote();
        } else {
            renderNoteChips();
        }
        confirmMoveBtn.textContent = originalText;
        confirmMoveBtn.disabled = false;
        moveSuccess.classList.add('show');
        const folderName = folders.find(f => f.id === targetFolderId)?.name || 'Default';
        showFormattingIndicator(`Note moved to "${folderName}"`, 'success');
        setTimeout(() => {
            moveFileModal.classList.remove('show');
            moveSuccess.classList.remove('show');
            const index = modalStack.indexOf(moveFileModal);
            if (index > -1) modalStack.splice(index, 1);
            pendingMoveNoteId = null;
        }, 1200);
    }, 300);
});

moveFileModal.addEventListener('click', (e) => {
    if (e.target === moveFileModal) {
        moveFileModal.classList.remove('show');
        const index = modalStack.indexOf(moveFileModal);
        if (index > -1) modalStack.splice(index, 1);
        pendingMoveNoteId = null;
    }
});

// --- INITIALIZATION ---
function init() {
    loadTheme();
    loadFromStorage();
    renderNoteChips();
    loadActiveNote();
    updateFontDisplay();
    updatePinButton();
    if (activeNoteId) writingCanvas.focus();
}

init();