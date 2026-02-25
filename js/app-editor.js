/**
 * js/app-editor.js
 * Entry point for the Vellum Editor UI features.
 */

import { writingCanvas, saveCurrentNote } from './core.js';
import { EditorUI } from './editor-ui.js';
import { TextareaEnhancer } from './textarea-enhancer.js';

const fontMap = {
    'Fredoka': "'Fredoka', sans-serif",
    'Kalam': "'Kalam', cursive",
    'Playpen Sans': "'Playpen Sans', cursive",
    'Patrick Hand': "'Patrick Hand', cursive",
    'Baloo 2': "'Baloo 2', cursive",
    'Comic Neue': "'Comic Neue', cursive",
    'Comic Sans MS': "'Comic Sans MS', cursive, sans-serif"
};

function updateFontDisplay() {
    const currentFont = localStorage.getItem('vellum_current_font') || 'Fredoka';
    const fontValue = fontMap[currentFont];
    if (writingCanvas) writingCanvas.style.fontFamily = fontValue;
    const previewCanvas = document.getElementById('previewCanvas');
    if (previewCanvas) previewCanvas.style.fontFamily = fontValue;
    const currentFontSpan = document.getElementById('currentFont');
    if (currentFontSpan) currentFontSpan.textContent = currentFont;
    document.querySelectorAll('.font-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.font === currentFont);
    });
}

function attachEventListeners() {
    writingCanvas.addEventListener('click', updateFontDisplay);
    writingCanvas.addEventListener('keyup', updateFontDisplay);
    writingCanvas.addEventListener('focus', updateFontDisplay);

    const fontSelectorBtn = document.getElementById('fontSelectorBtn');
    const fontDropdown = document.getElementById('fontDropdown');

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

    fontDropdown?.addEventListener('click', (e) => {
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

function initEditor() {
    updateFontDisplay();
    attachEventListeners();
    EditorUI.init();
    TextareaEnhancer.init(writingCanvas);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initEditor);
else initEditor();
