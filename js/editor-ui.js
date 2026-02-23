/**
 * editor-ui.js
 * Manages the split-view UI, scroll synchronization, and theme-aware styling.
 */

import { MarkdownEngine } from './markdown-engine.js';
import { writingCanvas } from '../app-core.js';

export const EditorUI = (function() {
    const previewCanvas = document.getElementById('previewCanvas');
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
