/**
 * js/markdown-engine.js
 * Professional Markdown parsing engine with custom plugins and security sanitization.
 */

export const MarkdownEngine = (function() {
    let md;

    function colorPlugin(md) {
        md.inline.ruler.push('custom_color', (state, silent) => {
            const src = state.src;
            const pos = state.pos;
            if (src.charCodeAt(pos) !== 0x5B /* [ */) return false;

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

            let searchPos = labelEnd + 1;
            while (searchPos < src.length && /\s/.test(src[searchPos])) searchPos++;
            if (searchPos >= src.length || src.charCodeAt(searchPos) !== 0x7B /* { */) return false;

            let colorStart = searchPos + 1;
            let colorEnd = src.indexOf('}', colorStart);
            if (colorEnd === -1) return false;

            if (!silent) {
                const colorValue = src.slice(colorStart, colorEnd).trim();
                const content = src.slice(labelStart, labelEnd);
                const tokenOpen = state.push('custom_color_open', 'span', 1);
                tokenOpen.attrs = [['style', `color: ${colorValue}`]];
                state.md.inline.parse(content, state.md, state.env, state.tokens);
                state.push('custom_color_close', 'span', -1);
            }
            state.pos = colorEnd + 1;
            return true;
        });
    }

    function init() {
        if (!window.markdownit) return;
        md = window.markdownit({
            html: true,
            linkify: true,
            typographer: true,
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
        md.use(colorPlugin);
    }

    function render(text) {
        if (!md) init();
        if (!text) return '';
        const rawHtml = md.render(text);
        return window.DOMPurify.sanitize(rawHtml, {
            ALLOWED_ATTR: ['style', 'href', 'src', 'alt', 'title', 'class', 'target'],
            FORBID_ATTR: ['onerror', 'onclick', 'onmouseover']
        });
    }

    return { render };
})();
