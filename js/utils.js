/**
 * js/utils.js
 * Shared utility functions
 */

/**
 * Escapes HTML special characters in a string.
 * @param {string} unsafe The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe.replace(/[&<>"]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

// Attach to window for non-module script compatibility if needed
if (typeof window !== 'undefined') {
    window.escapeHtml = escapeHtml;
}
