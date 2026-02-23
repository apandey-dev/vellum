/**
 * editor-ui.js
 * Manages the split-view UI, scroll synchronization, and theme-aware styling.
 */

import { MarkdownEngine } from './markdown-engine.js';
import { writingCanvas } from '../app-core.js';

export const EditorUI = (function() {
    const editorPane = document.getElementById('editorPane');
    const previewPane = document.getElementById('previewPane');
    const resizer = document.getElementById('resizer');
    const previewCanvas = document.getElementById('previewCanvas');
    const editorOnlyBtn = document.getElementById('editorOnlyBtn');
    const splitViewBtn = document.getElementById('splitViewBtn');
    const previewOnlyBtn = document.getElementById('previewOnlyBtn');

    let renderTimeout;

    /**
     * Updates the preview with debounced rendering for performance
     */
    function updatePreview() {
        clearTimeout(renderTimeout);
        renderTimeout = setTimeout(() => {
            const content = writingCanvas.value;
            previewCanvas.innerHTML = MarkdownEngine.render(content);
        }, 50);
    }

    /**
     * Synchronizes scrolling between editor and preview
     */
    function setupScrollSync() {
        let isSyncingEditor = false;
        let isSyncingPreview = false;

        writingCanvas.onscroll = () => {
            if (isSyncingPreview) {
                isSyncingPreview = false;
                return;
            }
            isSyncingEditor = true;
            const scrollPercentage = writingCanvas.scrollTop / (writingCanvas.scrollHeight - writingCanvas.clientHeight);
            previewCanvas.scrollTop = scrollPercentage * (previewCanvas.scrollHeight - previewCanvas.clientHeight);
        };

        previewCanvas.onscroll = () => {
            if (isSyncingEditor) {
                isSyncingEditor = false;
                return;
            }
            isSyncingPreview = true;
            const scrollPercentage = previewCanvas.scrollTop / (previewCanvas.scrollHeight - previewCanvas.clientHeight);
            writingCanvas.scrollTop = scrollPercentage * (writingCanvas.scrollHeight - writingCanvas.clientHeight);
        };
    }

    /**
     * View mode switching
     */
    function setViewMode(mode) {
        editorPane.classList.remove('hidden');
        previewPane.classList.remove('hidden');
        resizer.classList.remove('hidden');

        editorOnlyBtn.classList.remove('active');
        splitViewBtn.classList.remove('active');
        previewOnlyBtn.classList.remove('active');

        if (mode === 'editor') {
            previewPane.classList.add('hidden');
            resizer.classList.add('hidden');
            editorOnlyBtn.classList.add('active');
            editorPane.style.flex = '1';
        } else if (mode === 'preview') {
            editorPane.classList.add('hidden');
            resizer.classList.add('hidden');
            previewOnlyBtn.classList.add('active');
            previewPane.style.flex = '1';
        } else {
            splitViewBtn.classList.add('active');
            // Reset to default split if it was hidden
            if (!editorPane.style.flex) editorPane.style.flex = '1';
            if (!previewPane.style.flex) previewPane.style.flex = '1';
        }
    }

    /**
     * Resizer Logic
     */
    function initResizer() {
        let isResizing = false;

        resizer.onmousedown = (e) => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        function handleMouseMove(e) {
            if (!isResizing) return;

            const containerWidth = editorPane.parentElement.clientWidth;
            const mouseX = e.clientX - editorPane.parentElement.getBoundingClientRect().left;

            // Boundary checks
            if (mouseX < 100 || mouseX > containerWidth - 100) return;

            const editorWidthPercent = (mouseX / containerWidth) * 100;
            const previewWidthPercent = 100 - editorWidthPercent;

            editorPane.style.flex = `0 0 ${editorWidthPercent}%`;
            previewPane.style.flex = `0 0 ${previewWidthPercent}%`;
        }

        function handleMouseUp() {
            isResizing = false;
            document.body.style.cursor = 'default';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
    }

    /**
     * Switches Highlight.js theme based on current app theme
     */
    function updateHljsTheme() {
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        const lightLink = document.getElementById('hljs-light');
        const darkLink = document.getElementById('hljs-dark');

        if (theme === 'dark') {
            lightLink.disabled = true;
            darkLink.disabled = false;
        } else {
            lightLink.disabled = false;
            darkLink.disabled = true;
        }
    }

    /**
     * Initialize UI features
     */
    function init() {
        writingCanvas.addEventListener('input', updatePreview);
        setupScrollSync();
        updateHljsTheme();
        initResizer();

        // View mode listeners
        if (editorOnlyBtn) editorOnlyBtn.onclick = () => setViewMode('editor');
        if (splitViewBtn) splitViewBtn.onclick = () => setViewMode('split');
        if (previewOnlyBtn) previewOnlyBtn.onclick = () => setViewMode('preview');

        // Listen for theme changes (triggered by themeToggle in app-core.js)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    updateHljsTheme();
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
    }

    return {
        init,
        updatePreview
    };
})();
