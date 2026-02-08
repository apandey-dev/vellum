<!DOCTYPE html>
<html lang="en" data-theme="dark">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MindJournal - Advanced Notes</title>

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600&family=Kalam:wght@300;400;700&family=Playpen+Sans:wght@100;200;300;400;500;600;700;800&family=Patrick+Hand&family=Baloo+2:wght@400;500;600;700;800&family=Comic+Neue:wght@300;400;700&display=swap"
        rel="stylesheet">

    <!-- Phosphor Icons -->
    <script src="https://unpkg.com/@phosphor-icons/web"></script>

    <!-- External CSS -->
    <link rel="stylesheet" href="styles.css">
</head>

<body>

    <nav class="sidebar" id="sidebar">
        <div class="logo">
            <i class="ph ph-notebook" id="logoIcon"></i>
        </div>

        <div class="tool-group">
            <div class="tool-btn" id="exportBtn" data-tooltip="Export">
                <i class="ph ph-export"></i>
            </div>
            <div class="tool-btn" id="shareBtn" data-tooltip="Share">
                <i class="ph ph-share-network"></i>
            </div>
            <div class="tool-btn" id="deleteBtn" data-tooltip="Delete">
                <i class="ph ph-trash"></i>
            </div>
            <div class="tool-btn" id="bulletsBtn" data-tooltip="Bullets">
                <i class="ph ph-list-bullets"></i>
            </div>
            <div class="tool-btn" id="chipsBtn" data-tooltip="Insert Chip">
                <i class="ph ph-tag-chef"></i>
            </div>
        </div>

        <!-- Dropdown Menus -->
        <div class="dropdown-menu" id="bulletsMenu">
            <div class="dropdown-item" data-type="bullet">
                <span>Bullet</span>
            </div>
            <div class="dropdown-item" data-type="numbered">
                <span>Number</span>
            </div>
        </div>

        <div class="dropdown-menu" id="chipsMenu">
            <div class="dropdown-item" data-chip="red">
                <i class="ph ph-fire" style="color: #ef4444"></i>
                <span>Important</span>
            </div>
            <div class="dropdown-item" data-chip="blue">
                <i class="ph ph-info" style="color: #3b82f6"></i>
                <span>Note</span>
            </div>
            <div class="dropdown-item" data-chip="green">
                <i class="ph ph-check-circle" style="color: #10b981"></i>
                <span>Success</span>
            </div>
            <div class="dropdown-item" data-chip="yellow">
                <i class="ph ph-warning" style="color: #f59e0b"></i>
                <span>Warning</span>
            </div>
            <div class="dropdown-item" data-chip="purple">
                <i class="ph ph-lightbulb" style="color: #8b5cf6"></i>
                <span>Idea</span>
            </div>
            <div class="dropdown-item" data-chip="pink">
                <i class="ph ph-bell" style="color: #ec4899"></i>
                <span>Reminder</span>
            </div>
        </div>

        <div class="divider"></div>

        <div class="bottom-actions">
            <div class="tool-btn" id="themeToggle" data-tooltip="Switch Theme">
                <i class="ph ph-moon" id="themeIcon"></i>
            </div>

            <div class="tool-btn" id="focusBtn" data-tooltip="Zen Mode">
                <i class="ph ph-corners-out"></i>
            </div>
        </div>
    </nav>

    <div class="top-bar-wrapper" id="topBar">
        <header class="glass-header">
            <div class="chips" id="noteChips">
                <!-- Notes will be dynamically added here -->
            </div>

            <div class="header-actions">
                <!-- Font Selector -->
                <div class="font-selector-wrapper">
                    <button class="font-selector-btn" id="fontSelectorBtn">
                        <span class="current-font-preview" id="currentFont">Fredoka</span>
                        <i class="ph ph-caret-down" id="fontCaret"></i>
                    </button>
                    <div class="font-dropdown" id="fontDropdown">
                        <div class="font-option active" data-font="Fredoka">
                            <span>Fredoka</span>
                            <i class="ph ph-check check-icon"></i>
                        </div>
                        <div class="font-option" data-font="Kalam">
                            <span>Kalam</span>
                            <i class="ph ph-check check-icon"></i>
                        </div>
                        <div class="font-option" data-font="Playpen Sans">
                            <span>Playpen Sans</span>
                            <i class="ph ph-check check-icon"></i>
                        </div>
                        <div class="font-option" data-font="Patrick Hand">
                            <span>Patrick Hand</span>
                            <i class="ph ph-check check-icon"></i>
                        </div>
                        <div class="font-option" data-font="Baloo 2">
                            <span>Baloo 2</span>
                            <i class="ph ph-check check-icon"></i>
                        </div>
                        <div class="font-option" data-font="Comic Neue">
                            <span>Comic Neue</span>
                            <i class="ph ph-check check-icon"></i>
                        </div>
                        <div class="font-option" data-font="Comic Sans MS">
                            <span>Comic Sans MS</span>
                            <i class="ph ph-check check-icon"></i>
                        </div>
                    </div>
                </div>

                <button class="action-btn" id="addNoteBtn" title="New Note"><i class="ph ph-plus"></i></button>
                <button class="action-btn" id="pinBtn" title="Pin"><i class="ph ph-push-pin"></i></button>
                <button class="action-btn" id="manageFoldersBtn" title="Manage Folders"><i
                        class="ph ph-folder"></i></button>
            </div>
        </header>
    </div>

    <main class="workspace">
        <div class="writing-canvas" id="writingCanvas" contenteditable="true">
        </div>
    </main>

    <div class="formatting-indicator" id="formattingIndicator"></div>

    <div class="restore-pill" id="restoreBtn">
        <i class="ph ph-corners-in"></i>
        <span>Exit Focus</span>
    </div>

    <!-- Delete Confirmation Modal -->
    <div class="confirm-modal" id="confirmModal">
        <div class="confirm-box">
            <h3>Delete Note?</h3>
            <p>This will permanently delete the current note. This action cannot be undone.</p>
            <div class="confirm-actions">
                <button class="confirm-btn cancel" id="cancelDeleteBtn">Cancel</button>
                <button class="confirm-btn delete" id="confirmDeleteBtn">Delete</button>
            </div>
        </div>
    </div>

    <!-- New Note Modal -->
    <div class="form-modal" id="newNoteModal">
        <div class="form-box">
            <h3>Create New Note</h3>
            <div class="form-group">
                <label>Note Name</label>
                <input type="text" id="newNoteName" placeholder="Enter note name...">
            </div>
            <div class="form-group">
                <label>Folder</label>
                <div class="custom-select" id="folderSelectWrapper">
                    <div class="select-trigger" id="folderSelectTrigger">
                        <span id="selectedFolderName">Default</span>
                        <i class="ph ph-caret-down"></i>
                    </div>
                    <div class="select-options" id="folderSelectOptions">
                        <!-- Options will be dynamically added -->
                    </div>
                </div>
            </div>
            <div class="form-actions">
                <button class="form-btn secondary" id="cancelNewNote">Cancel</button>
                <button class="form-btn primary" id="createNewNote">Create</button>
            </div>
        </div>
    </div>

    <!-- Manage Folders Modal -->
    <div class="form-modal" id="manageFoldersModal">
        <div class="form-box">
            <h3>Manage Folders</h3>
            <div class="form-group">
                <label>Create New Folder</label>
                <input type="text" id="newFolderName" placeholder="Folder name...">
            </div>
            <button class="form-btn primary" id="createFolderBtn">Create Folder</button>

            <div class="folder-list" id="folderList">
                <!-- Folders will be dynamically added -->
            </div>

            <div class="form-actions">
                <button class="form-btn secondary" id="closeFoldersModal">Close</button>
            </div>
        </div>
    </div>

    <!-- Folder Delete Confirmation Modal -->
    <div class="confirm-modal" id="confirmFolderDeleteModal">
        <div class="confirm-box">
            <div class="confirm-icon">
                <i class="ph ph-folder-minus"></i>
            </div>
            <h3 id="folderDeleteTitle">Delete Folder?</h3>
            <p id="folderDeleteMessage">This folder will be deleted.</p>
            <div class="confirm-actions">
                <button class="confirm-btn cancel" id="cancelFolderDelete">Cancel</button>
                <button class="confirm-btn delete" id="confirmFolderDelete">Delete</button>
            </div>
        </div>
    </div>

    <!-- Share Modal -->
    <div class="form-modal" id="shareModal">
        <div class="form-box share-box">
            <h3>Share Note</h3>
            <p class="share-subtitle">Control who can view this note</p>

            <div class="share-toggle-wrapper">
                <div class="share-toggle" id="shareToggle">
                    <div class="toggle-option active" data-value="private">Private</div>
                    <div class="toggle-option" data-value="public">Public</div>
                    <div class="toggle-slider"></div>
                </div>
            </div>

            <div class="share-link-section" id="shareLinkSection">
                <label>Public Link</label>
                <div class="link-input-wrapper">
                    <input type="text" id="shareLinkInput" readonly value="https://focuspad.app/share/...">
                    <button class="copy-btn" id="copyLinkBtn" data-tooltip="Copy">
                        <i class="ph ph-copy"></i>
                    </button>
                </div>
                <p class="share-info"><i class="ph ph-info"></i> Anyone with this link can view this note.</p>
            </div>

            <div class="share-private-msg" id="sharePrivateMsg">
                <i class="ph ph-lock-key"></i>
                <p>This note is restricted to you only.</p>
            </div>

            <div class="form-actions">
                <button class="form-btn secondary" id="closeShareModal">Close</button>
            </div>
        </div>
    </div>

    <!-- Export Modal -->
    <div class="form-modal" id="exportModal">
        <div class="form-box export-box">
            <h3>Export Note</h3>

            <div class="form-group">
                <label>File Name</label>
                <input type="text" id="exportFileName" placeholder="Enter file name..." value="note">
            </div>

            <div class="export-options">
                <div class="export-card" data-format="pdf">
                    <div class="export-card-icon">
                        <i class="ph ph-file-pdf"></i>
                    </div>
                    <h4>PDF</h4>
                    <p>High-quality document</p>
                </div>

                <div class="export-card" data-format="markdown">
                    <div class="export-card-icon">
                        <i class="ph ph-file-text"></i>
                    </div>
                    <h4>Markdown</h4>
                    <p>.md format</p>
                </div>

                <div class="export-card" data-format="text">
                    <div class="export-card-icon">
                        <i class="ph ph-file"></i>
                    </div>
                    <h4>Text</h4>
                    <p>Plain text file</p>
                </div>
            </div>

            <div class="pdf-options" id="pdfOptions">
                <div class="form-group center">
                    <label>PDF Theme</label>
                    <div class="theme-toggle-pill">
                        <div class="theme-pill-option active" data-theme="dark">
                            <i class="ph ph-moon"></i>
                            <span>Dark</span>
                        </div>
                        <div class="theme-pill-option" data-theme="light">
                            <i class="ph ph-sun"></i>
                            <span>Light</span>
                        </div>
                        <div class="theme-pill-slider"></div>
                    </div>
                </div>

                <div class="form-group hidden">
                    <label>Include Header/Footer</label>
                    <div class="toggle-switch">
                        <input type="checkbox" id="includeHeaderFooter" checked>
                        <span class="toggle-slider"></span>
                    </div>
                </div>
            </div>

            <div class="form-actions export-actions">
                <button class="form-btn secondary" id="closeExportModal">Cancel</button>
                <button class="form-btn primary" id="exportConfirmBtn" disabled>Export</button>
            </div>
        </div>
    </div>

    <!-- External JavaScript -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
    <script src="script.js"></script>
</body>

</html>


script.js 
// ========================================
// FOCUSPAD - COMPLETE NOTES APP
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
const chipsBtn = document.getElementById('chipsBtn');
const addNoteBtn = document.getElementById('addNoteBtn');
const pinBtn = document.getElementById('pinBtn');
const manageFoldersBtn = document.getElementById('manageFoldersBtn');
const shareBtn = document.getElementById('shareBtn');

// Dropdown menus
const bulletsMenu = document.getElementById('bulletsMenu');
const chipsMenu = document.getElementById('chipsMenu');

// Note chips container
const noteChips = document.getElementById('noteChips');

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
let lastNotePerFolder = {}; // Track last opened note per folder

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

// --- HELPER FUNCTIONS ---
function isValidColor(colorName) {
    // Check if it's a valid CSS color
    const testElement = document.createElement('div');
    testElement.style.color = colorName;
    const testElement2 = document.createElement('div');
    testElement2.style.color = '#' + colorName;
    
    // Check for hex without #
    if (colorName.startsWith('#') || /^[0-9A-Fa-f]{3,6}$/.test(colorName)) {
        const hexColor = colorName.startsWith('#') ? colorName : '#' + colorName;
        testElement.style.color = hexColor;
    }
    
    return testElement.style.color !== '' || testElement2.style.color !== '';
}

function normalizeColor(colorName) {
    // Handle hex colors with or without #
    if (colorName.startsWith('#') || /^[0-9A-Fa-f]{3,6}$/.test(colorName)) {
        const hex = colorName.replace('#', '');
        if (hex.length === 3) {
            // Expand shorthand hex
            return '#' + hex.split('').map(c => c + c).join('');
        } else if (hex.length === 6) {
            return '#' + hex.toLowerCase();
        }
    }
    
    // Convert to lowercase for named colors (except proper case for CSS)
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

function showFormattingIndicator(message) {
    formattingIndicator.textContent = message;
    formattingIndicator.classList.add('show');
    setTimeout(() => {
        formattingIndicator.classList.remove('show');
    }, 2000);
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

    // Initialize default folder if none exists
    if (folders.length === 0) {
        folders.push({ id: 'default', name: 'Default', isDefault: true });
    }

    // Create first note if none exists
    if (notes.length === 0) {
        const firstNote = {
            id: generateId(),
            name: 'Welcome Note',
            folderId: 'default',
            content: 'Welcome to FocusPad! 🎨\n\nStart writing amazing notes with advanced formatting!\n\nTry these shortcuts:\n=== (thick line)\n--- (dashed line)\n@color.red: Make text red\n@head.blue.center: Colored centered heading',
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

// Initialize pin button event
pinBtn.addEventListener('click', togglePinNote);

// --- PASTE SANITIZATION ---
writingCanvas.addEventListener('paste', (e) => {
    e.preventDefault();

    // Get content
    const text = e.clipboardData.getData('text/plain');
    const htmlContent = e.clipboardData.getData('text/html');

    // If we have HTML, we want to extract basic formatting but strip layout styles
    if (htmlContent) {
        // Create a temporary container
        const temp = document.createElement('div');
        temp.innerHTML = htmlContent;

        // Sanitization function
        function sanitize(node) {
            // Remove style attributes
            if (node.hasAttribute && node.hasAttribute('style')) {
                node.removeAttribute('style');
            }
            if (node.hasAttribute && node.hasAttribute('class')) {
                node.removeAttribute('class');
            }
            if (node.hasAttribute && node.hasAttribute('width')) {
                node.removeAttribute('width');
            }
            if (node.hasAttribute && node.hasAttribute('height')) {
                node.removeAttribute('height');
            }

            // Recursively clean children
            const children = Array.from(node.children);
            children.forEach(child => sanitize(child));
        }

        sanitize(temp);

        // Insert cleaned HTML
        try {
            document.execCommand('insertHTML', false, temp.innerHTML);
        } catch (err) {
            document.execCommand('insertText', false, text);
        }
    } else {
        // Fallback to plain text
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

        // Get current folder notes after deletion
        const folderNotes = getNotesInFolder(activeFolderId);

        if (folderNotes.length === 0) {
            // No notes left in this folder
            activeNoteId = null;
            showFormattingIndicator('Note deleted! No notes in this folder.');
        } else if (activeNoteId === noteId) {
            // If we deleted the active note, switch to first note in folder
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
        // Show the note content
        writingCanvas.innerHTML = note.content || '';
        writingCanvas.contentEditable = 'true';
        writingCanvas.classList.remove('empty-folder-message');

        // Update pin button
        updatePinButton();

        // Enable delete button if we have notes in current folder
        const folderNotes = getNotesInFolder(activeFolderId);
        if (folderNotes.length > 0) {
            deleteBtn.classList.remove('disabled');
        }
    } else {
        // No active note - check if current folder has any notes
        const folderNotes = getNotesInFolder(activeFolderId);

        if (folderNotes.length === 0) {
            // Show "no notes in folder" message
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

            // Disable delete button when no notes
            deleteBtn.classList.add('disabled');
            
            // Reset pin button
            updatePinButton();

            // Add event listener to the create note button
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
            // Folder has notes but no active note selected - select first note
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

    // Show custom confirmation modal
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

    // Store folder ID for confirmation handler
    modal.dataset.pendingFolderId = folderId;
}

function setActiveFolder(folderId) {
    // Save current note before switching
    if (activeNoteId) {
        saveCurrentNote();
        // Remember this was the last note in current folder
        lastNotePerFolder[activeFolderId] = activeNoteId;
    }

    // Switch folder
    activeFolderId = folderId;

    // Get notes in new folder
    const folderNotes = getNotesInFolder(folderId);

    if (folderNotes.length > 0) {
        // Try to load last opened note from this folder
        const lastNoteId = lastNotePerFolder[folderId];
        const lastNote = folderNotes.find(n => n.id === lastNoteId);

        if (lastNote) {
            // Load the last opened note
            activeNoteId = lastNote.id;
        } else {
            // Load first note in folder
            activeNoteId = folderNotes[0].id;
        }
    } else {
        // No notes in folder - clear active note
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
        // Show empty state message
        const emptyChip = document.createElement('div');
        emptyChip.className = 'chip empty-chip';
        emptyChip.textContent = 'No notes';
        noteChips.appendChild(emptyChip);
        return;
    }

    folderNotes.forEach(note => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        if (note.id === activeNoteId) {
            chip.classList.add('active');
        }
        if (note.isPinned) {
            chip.classList.add('pinned-chip');
        }
        
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
        if (folder.id === activeFolderId) {
            item.classList.add('active');
        }

        const nameDiv = document.createElement('div');
        nameDiv.className = 'folder-name';
        nameDiv.textContent = folder.name;
        nameDiv.onclick = () => {
            setActiveFolder(folder.id);
            manageFoldersModal.classList.remove('show');
            // Remove from modal stack
            const index = modalStack.indexOf(manageFoldersModal);
            if (index > -1) {
                modalStack.splice(index, 1);
            }
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
            // Update selection
            selectedFolderId = folder.id;
            selectedNameSpan.textContent = folder.name;

            // Update UI
            optionsContainer.querySelectorAll('.select-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');

            // Close dropdown
            wrapper.classList.remove('active');
        });

        optionsContainer.appendChild(option);
    });

    // Toggle dropdown on trigger click
    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);

    newTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        wrapper.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('active');
        }
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

    // Apply theme compatibility adjustments
    applyThemeCompatibility(savedTheme);
}

function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

// THEME COMPATIBILITY FUNCTION
function applyThemeCompatibility(theme) {
    // Find all elements with text in the canvas
    const walker = document.createTreeWalker(
        writingCanvas,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        if (node.textContent.trim()) {
            textNodes.push(node);
        }
    }

    // Adjust colors based on theme
    const allElements = writingCanvas.querySelectorAll('*');
    allElements.forEach(el => {
        // Get computed style
        const computedStyle = window.getComputedStyle(el);
        const color = computedStyle.color;
        const bgColor = computedStyle.backgroundColor;

        // Skip if no color style
        if (!color) return;

        // Parse RGB color
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!rgbMatch) return;

        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);

        // Calculate luminance (perceived brightness)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // For light theme: if text is too light, make it darker
        if (theme === 'light' && luminance > 0.7) {
            // Make text darker for better contrast
            el.style.color = `rgb(${Math.max(0, r - 100)}, ${Math.max(0, g - 100)}, ${Math.max(0, b - 100)})`;
            el.dataset.themeAdjusted = 'true';
        }
        // For dark theme: if text is too dark, make it lighter
        else if (theme === 'dark' && luminance < 0.3) {
            // Make text lighter for better contrast
            el.style.color = `rgb(${Math.min(255, r + 100)}, ${Math.min(255, g + 100)}, ${Math.min(255, b + 100)})`;
            el.dataset.themeAdjusted = 'true';
        }
    });

    // Special handling for specific color classes
    const colorClasses = ['text-red', 'text-blue', 'text-green', 'text-yellow',
        'text-purple', 'text-pink', 'text-orange', 'text-gray'];

    colorClasses.forEach(className => {
        const elements = writingCanvas.querySelectorAll(`.${className}`);
        elements.forEach(el => {
            // For light theme, ensure colors are darker variants
            if (theme === 'light') {
                if (className === 'text-white') {
                    el.style.color = '#101828'; // Dark text for light theme
                    el.classList.remove('text-white');
                    el.classList.add('text-color-aware');
                }
            }
            // For dark theme, ensure colors are lighter variants
            else if (theme === 'dark') {
                if (className === 'text-black') {
                    el.style.color = '#ffffff'; // White text for dark theme
                    el.classList.remove('text-black');
                    el.classList.add('text-color-aware');
                }
            }
        });
    });

    saveCurrentNote();
}

// Enhanced theme toggle with better compatibility
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

// Save cursor range BEFORE dropdown opens (mousedown fires before click steals focus)
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

        // Use unified font application (cursor-based)
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

    // Get the element node
    if (node.nodeType === 3) {
        node = node.parentElement;
    }

    // Walk up to find font-family
    while (node && node !== writingCanvas) {
        const computedFont = window.getComputedStyle(node).fontFamily;

        // Match computed font to our font list
        for (const [fontName, fontFamily] of Object.entries(formattingConfig.fonts)) {
            if (computedFont.includes(fontName.replace(/\s+/g, ''))) {
                return fontName;
            }
        }

        node = node.parentElement;
    }

    return 'Fredoka'; // Default
}

function updateFontDisplay() {
    const currentFont = getCurrentFont();
    currentFontSpan.textContent = currentFont;

    // Update active state in dropdown
    fontOptions.forEach(opt => {
        const fontName = opt.getAttribute('data-font');
        if (fontName === currentFont) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
}

// --- UNIFIED FONT APPLICATION (Used by both dropdown and @setFont shortcut) ---
function applyFontAtCursor(fontName, useShortcutMode = false) {
    const fontFamily = formattingConfig.fonts[fontName] || "'Fredoka', sans-serif";

    // Try to restore saved cursor range if available
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

    // Case 1: Text is selected - wrap only selection
    if (!range.collapsed) {
        try {
            const span = document.createElement('span');
            span.style.fontFamily = fontFamily;

            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);

            // Keep cursor at end of span
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

    // Case 2: No selection (cursor only) - create typing anchor for future text
    const fontSpan = document.createElement('span');
    fontSpan.style.fontFamily = fontFamily;
    fontSpan.classList.add('cursor-font-marker');

    // Insert zero-width space to anchor cursor
    const anchorText = document.createTextNode('\u200B');
    fontSpan.appendChild(anchorText);

    // Insert span at cursor position
    range.insertNode(fontSpan);

    // Place cursor INSIDE the span after the zero-width space
    const newRange = document.createRange();
    newRange.setStartAfter(anchorText);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    writingCanvas.focus();
    showFormattingIndicator(`Font: ${fontName} (from cursor)`);

    // Update font display
    setTimeout(() => updateFontDisplay(), 50);

    // Monitor typing to clean up zero-width space once user types
    const inputHandler = (e) => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;

        const currentRange = sel.getRangeAt(0);
        let node = currentRange.startContainer;
        let parent = node.nodeType === 3 ? node.parentElement : node;

        // Check if we're in our font marker span
        if (parent && parent.classList && parent.classList.contains('cursor-font-marker')) {
            // Remove zero-width space if user typed real content
            const content = parent.textContent;
            if (content.length > 1 || (content.length === 1 && content !== '\u200B')) {
                // Replace zero-width space with nothing
                parent.textContent = content.replace(/\u200B/g, '');
                parent.classList.remove('cursor-font-marker');

                // Restore cursor position at end
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
            // Cursor moved out, cleanup
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
    chipsMenu.classList.remove('active');
    activeDropdown = null;
    clearSavedCursorRange();
}

document.addEventListener('click', (e) => {
    if (!bulletsBtn.contains(e.target) && !bulletsMenu.contains(e.target) &&
        !chipsBtn.contains(e.target) && !chipsMenu.contains(e.target)) {
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
    // Don't allow insertion if no active note
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

    // Don't delete content, just insert at cursor
    let bulletText = '';

    if (type === 'numbered') {
        // Smart numbering: Check if there's a number before cursor
        let currentNode = range.startContainer;
        let textBefore = '';

        if (currentNode.nodeType === 3) { // Text node
            textBefore = currentNode.textContent.substring(0, range.startOffset);
        }

        // Find last number in the text
        const numberMatch = textBefore.match(/(\d+)\.\s*[^\d]*$/);
        let nextNumber = 1;

        if (numberMatch) {
            nextNumber = parseInt(numberMatch[1]) + 1;
        }

        bulletText = `${nextNumber}. `;
    } else {
        // Regular bullet
        bulletText = '• ';
    }

    // Insert bullet text inline
    const textNode = document.createTextNode(bulletText);
    range.insertNode(textNode);

    // Position cursor after bullet
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    showFormattingIndicator(`${type === 'numbered' ? 'Number' : 'Bullet'} inserted`);
    saveCurrentNote();
}

// --- CHIPS BUTTON ---
// Save cursor range before dropdown opens
chipsBtn.addEventListener('mousedown', (e) => {
    saveCursorRange();
});

chipsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeDropdown === 'chips') {
        closeAllDropdowns();
    } else {
        closeAllDropdowns();
        chipsMenu.classList.add('active');
        activeDropdown = 'chips';

        const rect = chipsBtn.getBoundingClientRect();
        chipsMenu.style.top = `${rect.top}px`;
    }
});

document.querySelectorAll('#chipsMenu .dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
        const chipType = item.getAttribute('data-chip');
        insertChip(chipType);
        closeAllDropdowns();
    });
});

// IMPROVED CHIP INSERTION - Inserts at cursor position correctly
function insertChip(type) {
    // Don't allow insertion if no active note
    if (!activeNoteId) {
        showFormattingIndicator('Please create a note first');
        return;
    }

    const chipTexts = {
        'red': 'Important',
        'blue': 'Note',
        'green': 'Success',
        'yellow': 'Warning',
        'purple': 'Idea',
        'pink': 'Reminder'
    };

    // Restore saved cursor range if dropdown stole focus
    if (savedCursorRange) {
        restoreCursorRange();
    } else {
        writingCanvas.focus();
    }

    const selection = window.getSelection();
    if (!selection.rangeCount) {
        showFormattingIndicator('Please click in the editor first');
        return;
    }

    const range = selection.getRangeAt(0);

    // Ensure we're in the writing canvas
    if (!writingCanvas.contains(range.commonAncestorContainer)) {
        writingCanvas.focus();
        return;
    }

    // Delete any selected content
    if (!range.collapsed) {
        range.deleteContents();
    }

    // Create chip element
    const chip = document.createElement('span');
    chip.className = `chip-tag chip-${type}`;
    chip.textContent = chipTexts[type];
    chip.contentEditable = 'false';

    // Create space after chip
    const spaceAfter = document.createTextNode(' ');

    // Insert chip and space at cursor position
    range.insertNode(spaceAfter);
    range.insertNode(chip);

    // Position cursor after the space
    range.setStartAfter(spaceAfter);
    range.setEndAfter(spaceAfter);
    selection.removeAllRanges();
    selection.addRange(range);

    showFormattingIndicator(`${chipTexts[type]} chip inserted`);
    clearSavedCursorRange();

    // Auto-save
    saveCurrentNote();
}

// === AND --- SHORTCUTS FOR HORIZONTAL LINES
function insertHorizontalLine(type) {
    // Don't allow insertion if no active note
    if (!activeNoteId) {
        showFormattingIndicator('Please create a note first');
        return;
    }

    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Create horizontal line element
    const hr = document.createElement('div');
    hr.className = 'horizontal-line';

    if (type === 'thick') {
        hr.classList.add('thick');
    } else if (type === 'dashed') {
        hr.classList.add('dashed');
    }

    // Insert at cursor position
    range.insertNode(hr);

    // Add a new line after the horizontal line
    const br = document.createElement('br');
    range.insertNode(br);

    // Move cursor to after the new line
    range.setStartAfter(br);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    showFormattingIndicator(`Horizontal line inserted`);
    saveCurrentNote();
}

// --- EXPORT MODAL ---
exportBtn.addEventListener('click', () => {
    // Don't show export modal if no active note
    if (!activeNoteId) {
        showFormattingIndicator('No note to export. Create a note first.');
        return;
    }

    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        exportFileNameInput.value = note.name.replace(/[^\w\s]/gi, '');
    }

    // Reset selection
    exportCards.forEach(card => card.classList.remove('selected'));
    selectedExportFormat = null;
    exportConfirmBtn.disabled = true;

    // Set default PDF theme based on current app theme
    const currentTheme = html.getAttribute('data-theme');
    themeTogglePill.dataset.theme = currentTheme;
    themePillOptions.forEach(option => {
        option.classList.remove('active');
        if (option.dataset.theme === currentTheme) {
            option.classList.add('active');
        }
    });

    exportModal.classList.add('show');
    pushToModalStack(exportModal);
});

closeExportModalBtn.addEventListener('click', () => {
    exportModal.classList.remove('show');
    const index = modalStack.indexOf(exportModal);
    if (index > -1) {
        modalStack.splice(index, 1);
    }
});

exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) {
        exportModal.classList.remove('show');
        const index = modalStack.indexOf(exportModal);
        if (index > -1) {
            modalStack.splice(index, 1);
        }
    }
});

// Export card selection
exportCards.forEach(card => {
    card.addEventListener('click', () => {
        // Remove selection from all cards
        exportCards.forEach(c => c.classList.remove('selected'));

        // Select clicked card
        card.classList.add('selected');
        selectedExportFormat = card.dataset.format;
        exportConfirmBtn.disabled = false;
    });
});

// PDF Theme pill toggle
themePillOptions.forEach(option => {
    option.addEventListener('click', () => {
        const selectedTheme = option.dataset.theme;
        themeTogglePill.dataset.theme = selectedTheme;

        themePillOptions.forEach(opt => {
            opt.classList.remove('active');
        });
        option.classList.add('active');
    });
});

// Export confirmation
exportConfirmBtn.addEventListener('click', async () => {
    const fileName = exportFileNameInput.value.trim() || 'note';

    if (!selectedExportFormat) {
        showFormattingIndicator('Please select an export format');
        return;
    }

    exportModal.classList.remove('show');
    const index = modalStack.indexOf(exportModal);
    if (index > -1) {
        modalStack.splice(index, 1);
    }
    
    showFormattingIndicator(`Exporting as ${selectedExportFormat.toUpperCase()}...`);

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

// --- EXPORT FUNCTIONS ---
async function exportAsPDF(fileName) {
    try {
        const note = notes.find(n => n.id === activeNoteId);
        const content = writingCanvas.innerHTML;
        const selectedTheme = themeTogglePill.dataset.theme || 'dark';
        const includeHeader = includeHeaderFooter.checked;

        // Create a temporary container for PDF generation
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '794px'; // A4 width in pixels
        tempContainer.style.padding = '40px';
        tempContainer.style.fontFamily = "'Fredoka', sans-serif";
        tempContainer.style.lineHeight = '1.6';
        tempContainer.style.fontSize = '14px';

        // Apply theme
        if (selectedTheme === 'dark') {
            tempContainer.style.backgroundColor = '#1a1a1a';
            tempContainer.style.color = '#ffffff';
        } else {
            tempContainer.style.backgroundColor = '#ffffff';
            tempContainer.style.color = '#000000';
        }

        // Add header if enabled
        if (includeHeader) {
            const header = document.createElement('div');
            header.style.textAlign = 'center';
            header.style.marginBottom = '30px';
            header.style.paddingBottom = '20px';
            header.style.borderBottom = '1px solid #ddd';

            const title = document.createElement('h1');
            title.textContent = fileName;
            title.style.margin = '0';
            title.style.fontSize = '24px';
            title.style.fontWeight = 'bold';

            header.appendChild(title);
            tempContainer.appendChild(header);
        }

        // Add content
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = content;

        // Preserve ALL color styles from the note
        const colorElements = contentDiv.querySelectorAll('[style*="color"]');
        colorElements.forEach(el => {
            const style = el.getAttribute('style');
            // Extract color value from style
            const colorMatch = style.match(/color:\s*([^;]+)/);
            if (colorMatch) {
                const colorValue = colorMatch[1].trim();
                // Ensure color is preserved exactly as is
                el.style.color = colorValue;
                
                // For light theme PDF, adjust very dark colors
                if (selectedTheme === 'light') {
                    // Check if color is very dark (black or near black)
                    if (colorValue === 'black' || colorValue === '#000' || colorValue === '#000000' || 
                        colorValue === 'rgb(0,0,0)' || colorValue === 'rgba(0,0,0,1)') {
                        el.style.color = '#000000'; // Keep black for light theme
                    }
                    // Check if color is very light (white or near white)
                    else if (colorValue === 'white' || colorValue === '#fff' || colorValue === '#ffffff' || 
                            colorValue === 'rgb(255,255,255)' || colorValue === 'rgba(255,255,255,1)') {
                        el.style.color = '#333333'; // Change white to dark gray for light theme
                    }
                }
                // For dark theme PDF, adjust very light colors
                else if (selectedTheme === 'dark') {
                    // Check if color is very light (white or near white)
                    if (colorValue === 'white' || colorValue === '#fff' || colorValue === '#ffffff' || 
                        colorValue === 'rgb(255,255,255)' || colorValue === 'rgba(255,255,255,1)') {
                        el.style.color = '#ffffff'; // Keep white for dark theme
                    }
                    // Check if color is very dark (black or near black)
                    else if (colorValue === 'black' || colorValue === '#000' || colorValue === '#000000' || 
                            colorValue === 'rgb(0,0,0)' || colorValue === 'rgba(0,0,0,1)') {
                        el.style.color = '#cccccc'; // Change black to light gray for dark theme
                    }
                }
            }
        });

        // Also preserve color classes
        const colorClassElements = contentDiv.querySelectorAll('[class*="text-"]');
        colorClassElements.forEach(el => {
            const classes = el.className.split(' ');
            classes.forEach(cls => {
                if (cls.startsWith('text-')) {
                    const colorName = cls.replace('text-', '');
                    const colorMap = {
                        'red': '#ef4444',
                        'blue': '#3b82f6',
                        'green': '#10b981',
                        'yellow': '#f59e0b',
                        'purple': '#8b5cf6',
                        'pink': '#ec4899',
                        'orange': '#f97316',
                        'gray': '#6b7280'
                    };
                    if (colorMap[colorName]) {
                        el.style.color = colorMap[colorName];
                    }
                }
            });
        });

        tempContainer.appendChild(contentDiv);

        // Add footer if enabled
        if (includeHeader) {
            const footer = document.createElement('div');
            footer.style.textAlign = 'center';
            footer.style.marginTop = '40px';
            footer.style.paddingTop = '20px';
            footer.style.borderTop = '1px solid #ddd';
            footer.style.fontSize = '12px';
            footer.style.color = '#666';

            const appName = document.createElement('div');
            appName.textContent = 'Exported from FocusPad';
            appName.style.marginBottom = '5px';

            const date = document.createElement('div');
            date.textContent = new Date().toLocaleDateString();

            footer.appendChild(appName);
            footer.appendChild(date);
            tempContainer.appendChild(footer);
        }

        document.body.appendChild(tempContainer);

        // Generate PDF with high quality
        const canvas = await html2canvas(tempContainer, {
            scale: 4, // High resolution for vector-like quality
            useCORS: true,
            backgroundColor: selectedTheme === 'dark' ? '#1a1a1a' : '#ffffff',
            logging: false,
            allowTaint: true,
            letterRendering: true
        });

        // Remove temp container
        document.body.removeChild(tempContainer);

        // Create PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${fileName}.pdf`);

        showFormattingIndicator('PDF exported successfully!');
    } catch (error) {
        console.error('PDF export error:', error);
        showFormattingIndicator('Error exporting PDF');
    }
}

function exportAsMarkdown(fileName) {
    const note = notes.find(n => n.id === activeNoteId);
    let content = writingCanvas.innerHTML;

    // Convert HTML to Markdown (simplified conversion)
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

    // Add metadata
    const metadata = `# ${fileName}\n\nExported from FocusPad on ${new Date().toLocaleDateString()}\n\n---\n\n`;
    markdown = metadata + markdown;

    // Create and download file
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.md`;
    a.click();
    URL.revokeObjectURL(url);

    showFormattingIndicator('Markdown exported successfully!');
}

function exportAsText(fileName) {
    const note = notes.find(n => n.id === activeNoteId);
    let content = writingCanvas.textContent || writingCanvas.innerText;

    // Add metadata
    const metadata = `${fileName}\nExported from FocusPad on ${new Date().toLocaleDateString()}\n\n`;
    content = metadata + content;

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    showFormattingIndicator('Text exported successfully!');
}

// --- DELETE BUTTON ---
deleteBtn.addEventListener('click', () => {
    // Check if we have a note to delete
    if (!activeNoteId) {
        showFormattingIndicator('No note to delete');
        return;
    }

    // Check if we're in empty folder state
    const folderNotes = getNotesInFolder(activeFolderId);
    if (folderNotes.length === 0) {
        showFormattingIndicator('No notes in this folder to delete');
        return;
    }

    // Check if this is the last note in the folder
    if (folderNotes.length === 1) {
        if (folderNotes[0].id === activeNoteId) {
            // This is the last note in folder - show special message
            confirmDeleteBtn.textContent = 'Delete Last Note';
        } else {
            confirmDeleteBtn.textContent = 'Delete';
        }
    } else {
        confirmDeleteBtn.textContent = 'Delete';
    }

    confirmModal.classList.add('show');
    pushToModalStack(confirmModal);
});

cancelDeleteBtn.addEventListener('click', () => {
    confirmModal.classList.remove('show');
    const index = modalStack.indexOf(confirmModal);
    if (index > -1) {
        modalStack.splice(index, 1);
    }
    confirmDeleteBtn.textContent = 'Delete'; // Reset button text
});

confirmDeleteBtn.addEventListener('click', () => {
    deleteNote(activeNoteId);
    confirmModal.classList.remove('show');
    const index = modalStack.indexOf(confirmModal);
    if (index > -1) {
        modalStack.splice(index, 1);
    }
    confirmDeleteBtn.textContent = 'Delete'; // Reset button text
});

confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        confirmModal.classList.remove('show');
        const index = modalStack.indexOf(confirmModal);
        if (index > -1) {
            modalStack.splice(index, 1);
        }
        confirmDeleteBtn.textContent = 'Delete'; // Reset button text
    }
});

// --- NEW NOTE MODAL ---
addNoteBtn.addEventListener('click', () => {
    updateFolderDropdown();
    document.getElementById('newNoteName').value = '';

    // Set the selected folder to current active folder
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
    if (index > -1) {
        modalStack.splice(index, 1);
    }
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
    if (index > -1) {
        modalStack.splice(index, 1);
    }
});

newNoteModal.addEventListener('click', (e) => {
    if (e.target === newNoteModal) {
        newNoteModal.classList.remove('show');
        const index = modalStack.indexOf(newNoteModal);
        if (index > -1) {
            modalStack.splice(index, 1);
        }
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
    if (index > -1) {
        modalStack.splice(index, 1);
    }
});

manageFoldersModal.addEventListener('click', (e) => {
    if (e.target === manageFoldersModal) {
        manageFoldersModal.classList.remove('show');
        const index = modalStack.indexOf(manageFoldersModal);
        if (index > -1) {
            modalStack.splice(index, 1);
        }
    }
});

// --- FOLDER DELETE CONFIRMATION MODAL ---
const confirmFolderDeleteModal = document.getElementById('confirmFolderDeleteModal');
const cancelFolderDeleteBtn = document.getElementById('cancelFolderDelete');
const confirmFolderDeleteBtn = document.getElementById('confirmFolderDelete');

cancelFolderDeleteBtn.addEventListener('click', () => {
    confirmFolderDeleteModal.classList.remove('show');
    const index = modalStack.indexOf(confirmFolderDeleteModal);
    if (index > -1) {
        modalStack.splice(index, 1);
    }
    delete confirmFolderDeleteModal.dataset.pendingFolderId;
});

confirmFolderDeleteBtn.addEventListener('click', () => {
    const folderId = confirmFolderDeleteModal.dataset.pendingFolderId;

    if (folderId) {
        // Move notes to default folder
        notes.forEach(note => {
            if (note.folderId === folderId) {
                note.folderId = 'default';
            }
        });

        const index = folders.findIndex(f => f.id === folderId);
        if (index > -1) {
            folders.splice(index, 1);
        }

        if (activeFolderId === folderId) {
            activeFolderId = 'default';
        }

        saveToStorage();
        renderFolderList();
        renderNoteChips();
        showFormattingIndicator('Folder deleted!');

        // Load notes for the new active folder
        loadActiveNote();
    }

    confirmFolderDeleteModal.classList.remove('show');
    const index = modalStack.indexOf(confirmFolderDeleteModal);
    if (index > -1) {
        modalStack.splice(index, 1);
    }
    delete confirmFolderDeleteModal.dataset.pendingFolderId;
});

confirmFolderDeleteModal.addEventListener('click', (e) => {
    if (e.target === confirmFolderDeleteModal) {
        confirmFolderDeleteModal.classList.remove('show');
        const index = modalStack.indexOf(confirmFolderDeleteModal);
        if (index > -1) {
            modalStack.splice(index, 1);
        }
        delete confirmFolderDeleteModal.dataset.pendingFolderId;
    }
});

// --- SHARE MODAL & LOGIC ---
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
        options[1].classList.add('active'); // Public
        options[0].classList.remove('active'); // Private

        shareLinkSection.classList.add('visible');
        sharePrivateMsg.classList.remove('visible');

        // Generate Link (simulated for local file)
        const noteId = activeNoteId || 'default';
        const dummyBase = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
        shareLinkInput.value = `${dummyBase}/share.html?id=${noteId}`;
    } else {
        shareToggle.classList.add('private');
        shareToggle.classList.remove('public');
        options[0].classList.add('active'); // Private
        options[1].classList.remove('active'); // Public

        sharePrivateMsg.classList.add('visible');
        shareLinkSection.classList.remove('visible');
    }
}

shareBtn.addEventListener('click', () => {
    // Don't show share modal if no active note
    if (!activeNoteId) {
        showFormattingIndicator('No note to share. Create a note first.');
        return;
    }

    // Default to private initially or load from note metadata if we had it
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

    // Save state to note
    const note = notes.find(n => n.id === activeNoteId);
    if (note) {
        note.isPublic = isNowPublic;
        saveToStorage();
    }
});

closeShareModalBtn.addEventListener('click', () => {
    shareModal.classList.remove('show');
    const index = modalStack.indexOf(shareModal);
    if (index > -1) {
        modalStack.splice(index, 1);
    }
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
        if (index > -1) {
            modalStack.splice(index, 1);
        }
    }
});

// --- FORMATTING SHORTCUTS ---
function getCurrentLine() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return null;

    let node = selection.anchorNode;
    if (!node) return null;

    // Return text node if we're in one
    if (node.nodeType === 3) {
        return node;
    }

    // If we're in an element, get the text node at cursor
    if (node.nodeType === 1) {
        const range = selection.getRangeAt(0);
        let targetNode = range.startContainer;

        // If start container is text node, use it
        if (targetNode.nodeType === 3) {
            return targetNode;
        }

        // Otherwise find first text node child
        const walker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        return walker.nextNode() || node;
    }

    return node;
}

// ENHANCED COLOR PROCESSING FUNCTION
function processLineFormatting(lineNode) {
    if (!lineNode) return false;

    let text = lineNode.textContent || '';
    let processed = false;
    let newHTML = '';

    // Check for horizontal line shortcuts
    const trimmedText = text.trim();

    if (trimmedText === '===') {
        newHTML = '<div class="horizontal-line thick"></div>';
        processed = true;
    } else if (trimmedText === '---') {
        newHTML = '<div class="horizontal-line dashed"></div>';
        processed = true;
    }

    if (processed) {
        // Don't process formatting if no active note
        if (!activeNoteId) {
            showFormattingIndicator('Please create a note first');
            return false;
        }

        // Replace the line with horizontal line
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

        // Move cursor to after the horizontal line
        const newRange = document.createRange();
        newRange.setStartAfter(newNode);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        saveCurrentNote();
        return true;
    }

    // If no colon, don't process other formatting
    if (!text.includes(':')) return false;

    // Don't process formatting if no active note
    if (!activeNoteId) {
        showFormattingIndicator('Please create a note first');
        return false;
    }

    // ENHANCED: Process colors with ANY valid CSS color (named colors, hex, rgb, hsl, etc.)
    // Support: @color.red:, @color.#ff0000:, @color.rgb(255,0,0):, @color.rebeccapurple:
    const colorRegex = /@color\.([^:]+):(.*)$/i;
    if (!processed && colorRegex.test(text)) {
        const match = text.match(colorRegex);
        const colorName = match[1].trim();
        const content = match[2];

        // Validate color using enhanced validation
        if (isValidColor(colorName) && content !== undefined) {
            // Normalize color (handle hex shorthand, convert named colors to hex for consistency)
            const normalizedColor = normalizeColor(colorName);
            
            // Apply color via inline style - preserve formatting
            newHTML = `<span style="color: ${normalizedColor}" class="color-preserve">${content}</span>`;
            processed = true;
            showFormattingIndicator(`Color applied: ${colorName}`);
        } else {
            showFormattingIndicator(`Invalid color: ${colorName}`);
        }
    }

    // ENHANCED: Process headings with colors and alignments
    // Support: @head.red.center:, @head.#ff0000.left:, @head.rgb(255,0,0):, @head.rebeccapurple.right:
    if (!processed) {
        const headingRegex = /@(head|subHead)\.([^:]+):(.*)$/i;
        const match = text.match(headingRegex);
        if (match) {
            const [, type, modifiers, content] = match;

            // Process if content exists
            if (content !== undefined) {
                let className = type === 'head' ? 'heading-main' : 'heading-sub';
                let inlineStyles = '';

                // Parse modifiers (could be color.alignment or just color)
                const modParts = modifiers.split('.');
                
                modParts.forEach(mod => {
                    const modTrimmed = mod.trim();
                    
                    // Check if it's a valid color
                    if (isValidColor(modTrimmed)) {
                        const normalizedColor = normalizeColor(modTrimmed);
                        inlineStyles += `color: ${normalizedColor}; `;
                    }
                    // Check if it's an alignment
                    else if (formattingConfig.alignments[modTrimmed.toLowerCase()]) {
                        className += ` text-${modTrimmed.toLowerCase()}`;
                    }
                });

                if (inlineStyles) {
                    newHTML = `<div class="${className}" style="${inlineStyles}">${content}</div>`;
                } else {
                    newHTML = `<div class="${className}">${content}</div>`;
                }
                processed = true;
                showFormattingIndicator(`${type === 'head' ? 'Heading' : 'Subheading'} with formatting applied`);
            }
        }
    }

    // Process styles
    if (!processed) {
        for (const [style, className] of Object.entries(formattingConfig.styles)) {
            const regex = new RegExp(`@${style}:(.*)$`, 'i');
            if (regex.test(text)) {
                const match = text.match(regex);
                const content = match[1];

                // Only process if there's actual content
                if (content !== undefined) {
                    if (style === 'normal') {
                        newHTML = content;
                    } else {
                        newHTML = `<span class="${className}">${content}</span>`;
                    }
                    processed = true;
                    break;
                }
            }
        }
    }

    // Process alignments
    if (!processed) {
        for (const [align, className] of Object.entries(formattingConfig.alignments)) {
            const regex = new RegExp(`@align\\.${align}:(.*)$`, 'i');
            if (regex.test(text)) {
                const match = text.match(regex);
                const content = match[1];

                if (content !== undefined) {
                    newHTML = `<div class="${className}">${content}</div>`;
                    processed = true;
                    break;
                }
            }
        }
    }

    // Process code blocks
    if (!processed) {
        const codeRegex = /\$code:(.*)$/i;
        if (codeRegex.test(text)) {
            const match = text.match(codeRegex);
            const content = match[1];

            if (content.trim().length > 0) {
                newHTML = `<div class="code-block">${content}</div>`;
                processed = true;
            }
        }
    }

    // Process @setFont shortcuts - Use unified cursor-based font application
    if (!processed) {
        for (const [fontName, fontFamily] of Object.entries(formattingConfig.fonts)) {
            const regex = new RegExp(`@setFont\\.${fontName.replace(/\s+/g, '\\s+')}:(.*)$`, 'i');
            if (regex.test(text)) {
                const match = text.match(regex);
                const content = match[1];

                // Always process, even if content is empty (cursor-based application)
                if (content !== undefined) {
                    if (content.trim().length > 0) {
                        // Has content - wrap it with font
                        newHTML = `<span style="font-family: ${fontFamily}">${content}</span>`;
                    } else {
                        // No content - apply font at cursor for future typing
                        // Remove command token and trigger cursor-based font application
                        newHTML = '';
                        // Trigger unified font application after removal
                        setTimeout(() => applyFontAtCursor(fontName, true), 10);
                    }
                    processed = true;
                    break;
                }
            }
        }
    }

    if (processed && newHTML) {
        // Save cursor position BEFORE replacement
        const selection = window.getSelection();
        let savedOffset = 0;

        if (selection.rangeCount > 0) {
            const currentRange = selection.getRangeAt(0);
            const currentNode = currentRange.startContainer;
            savedOffset = currentRange.startOffset;

            // If cursor is in the line being replaced, save its offset
            let walker = currentNode;
            while (walker && walker !== writingCanvas) {
                if (walker === lineNode) {
                    // Calculate total offset from start of line
                    if (currentNode.nodeType === 3) {
                        // Text node - use the offset directly
                        savedOffset = currentRange.startOffset;
                    }
                    break;
                }
                walker = walker.parentNode;
            }
        }

        const temp = document.createElement('div');
        temp.innerHTML = newHTML;
        const newNode = temp.firstChild;

        if (newNode) {
            if (lineNode.nodeType === 3) {
                lineNode.parentNode.replaceChild(newNode, lineNode);
            } else {
                lineNode.parentNode.replaceChild(newNode, lineNode);
            }

            // Restore cursor to saved position
            const range = document.createRange();
            const textNode = newNode.firstChild || newNode;

            try {
                if (textNode.nodeType === 3) {
                    // Restore to exact saved offset in new text node
                    const safeOffset = Math.min(savedOffset, textNode.length);
                    range.setStart(textNode, safeOffset);
                    range.collapse(true);
                } else {
                    // Fallback: place at end
                    range.selectNodeContents(textNode);
                    range.collapse(false);
                }
                selection.removeAllRanges();
                selection.addRange(range);
            } catch (e) {
                // Fallback: place at end of newNode
                range.selectNodeContents(newNode);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }

            saveCurrentNote();
            return true;
        }
    }

    return false;
}

let processing = false;

writingCanvas.addEventListener('keyup', (e) => {
    if (processing) return;

    if (e.key === ':' || e.key === ' ' || e.key === 'Enter') {
        processing = true;

        const lineNode = getCurrentLine();
        const wasProcessed = processLineFormatting(lineNode);

        if (wasProcessed) {
            showFormattingIndicator('Formatting applied');
        }

        processing = false;
    }
});

// Auto-save on input
writingCanvas.addEventListener('input', () => {
    saveCurrentNote();
});

// Update font display on cursor move
writingCanvas.addEventListener('click', () => {
    updateFontDisplay();
});

writingCanvas.addEventListener('keyup', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        updateFontDisplay();
    }
});

// Enter key handler for list continuation
writingCanvas.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        // Don't process if no active note
        if (!activeNoteId) return;

        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        let currentNode = range.startContainer;

        if (currentNode.nodeType === 3) { // Text node
            const textBefore = currentNode.textContent.substring(0, range.startOffset);

            // Check if line starts with bullet or number
            const bulletMatch = textBefore.match(/^(\s*)(•|\d+\.)\s+(.*)$/);

            if (bulletMatch) {
                const [, indent, marker, content] = bulletMatch;

                // If user pressed Enter on empty list item, remove it and exit list
                if (!content.trim()) {
                    e.preventDefault();

                    // Remove the empty bullet/number
                    currentNode.textContent = currentNode.textContent.substring(0, range.startOffset - (indent + marker).length - 1) +
                        currentNode.textContent.substring(range.startOffset);

                    // Insert newline
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

                // Continue list with next item
                e.preventDefault();

                let newMarker = marker;

                // If it's a number, increment it
                if (/^\d+\.$/.test(marker)) {
                    const num = parseInt(marker);
                    newMarker = `${num + 1}.`;
                }

                // Insert newline and new marker
                const newLine = document.createTextNode('\n' + indent + newMarker + ' ');
                range.insertNode(newLine);

                // Position cursor after new marker
                range.setStartAfter(newLine);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }
});

// --- KEYBOARD SHORTCUTS ---
document.addEventListener('keydown', (e) => {
    // Font selector shortcut
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        fontSelectorBtn.click();
    }

    // New note shortcut
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        addNoteBtn.click();
    }

    // Export shortcut
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        exportBtn.click();
    }

    // Pin note shortcut
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        togglePinNote();
    }

    // Escape key handling with hierarchy
    if (e.key === 'Escape') {
        // First close any open dropdowns
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
        
        // Then close modals in reverse order (LIFO - Last In First Out)
        if (modalStack.length > 0) {
            const modal = modalStack.pop();
            modal.classList.remove('show');
            e.preventDefault();
            return;
        }
        
        // If in focus mode, exit focus mode
        if (sidebar.classList.contains('hidden')) {
            toggleFocus();
            e.preventDefault();
        }
    }

    // Enter key in new note modal
    if (e.key === 'Enter' && newNoteModal.classList.contains('show')) {
        if (e.target.id === 'newNoteName') {
            e.preventDefault();
            document.getElementById('createNewNote').click();
        }
    }

    // Enter key in folder modal
    if (e.key === 'Enter' && manageFoldersModal.classList.contains('show')) {
        if (e.target.id === 'newFolderName') {
            e.preventDefault();
            document.getElementById('createFolderBtn').click();
        }
    }

    // Enter key in export modal for confirmation
    if (e.key === 'Enter' && exportModal.classList.contains('show') && !exportConfirmBtn.disabled) {
        e.preventDefault();
        exportConfirmBtn.click();
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

    // Set initial focus
    if (activeNoteId) {
        writingCanvas.focus();
    }
}

// Start the app
init();


styles.css 
/* --- GLOBAL SCROLLBAR HIDDEN --- */
* {
    scrollbar-width: none;
    -ms-overflow-style: none;
}

*::-webkit-scrollbar {
    display: none;
}

/* --- CSS VARIABLES --- */
:root {
    /* Dark Mode (Default) */
    --bg-canvas: #09090b;
    --bg-panel: #141415;
    --bg-glass: rgba(20, 20, 21, 0.85);
    --text-primary: #ffffff;
    --text-secondary: #888888;
    --border-color: #2a2a2a;
    --accent-color: #3b82f6;
    --hover-bg: #27272a;
    --grid-color: #1f1f22;

    /* Color Palette for Theme Compatibility */
    --color-red: #ef4444;
    --color-blue: #3b82f6;
    --color-green: #10b981;
    --color-yellow: #f59e0b;
    --color-purple: #8b5cf6;
    --color-pink: #ec4899;
    --color-orange: #f97316;
    --color-gray: #6b7280;
    --color-black: #000000;
    --color-white: #ffffff;

    /* Theme-aware colors */
    --theme-text: #ffffff;
    --theme-text-inverse: #000000;
    --theme-bg: #141415;
    --theme-border: #2a2a2a;

    /* Tooltip Specific */
    --tooltip-bg: #ffffff;
    --tooltip-text: #000000;
}

/* Light Mode */
[data-theme="light"] {
    --bg-canvas: #f2f4f7;
    --bg-panel: #ffffff;
    --bg-glass: rgba(255, 255, 255, 0.9);
    --text-primary: #101828;
    --text-secondary: #667085;
    --border-color: #eaecf0;
    --accent-color: #000000;
    --hover-bg: #f2f4f7;
    --grid-color: #e4e7ec;

    /* Theme-aware colors for light mode */
    --theme-text: #101828;
    --theme-text-inverse: #ffffff;
    --theme-bg: #ffffff;
    --theme-border: #eaecf0;

    /* Tooltip Specific */
    --tooltip-bg: #000000;
    --tooltip-text: #ffffff;

    /* Adjust formatting colors for better contrast */
    --color-red: #dc2626;
    --color-blue: #1d4ed8;
    --color-green: #059669;
    --color-yellow: #d97706;
    --color-purple: #7c3aed;
    --color-pink: #db2777;
    --color-orange: #ea580c;
    --color-gray: #4b5563;

    /* Ensure black/white are visible in light mode */
    --color-black: #101828;
    --color-white: #f8fafc;
}

/* Theme-aware text color classes */
.text-color-aware {
    color: var(--theme-text) !important;
}

.text-color-inverse {
    color: var(--theme-text-inverse) !important;
}

/* Theme compatibility for color classes */
[data-theme="light"] .text-white {
    color: var(--color-black) !important;
}

[data-theme="dark"] .text-black {
    color: var(--color-white) !important;
}

/* Enhanced theme-aware color classes */
.text-black,
[data-theme="dark"] .text-black {
    color: var(--color-white) !important;
}

.text-white,
[data-theme="light"] .text-white {
    color: var(--color-black) !important;
}

/* Dynamic color adjustment for all text */
[data-theme="light"] .writing-canvas *:not([class*="text-"]) {
    color: var(--color-black) !important;
}

[data-theme="dark"] .writing-canvas *:not([class*="text-"]) {
    color: var(--color-white) !important;
}

/* Ensure formatted text is visible */
[data-theme="light"] .writing-canvas .text-red {
    color: var(--color-red) !important;
}

[data-theme="dark"] .writing-canvas .text-red {
    color: var(--color-red) !important;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    outline: none;
}

body {
    background-color: var(--bg-canvas);
    color: var(--text-primary);
    font-family: 'Fredoka', sans-serif;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    display: flex;
    transition: background-color 0.4s, color 0.4s;
    background-image: radial-gradient(var(--grid-color) 1px, transparent 1px);
    background-size: 24px 24px;
}

/* --- 1. Sidebar --- */
.sidebar {
    width: 68px;
    height: 94vh;
    margin: 3vh 0 3vh 20px;
    background-color: var(--bg-panel);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 0;
    z-index: 100;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.logo {
    font-weight: 600;
    font-size: 28px;
    letter-spacing: -1px;
    margin-bottom: 30px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: white;
}

.logo i {
    font-size: 24px;
}

/* Tool Group */
.tool-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    align-items: center;
}

.divider {
    width: 24px;
    height: 1px;
    background-color: var(--border-color);
    margin: 20px 0;
}

/* Tool Buttons */
.tool-btn {
    position: relative;
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    font-size: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.tool-btn:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
}

.tool-btn.active {
    background-color: var(--accent-color);
    color: #ffffff !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Tooltip Styling */
.tool-btn[data-tooltip]::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%) translateX(10px);
    background-color: var(--tooltip-bg);
    color: var(--tooltip-text);
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    visibility: hidden;
    z-index: 200;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.tool-btn:hover::after {
    opacity: 1;
    visibility: visible;
    transform: translateY(-50%) translateX(18px);
}

.tool-btn[data-tooltip]::before {
    content: '';
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%) translateX(6px);
    border-width: 5px;
    border-style: solid;
    border-color: transparent var(--tooltip-bg) transparent transparent;
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s;
}

.tool-btn:hover::before {
    opacity: 1;
    visibility: visible;
    transform: translateY(-50%) translateX(8px);
}

/* Bottom Actions */
.bottom-actions {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
}

/* --- 2. Top Bar --- */
.top-bar-wrapper {
    position: absolute;
    top: 3vh;
    left: 108px;
    right: 20px;
    z-index: 40;
    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.glass-header {
    height: 64px;
    background: var(--bg-glass);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.05);
}

/* Chips */
.chips {
    display: flex;
    gap: 6px;
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.chips::-webkit-scrollbar {
    display: none;
}

.chip {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: 0.2s;
    white-space: nowrap;
    flex-shrink: 0;
}

.chip:hover {
    background-color: var(--hover-bg);
    color: var(--text-primary);
}

.chip.active {
    background-color: var(--text-primary);
    color: var(--bg-canvas);
}

/* Top Bar Actions */
.header-actions {
    display: flex;
    gap: 12px;
    padding-left: 20px;
    border-left: 1px solid var(--border-color);
    align-items: center;
}

/* Font Selector Button */
.font-selector-btn {
    min-width: 180px;
    height: 40px;
    border-radius: 10px;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    overflow: hidden;
}

.font-selector-btn:hover {
    border-color: var(--accent-color);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
    transform: translateY(-1px);
}

.font-selector-btn:active {
    transform: translateY(0);
}

.font-selector-btn i {
    font-size: 16px;
    transition: transform 0.3s ease;
}

.font-selector-btn.active i {
    transform: rotate(180deg);
}

/* Font Dropdown Menu */
.font-dropdown {
    position: absolute;
    top: 110%;
    right: 0;
    width: 220px;
    background: var(--bg-glass);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    padding: 8px;
    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px) scale(0.95);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 1000;
    max-height: 400px;
    overflow-y: auto;
}

.font-dropdown.active {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
}

.font-option {
    padding: 12px 16px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    margin: 4px 0;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid transparent;
}

.font-option:hover {
    background-color: var(--hover-bg);
    border-color: var(--border-color);
    transform: translateX(4px);
}

.font-option.active {
    background-color: var(--accent-color);
    color: white;
    border-color: var(--accent-color);
}

.font-option.active .check-icon {
    opacity: 1;
}

.check-icon {
    opacity: 0;
    transition: opacity 0.2s;
    font-size: 16px;
}

/* Font Preview Styling */
.font-option[data-font="Fredoka"] {
    font-family: 'Fredoka', sans-serif;
}

.font-option[data-font="Kalam"] {
    font-family: 'Kalam', cursive;
}

.font-option[data-font="Playpen Sans"] {
    font-family: 'Playpen Sans', cursive;
}

.font-option[data-font="Patrick Hand"] {
    font-family: 'Patrick Hand', cursive;
}

.font-option[data-font="Baloo 2"] {
    font-family: 'Baloo 2', cursive;
}

.font-option[data-font="Comic Neue"] {
    font-family: 'Comic Neue', cursive;
}

.font-option[data-font="Comic Sans MS"] {
    font-family: 'Comic Sans MS', cursive, sans-serif;
}

.current-font-preview {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    text-align: left;
}

/* Other action buttons */
.action-btn {
    background: transparent;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);
    font-size: 18px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.action-btn:hover {
    background-color: var(--hover-bg);
    transform: translateY(-1px);
}

/* --- 3. Main Workspace --- */
.workspace {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-left: 0px;
    height: 100vh;
    padding: 90px 20px 10px 20px;
}

.writing-canvas {
    flex: 1;
    border-radius: 16px;
    padding: 24px;
    overflow-y: auto;
    outline: none;
    font-size: 18px;
    line-height: 1.6;
    transition: all 0.3s ease;
    font-family: 'Fredoka', sans-serif;
    min-height: 400px;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    word-break: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
    max-width: 100%;
    color: var(--text-primary) !important;
}

/* Ensure all text in writing canvas has proper color */
.writing-canvas,
.writing-canvas * {
    color: inherit !important;
}

/* Theme-aware text color inheritance */
[data-theme="light"] .writing-canvas {
    color: var(--color-black) !important;
}

[data-theme="dark"] .writing-canvas {
    color: var(--color-white) !important;
}

/* Ensure all children respect width */
.writing-canvas * {
    max-width: 100% !important;
    box-sizing: border-box !important;
}

.writing-canvas:empty:before {
    content: "Start typing here...";
    color: var(--text-secondary);
    font-style: italic;
    opacity: 0.6;
    white-space: pre-line;
}

/* --- Formatting Styles --- */
.text-red {
    color: var(--color-red) !important;
}

.text-blue {
    color: var(--color-blue) !important;
}

.text-green {
    color: var(--color-green) !important;
}

.text-yellow {
    color: var(--color-yellow) !important;
}

.text-purple {
    color: var(--color-purple) !important;
}

.text-pink {
    color: var(--color-pink) !important;
}

.text-orange {
    color: var(--color-orange) !important;
}

.text-gray {
    color: var(--color-gray) !important;
}

.text-black {
    color: var(--text-primary) !important;
}

.text-white {
    color: var(--text-primary) !important;
}

.text-bold {
    font-weight: bold;
}

.text-italic {
    font-style: italic;
}

.text-underline {
    text-decoration: underline;
}

.text-strike {
    text-decoration: line-through;
}

.text-left {
    text-align: left;
}

.text-center {
    text-align: center;
    display: block;
}

.text-right {
    text-align: right;
    display: block;
}

.heading-main {
    font-size: 32px;
    font-weight: bold;
    margin: 24px 0 16px 0;
    display: block;
    line-height: 1.3;
}

.heading-sub {
    font-size: 24px;
    font-weight: bold;
    margin: 20px 0 12px 0;
    display: block;
    line-height: 1.4;
}

.code-block {
    font-family: 'Courier New', monospace;
    background: rgba(0, 0, 0, 0.1);
    padding: 16px;
    border-radius: 8px;
    border-left: 4px solid var(--accent-color);
    margin: 16px 0;
    white-space: pre-wrap;
    word-break: break-all;
    display: block;
    line-height: 1.5;
}

/* Horizontal Rule Styles */
.horizontal-line {
    display: block;
    width: 100%;
    height: 1px;
    background: var(--border-color);
    margin: 24px 0;
    border: none;
}

.horizontal-line.thick {
    height: 2px;
}

.horizontal-line.dashed {
    background: none;
    border-top: 2px dashed var(--border-color);
}

/* Better spacing for formatted lines */
.text-center,
.text-left,
.text-right {
    margin: 8px 0;
    line-height: 1.6;
}

/* Chip Styles */
.chip-tag {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    margin: 0 4px;
    user-select: none;
    transition: all 0.2s;
}

.chip-red {
    background-color: rgba(239, 68, 68, 0.15);
    color: var(--color-red) !important;
    border: 1px solid rgba(239, 68, 68, 0.3);
}

.chip-blue {
    background-color: rgba(59, 130, 246, 0.15);
    color: var(--color-blue) !important;
    border: 1px solid rgba(59, 130, 246, 0.3);
}

.chip-green {
    background-color: rgba(16, 185, 129, 0.15);
    color: var(--color-green) !important;
    border: 1px solid rgba(16, 185, 129, 0.3);
}

.chip-yellow {
    background-color: rgba(245, 158, 11, 0.15);
    color: var(--color-yellow) !important;
    border: 1px solid rgba(245, 158, 11, 0.3);
}

.chip-purple {
    background-color: rgba(139, 92, 246, 0.15);
    color: var(--color-purple) !important;
    border: 1px solid rgba(139, 92, 246, 0.3);
}

.chip-pink {
    background-color: rgba(236, 72, 153, 0.15);
    color: var(--color-pink) !important;
    border: 1px solid rgba(236, 72, 153, 0.3);
}

/* --- Formatting Indicator (Toast) --- */
.formatting-indicator {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: var(--bg-glass);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    color: var(--text-primary);
    padding: 12px 24px;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 500;
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 10000;
    border: 1px solid var(--border-color);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.formatting-indicator.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}

/* --- Dropdown Menus --- */
.dropdown-menu {
    position: absolute;
    left: 80px;
    top: 0;
    background: var(--bg-glass);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    padding: 8px;
    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
    opacity: 0;
    visibility: hidden;
    transform: translateX(-10px) scale(0.95);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 1000;
    min-width: 200px;
}

.dropdown-menu.active {
    opacity: 1;
    visibility: visible;
    transform: translateX(0) scale(1);
}

.dropdown-item {
    padding: 12px 16px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    margin: 4px 0;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid transparent;
}

.dropdown-item:hover {
    background-color: var(--hover-bg);
    border-color: var(--border-color);
}

.dropdown-item i {
    font-size: 18px;
}

/* Font Marker Span */
.font-marker,
.active-font-span,
.cursor-font-marker {
    display: inline;
}

/* Bullet List - Inline, No Extra Spacing */
.bullet-list {
    display: inline;
    padding: 0;
    margin: 0;
    list-style-position: inside;
}

.bullet-list li {
    display: inline;
    margin: 0;
    padding: 0;
}

/* Custom Select Dropdown */
.custom-select {
    position: relative;
    width: 100%;
}

.select-trigger {
    width: 100%;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-panel);
    color: var(--text-primary);
    font-family: 'Fredoka', sans-serif;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.2s;
}

.select-trigger:hover {
    border-color: var(--accent-color);
}

.select-trigger i {
    transition: transform 0.3s;
}

.custom-select.active .select-trigger i {
    transform: rotate(180deg);
}

.select-options {
    position: absolute;
    top: calc(100% + 5px);
    left: 0;
    width: 100%;
    background: var(--bg-glass);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 8px;
    max-height: 200px;
    overflow-y: auto;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 1000;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.custom-select.active .select-options {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.select-option {
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    margin: 2px 0;
}

.select-option:hover {
    background: var(--hover-bg);
}

.select-option.selected {
    background: var(--accent-color);
    color: white;
}

.select-options::-webkit-scrollbar {
    width: 6px;
}

/* --- Share Modal Styling --- */
.share-box {
    max-width: 450px !important;
    text-align: center;
}

.share-subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 24px;
    margin-top: -10px;
}

.share-toggle-wrapper {
    display: flex;
    justify-content: center;
    margin-bottom: 30px;
}

.share-toggle {
    background: var(--bg-canvas);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    display: flex;
    position: relative;
    padding: 4px;
    cursor: pointer;
    width: 200px;
    height: 48px;
}

.toggle-option {
    flex: 1;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    transition: color 0.3s;
}

.toggle-option.active {
    color: var(--bg-canvas);
}

[data-theme="dark"] .toggle-option.active {
    color: #ffffff;
}

[data-theme="light"] .toggle-option.active {
    color: #ffffff;
}

.toggle-slider {
    position: absolute;
    top: 4px;
    left: 4px;
    width: calc(50% - 4px);
    height: calc(100% - 8px);
    background: var(--text-primary);
    border-radius: 8px;
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 1;
}

/* Toggle Logic in CSS Class */
.share-toggle.public .toggle-slider {
    transform: translateX(100%);
    background-color: var(--color-green);
}

.share-toggle.private .toggle-slider {
    transform: translateX(0);
    background-color: var(--text-secondary);
}

.share-link-section {
    text-align: left;
    display: none;
    animation: fadeIn 0.3s ease;
}

.share-link-section.visible {
    display: block;
}

.link-input-wrapper {
    display: flex;
    gap: 8px;
    margin-top: 8px;
}

.link-input-wrapper input {
    flex: 1;
    background: var(--bg-canvas);
    border: 1px solid var(--border-color);
    padding: 10px 12px;
    border-radius: 8px;
    color: var(--text-primary);
    font-family: 'Fredoka', sans-serif;
    font-size: 13px;
    cursor: text;
}

.copy-btn {
    width: 42px;
    height: 42px;
    border: 1px solid var(--border-color);
    background: var(--bg-panel);
    border-radius: 8px;
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    transition: all 0.2s;
}

.copy-btn:hover {
    border-color: var(--accent-color);
    color: var(--accent-color);
}

.share-info {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.share-private-msg {
    display: none;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 20px 0;
    color: var(--text-secondary);
    animation: fadeIn 0.3s ease;
}

.share-private-msg.visible {
    display: flex;
}

.share-private-msg i {
    font-size: 32px;
    opacity: 0.5;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(5px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.select-options::-webkit-scrollbar-track {
    background: transparent;
}

.select-options::-webkit-scrollbar-thumb {
    background: var(--text-secondary);
    border-radius: 3px;
}

.select-options::-webkit-scrollbar-thumb:hover {
    background: var(--text-primary);
}

/* --- 4. Focus & Restore --- */
.sidebar.hidden {
    transform: translateX(-180%);
}

.top-bar-wrapper.hidden {
    transform: translateY(-200%);
}

/* Focus mode - Fullscreen workspace */
.workspace.focus-mode {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 5px;
    z-index: 100;
}

.workspace.focus-mode .writing-canvas {
    width: 100%;
    height: 100%;
    margin: 0;
    border-radius: 12px;
}

.restore-pill {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: var(--text-primary);
    color: var(--bg-canvas);
    padding: 12px 24px;
    border-radius: 100px;
    display: flex;
    gap: 10px;
    align-items: center;
    font-weight: 500;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    cursor: pointer;
    z-index: 200;
    opacity: 0;
    visibility: hidden;
    transform: scale(0.8);
    transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.restore-pill.visible {
    opacity: 1;
    visibility: visible;
    transform: scale(1);
}

.restore-pill:hover {
    transform: scale(1.05);
    box-shadow: 0 12px 50px rgba(0, 0, 0, 0.4);
}

/* --- Custom Confirmation Modal --- */
.confirm-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
}

.confirm-modal.show {
    opacity: 1;
    visibility: visible;
}

.confirm-box {
    background: var(--bg-glass);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 32px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    transform: scale(0.9) translateY(20px);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.confirm-modal.show .confirm-box {
    transform: scale(1) translateY(0);
}

.confirm-box h3 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text-primary);
}

.confirm-box p {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 24px;
    line-height: 1.5;
}

.confirm-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.confirm-btn {
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'Fredoka', sans-serif;
}

.confirm-btn.cancel {
    background: var(--hover-bg);
    color: var(--text-primary);
}

.confirm-btn.cancel:hover {
    background: var(--border-color);
}

.confirm-btn.delete {
    background: #ef4444;
    color: white;
}

.confirm-btn.delete:hover {
    background: #dc2626;
    transform: scale(1.05);
}

/* Form Modal Styles */
.form-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
}

.form-modal.show {
    opacity: 1;
    visibility: visible;
}

.form-box {
    background: var(--bg-glass);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 32px;
    max-width: 450px;
    min-width: 400px;
    max-height: 600px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    transform: scale(0.9) translateY(20px);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
}

.form-modal.show .form-box {
    transform: scale(1) translateY(0);
}

.form-box h3 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 20px;
    color: var(--text-primary);
    flex-shrink: 0;
}

.form-group {
    margin-bottom: 20px;
    flex-shrink: 0;
}

.form-group label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.form-group input,
.form-group select {
    width: 100%;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-panel);
    color: var(--text-primary);
    font-family: 'Fredoka', sans-serif;
    font-size: 14px;
    transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
    flex-shrink: 0;
}

.form-btn {
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'Fredoka', sans-serif;
}

.form-btn.secondary {
    background: var(--hover-bg);
    color: var(--text-primary);
}

.form-btn.secondary:hover {
    background: var(--border-color);
}

.form-btn.primary {
    background: var(--accent-color);
    color: white;
}

.form-btn.primary:hover {
    background: #2563eb;
    transform: scale(1.05);
}

.folder-list {
    max-height: 280px;
    min-height: 200px;
    overflow-y: auto;
    margin-top: 20px;
    flex: 1;
    padding-right: 4px;
}

.folder-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 8px;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    transition: all 0.2s;
}

.folder-item:hover {
    background: var(--hover-bg);
}

.folder-item.active {
    background: var(--accent-color);
    color: white;
    border-color: var(--accent-color);
}

.folder-name {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
}

.folder-actions {
    display: flex;
    gap: 8px;
}

.folder-action-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    transition: all 0.2s;
}

.folder-action-btn:hover {
    color: var(--text-primary);
    transform: scale(1.1);
}

.folder-item.active .folder-action-btn {
    color: rgba(255, 255, 255, 0.8);
}

.folder-item.active .folder-action-btn:hover {
    color: white;
}

/* --- Export Modal Styling --- */
.export-box {
    max-width: 500px !important;
    min-width: 450px !important;
}

.export-options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin: 24px 0;
}

.export-card {
    background: var(--bg-panel);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.export-card:hover {
    transform: translateY(-4px);
    border-color: var(--accent-color);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.export-card.selected {
    border-color: var(--accent-color);
    background: rgba(59, 130, 246, 0.1);
}

.export-card-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin-bottom: 8px;
}

.export-card[data-format="pdf"] .export-card-icon {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
}

.export-card[data-format="markdown"] .export-card-icon {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
}

.export-card[data-format="text"] .export-card-icon {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
}

.export-card h4 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
}

.export-card p {
    font-size: 12px;
    color: var(--text-secondary);
    margin: 0;
}

.pdf-options {
    border-top: 1px solid var(--border-color);
    display: block !important;
    animation: fadeIn 0.3s ease;
}

/* Pill-shaped theme toggle for PDF */
.theme-toggle-pill {
    background: var(--bg-canvas);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    display: flex;
    position: relative;
    padding: 4px;
    cursor: pointer;
    width: 220px;
    height: 52px;
    margin-top: 8px;
}

.theme-pill-option {
    flex: 1;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    transition: color 0.3s;
    gap: 8px;
    border-radius: 20px;
}

.theme-pill-option.active {
    color: var(--bg-canvas);
}

.theme-pill-slider {
    position: absolute;
    top: 4px;
    left: 4px;
    width: calc(50% - 4px);
    height: calc(100% - 8px);
    background: var(--text-primary);
    border-radius: 20px;
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 1;
}

.theme-toggle-pill[data-theme="light"] .theme-pill-slider {
    transform: translateX(100%);
}

.theme-pill-option i {
    font-size: 18px;
}

.toggle-switch {
    position: relative;
    width: 50px;
    height: 26px;
    margin-top: 8px;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-switch .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--border-color);
    transition: .4s;
    border-radius: 34px;
}

.toggle-switch .toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
}

.toggle-switch input:checked+.toggle-slider {
    background-color: var(--accent-color);
}

.toggle-switch input:checked+.toggle-slider:before {
    transform: translateX(24px);
}

.export-actions {
    margin-top: 24px;
}

/* Scrollbar Styling */
.font-dropdown::-webkit-scrollbar,
.dropdown-menu::-webkit-scrollbar,
.folder-list::-webkit-scrollbar {
    width: 6px;
}

.font-dropdown::-webkit-scrollbar-track,
.dropdown-menu::-webkit-scrollbar-track,
.folder-list::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 3px;
}

.font-dropdown::-webkit-scrollbar-thumb,
.dropdown-menu::-webkit-scrollbar-thumb,
.folder-list::-webkit-scrollbar-thumb {
    background: var(--text-secondary);
    border-radius: 3px;
}

.font-dropdown::-webkit-scrollbar-thumb:hover,
.dropdown-menu::-webkit-scrollbar-thumb:hover,
.folder-list::-webkit-scrollbar-thumb:hover {
    background: var(--text-primary);
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .workspace {
        margin-left: 0;
        padding: 100px 20px 20px 20px;
    }

    .sidebar.hidden+.workspace {
        margin-left: 0;
    }

    .font-selector-btn {
        min-width: 150px;
    }

    .export-options {
        grid-template-columns: 1fr;
    }

    .export-box {
        min-width: 300px !important;
    }

    .theme-toggle-pill {
        width: 180px;
        height: 46px;
    }
}

.hidden {
    display: none;
}

.center {
    display: flex;
    flex-direction: column;
    align-items: center;
}

/* --- Empty Folder Message Styles --- */
.writing-canvas.empty-folder-message {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: var(--bg-panel);
    cursor: default;
    max-width: 1300px;
    width: 100%;
}

.empty-folder-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 40px;
    max-width: 400px;
    margin: 0 auto;
}

.empty-folder-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(59, 130, 246, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: var(--accent-color);
}

.empty-folder-message h3 {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.empty-folder-message p {
    font-size: 16px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
}

.create-note-btn {
    background: var(--accent-color);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;
    margin-top: 10px;
    font-family: fredoka;
}

.create-note-btn:hover {
    background: #2563eb;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* --- Disabled Button Styles --- */
.tool-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
}

.tool-btn.disabled:hover {
    background-color: transparent;
    color: var(--text-secondary);
}

/* --- Empty Chip Styles --- */
.chip.empty-chip {
    opacity: 0.6;
    cursor: default;
    background: transparent;
    border: 1px dashed var(--border-color);
}

.chip.empty-chip:hover {
    background: transparent;
    color: var(--text-secondary);
}

.abc {
    padding: 20px;
}

/* --- Enhanced Theme Compatibility for Inline Styles --- */
[data-theme="light"] .writing-canvas span[style*="color"] {
    /* For inline styles in light mode, ensure they're visible */
    filter: brightness(0.8);
}

[data-theme="dark"] .writing-canvas span[style*="color"] {
    /* For inline styles in dark mode, ensure they're visible */
    filter: brightness(1.2);
}

/* Add to existing styles.css - Pin button styling */
.action-btn.pinned {
    color: var(--color-yellow) !important;
    background-color: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.3);
}

.action-btn.pinned:hover {
    background-color: rgba(245, 158, 11, 0.25);
}

/* Enhanced color classes for better theme compatibility */
.color-preserve {
    color: inherit !important;
}

/* For inline color styles to ensure they're preserved */
.writing-canvas span[style*="color"],
.writing-canvas div[style*="color"] {
    filter: none !important;
}

/* Ensure color styles are preserved in both themes */
[data-theme="light"] .writing-canvas span[style*="color"] {
    filter: none !important;
}

[data-theme="dark"] .writing-canvas span[style*="color"] {
    filter: none !important;
}

.gap {
    margin-top: 5px;
    margin-right: 5px;
}