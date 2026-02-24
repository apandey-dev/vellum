/**
 * app-editor.js
 * Entry point for the Vellum Editor.
 * Orchestrates modules and handles high-level events.
 */

import { writingCanvas, saveCurrentNote } from './app-core.js';
import { EditorUI } from './js/editor-ui.js';
import { TextareaEnhancer } from './js/textarea-enhancer.js';

// Minimal font mapping
const fontMap = {
    'Fredoka': "'Fredoka', sans-serif",
    'Kalam': "'Kalam', cursive",
    'Playpen Sans': "'Playpen Sans', cursive",
    'Patrick Hand': "'Patrick Hand', cursive",
    'Baloo 2': "'Baloo 2', cursive",
    'Comic Neue': "'Comic Neue', cursive",
    'Comic Sans MS': "'Comic Sans MS', cursive, sans-serif"
};

/**
 * UI Updates
 */
function updateFontDisplay() {
    const currentFont = localStorage.getItem('vellum_current_font') || 'Fredoka';
    const fontValue = fontMap[currentFont];

    if (writingCanvas) {
        writingCanvas.style.fontFamily = fontValue;
    }

    const previewCanvas = document.getElementById('previewCanvas');
    if (previewCanvas) {
        previewCanvas.style.fontFamily = fontValue;
    }

    const currentFontSpan = document.getElementById('currentFont');
    if (currentFontSpan) {
        currentFontSpan.textContent = currentFont;
    }

    const fontOptions = document.querySelectorAll('.font-option');
    fontOptions.forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.font === currentFont) opt.classList.add('active');
    });
}

/**
 * Event Listeners
 */
function attachEventListeners() {
    // Selection/Focus changes
    writingCanvas.addEventListener('click', updateFontDisplay);
    writingCanvas.addEventListener('keyup', updateFontDisplay);
    writingCanvas.addEventListener('focus', updateFontDisplay);

    // Font Selector UI
    const fontSelectorBtn = document.getElementById('fontSelectorBtn');
    const fontDropdown = document.getElementById('fontDropdown');
    const fontOptions = document.querySelectorAll('.font-option');

    if (fontSelectorBtn) {
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
        }
    });

    fontDropdown.addEventListener('click', (e) => {
        const option = e.target.closest('.font-option');
        if (option) {
            const selectedFont = option.dataset.font;
            localStorage.setItem('vellum_current_font', selectedFont);
            updateFontDisplay();
            fontSelectorBtn.classList.remove('active');
            fontDropdown.classList.remove('active');
            saveCurrentNote();
        }
    });
}

/**
 * Initialization
 */
function initEditor() {
    updateFontDisplay();
    attachEventListeners();

    // Initialize UI and Textarea features
    EditorUI.init();
    TextareaEnhancer.init(writingCanvas);
}

// Start the editor
initEditor();
