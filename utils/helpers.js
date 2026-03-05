// js/utils.js

/**
 * Escapes HTML to prevent XSS
 * @param {string} unsafe
 * @returns {string}
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

// Unsafe HTML tags — anything that can run scripts or load remote resources
const BLOCKED_TAGS = new Set(['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta', 'style']);

// Attribute names that can execute code or load external content
const BLOCKED_ATTRS = /^(on\w+|src\s*=\s*["']?javascript|href\s*=\s*["']?javascript|action|formaction|data-)/i;

/**
 * Sanitizes HTML output from the markdown renderer to prevent XSS.
 * Uses a DOMParser sandbox — no scripts execute during parsing.
 *
 * @param {string} htmlString
 * @returns {string} sanitized HTML safe to set as innerHTML
 */
export function sanitizeHtml(htmlString) {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
    const toRemove = [];

    let node = walker.nextNode();
    while (node) {
        if (BLOCKED_TAGS.has(node.tagName.toLowerCase())) {
            toRemove.push(node);
        } else {
            // Strip forbidden attributes
            for (const attr of Array.from(node.attributes)) {
                if (BLOCKED_ATTRS.test(attr.name) || BLOCKED_ATTRS.test(attr.value)) {
                    node.removeAttribute(attr.name);
                }
            }
        }
        node = walker.nextNode();
    }

    for (const el of toRemove) el.remove();
    return doc.body.innerHTML;
}

/**
 * Toast Notification System
 * @param {string} message
 * @param {'success' | 'error' | 'warning' | 'info'} type
 */
export function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove toast after animation
    setTimeout(() => {
        toast.remove();
        if (container.childNodes.length === 0) {
            container.remove();
        }
    }, 4000);
}
