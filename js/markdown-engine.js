/**
 * markdown-engine.js
 * Professional Markdown parsing engine with custom plugins and security sanitization.
 */

export const MarkdownEngine = (function() {
    let md;

    /**
     * Custom markdown-it plugin to support [text]{color} syntax.
     * Replaces [text]{color} with <span style="color: color">text</span>
     */
    function colorPlugin(md) {
        md.inline.ruler.push('custom_color', (state, silent) => {
            const src = state.src;
            const pos = state.pos;

            // Check if it starts with [
            if (src.charCodeAt(pos) !== 0x5B /* [ */) return false;

            // Find matching ]
            let labelStart = pos + 1;
            let labelEnd = -1;
            let level = 1;
            for (let i = labelStart; i < src.length; i++) {
                if (src[i] === '[') level++;
                else if (src[i] === ']') {
                    level--;
                    if (level === 0) {
                        labelEnd = i;
                        break;
                    }
                }
            }

            if (labelEnd === -1) return false;

            // Check for following {
            let searchPos = labelEnd + 1;
            // Skip optional whitespace
            while (searchPos < src.length && /\s/.test(src[searchPos])) searchPos++;

            if (searchPos >= src.length || src.charCodeAt(searchPos) !== 0x7B /* { */) return false;

            // Find matching }
            let colorStart = searchPos + 1;
            let colorEnd = src.indexOf('}', colorStart);
            if (colorEnd === -1) return false;

            if (!silent) {
                const colorValue = src.slice(colorStart, colorEnd).trim();
                const content = src.slice(labelStart, labelEnd);

                const tokenOpen = state.push('custom_color_open', 'span', 1);
                tokenOpen.attrs = [['style', `color: ${colorValue}`]];

                // Parse content inside brackets as inline markdown
                state.md.inline.parse(content, state.md, state.env, state.tokens);

                state.push('custom_color_close', 'span', -1);
            }

            state.pos = colorEnd + 1;
            return true;
        });
    }

    /**
     * Initialize markdown-it with optimal settings
     */
    function init() {
        if (!window.markdownit) {
            console.error('markdown-it library not found');
            return;
        }

        md = window.markdownit({
            html: true,         // Allow HTML tags
            linkify: true,      // Autoconvert URL-like text to links
            typographer: true,  // Enable smart quotes and other substitutions
            highlight: function (str, lang) {
                if (lang && window.hljs && window.hljs.getLanguage(lang)) {
                    try {
                        return '<pre class="hljs"><code>' +
                               window.hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                               '</code></pre>';
                    } catch (__) {}
                }
                return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
            }
        });

        // Add custom color plugin
        md.use(colorPlugin);
    }

    /**
     * Renders markdown string to sanitized HTML
     * @param {string} text
     * @returns {string}
     */
    function render(text) {
        if (!md) init();
        if (!text) return '';

        const rawHtml = md.render(text);

        // Use DOMPurify for security, allowing style attribute for our custom colors
        return window.DOMPurify.sanitize(rawHtml, {
            ALLOWED_ATTR: ['style', 'href', 'src', 'alt', 'title', 'class', 'target'],
            FORBID_ATTR: ['onerror', 'onclick', 'onmouseover']
        });
    }

    return {
        render
    };
})();
