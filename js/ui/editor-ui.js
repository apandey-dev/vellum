/**
 * editor-ui.js
 * Manages the split-view UI, scroll synchronization, and theme-aware styling.
 */

import { MarkdownEngine } from './markdown-engine.js';
import { writingCanvas } from '/js/app.js';

export const EditorUI = (function () {
    let editorPane, previewPane, resizer, previewCanvas;
    let editorOnlyBtn, splitViewBtn, previewOnlyBtn;
    let renderTimeout;

    /**
     * Updates the preview with debounced rendering for performance
     */
    function updatePreview() {
        if (!previewCanvas) return;
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
            editorPane.style.flex = '1 1 100%';
        } else if (mode === 'preview') {
            editorPane.classList.add('hidden');
            resizer.classList.add('hidden');
            previewOnlyBtn.classList.add('active');
            previewPane.style.flex = '1 1 100%';
        } else {
            splitViewBtn.classList.add('active');
            editorPane.style.flex = '1 1 50%';
            previewPane.style.flex = '1 1 50%';
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
            document.body.classList.add('resizing');
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        function handleMouseMove(e) {
            if (!isResizing) return;

            const container = editorPane.parentElement;
            const containerWidth = container.clientWidth;
            const mouseX = e.clientX - container.getBoundingClientRect().left;

            // Boundary checks
            const minWidth = 150;
            if (mouseX < minWidth || mouseX > containerWidth - minWidth) return;

            const editorWidthPercent = (mouseX / containerWidth) * 100;
            const previewWidthPercent = 100 - editorWidthPercent;

            editorPane.style.flex = `0 0 ${editorWidthPercent}%`;
            previewPane.style.flex = `0 0 ${previewWidthPercent}%`;
        }

        function handleMouseUp() {
            if (!isResizing) return;
            isResizing = false;
            document.body.style.cursor = 'default';
            document.body.classList.remove('resizing');
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
            if (lightLink) lightLink.disabled = true;
            if (darkLink) darkLink.disabled = false;
        } else {
            if (lightLink) lightLink.disabled = false;
            if (darkLink) darkLink.disabled = true;
        }
    }

    /**
     * Initialize UI features
     */
    function init() {
        editorPane = document.getElementById('editorPane');
        previewPane = document.getElementById('previewPane');
        resizer = document.getElementById('resizer');
        previewCanvas = document.getElementById('previewCanvas');
        editorOnlyBtn = document.getElementById('editorOnlyBtn');
        splitViewBtn = document.getElementById('splitViewBtn');
        previewOnlyBtn = document.getElementById('previewOnlyBtn');

        if (!writingCanvas) return;

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

        // Initial render
        updatePreview();
    }

    return {
        init,
        updatePreview
    };
})();
