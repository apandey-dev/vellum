/**
 * markdownParser.js
 * Converts Markdown string to structured HTML blocks.
 */

/**
 * Simple syntax highlighter for code blocks
 */
function highlightCode(code, lang) {
    if (!lang || lang === 'text') return code;

    const rules = [
        { type: 'comment', regex: /(\/\/.*|\/\*[\s\S]*?\*\/)/g },
        { type: 'string', regex: /(['"`])(.*?)\1/g },
        { type: 'keyword', regex: /\b(var|let|const|function|class|return|if|else|for|while|import|export|from|void|int|double|String|bool|dynamic|print|final|static|await|async|try|catch|new|this|super|extends|implements|with|factory|get|set|operator|abstract|native|covariant|external|typedef|part|of|show|hide)\b/g },
        { type: 'number', regex: /\b(\d+)\b/g },
        { type: 'boolean', regex: /\b(true|false)\b/g }
    ];

    let matches = [];
    rules.forEach(rule => {
        let match;
        rule.regex.lastIndex = 0;
        while ((match = rule.regex.exec(code)) !== null) {
            matches.push({
                start: match.index,
                end: match.index + match[0].length,
                type: rule.type,
                text: match[0]
            });
        }
    });

    // Sort matches by start position, then by length (descending)
    matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    let result = '';
    let lastIndex = 0;
    for (const match of matches) {
        if (match.start < lastIndex) continue; // Skip overlapping matches

        result += code.substring(lastIndex, match.start);
        result += `<span class="code-${match.type}">${match.text}</span>`;
        lastIndex = match.end;
    }
    result += code.substring(lastIndex);

    return result;
}

export function parseMarkdown(md) {
    if (!md) return '';

    let html = md;

    // 1. Code Blocks (Triple Backticks)
    const codeBlocks = [];
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const id = `PARSERCODEBLOCK${codeBlocks.length}ID`;
        // Escape HTML inside code block
        const escapedCode = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        const highlighted = highlightCode(escapedCode, lang.toLowerCase());

        codeBlocks.push({
            id,
            html: `<pre class="code-block" data-lang="${lang || 'text'}" contenteditable="false"><code>${highlighted}</code></pre>`
        });
        return id;
    });

    // 2. Tables
    const tables = [];
    const tableRegex = /^\|(.+)\|\n\|([ \t]*:?-+:?[ \t]*\|?)+\|\n((?:\|.+\|\n?)*)/gm;
    html = html.replace(tableRegex, (match, header, separator, rows) => {
        const id = `PARSERTABLE${tables.length}ID`;

        const headers = header.split('|').filter(h => h.trim() !== '').map(h => h.trim());
        const bodyRows = rows.split('\n').filter(r => r.trim() !== '').map(r => {
            return r.split('|').filter(c => c.trim() !== '').map(c => c.trim());
        });

        let tableHtml = '<table contenteditable="false"><thead><tr>';
        headers.forEach(h => tableHtml += `<th>${h}</th>`);
        tableHtml += '</tr></thead><tbody>';
        bodyRows.forEach(row => {
            tableHtml += '<tr>';
            row.forEach(cell => tableHtml += `<td>${cell}</td>`);
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table>';

        tables.push({ id, html: tableHtml });
        return id;
    });

    // 3. Headings
    html = html.replace(/^# (.*$)/gm, (match, title) => {
        const id = title.toLowerCase().trim().replace(/[^\w]+/g, '-');
        return `<h1 id="${id}">${title}</h1>`;
    });
    html = html.replace(/^## (.*$)/gm, (match, title) => {
        const id = title.toLowerCase().trim().replace(/[^\w]+/g, '-');
        return `<h2 id="${id}">${title}</h2>`;
    });
    html = html.replace(/^### (.*$)/gm, (match, title) => {
        const id = title.toLowerCase().trim().replace(/[^\w]+/g, '-');
        return `<h3 id="${id}">${title}</h3>`;
    });

    // 4. Horizontal Rule
    html = html.replace(/^---$/gm, '<hr>');

    // 5. Lists (Unordered)
    html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<ul><li>$1</li></ul>');
    html = html.replace(/<\/ul>\n<ul>/g, '');

    // 6. Lists (Ordered)
    html = html.replace(/^\s*\d+\.\s+(.*)$/gm, '<ol><li>$1</li></ol>');
    html = html.replace(/<\/ol>\n<ol>/g, '');

    // 7. Inline Formatting
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/__(.*?)__/g, '<b>$1</b>');
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
    html = html.replace(/_(.*?)_/g, '<i>$1</i>');
    // Inline Code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // 8. Paragraphs and Line Breaks
    // Handle double newlines as paragraph breaks and single newlines as soft breaks (<br>)
    const sections = html.split('\n\n');
    html = sections.map(section => {
        if (!section.trim()) return '';

        // If the section contains block-level HTML tags we've already generated,
        // we need to be careful not to wrap them in another div.
        // But we must wrap any remaining bare text.
        const blockTags = ['h1', 'h2', 'h3', 'hr', 'ul', 'ol', 'table', 'pre'];
        const hasBlockTag = blockTags.some(tag => section.includes(`<${tag}`));

        if (hasBlockTag || section.includes('PARSERCODEBLOCK') || section.includes('PARSERTABLE')) {
            // Split by newline and wrap only non-tag lines?
            // Actually, if it has a block tag, it's usually a block-level section.
            // Let's just ensure bare lines are wrapped.
            return section.split('\n').map(line => {
                if (!line.trim()) return '';
                if (line.trim().startsWith('<') || line.includes('PARSERCODEBLOCK') || line.includes('PARSERTABLE')) return line;
                return `<div>${line}</div>`;
            }).join('');
        }

        // No block tags: Convert single newlines to <br> and wrap in div
        const content = section.split('\n').join('<br>');
        return `<div>${content}</div>`;
    }).join('');

    // 9. Re-insert Code Blocks and Tables
    codeBlocks.forEach(block => {
        html = html.replace(block.id, block.html);
    });
    tables.forEach(table => {
        html = html.replace(table.id, table.html);
    });

    return html;
}

/**
 * Detects if a string likely contains Markdown syntax.
 */
export function isMarkdown(text) {
    const mdPatterns = [
        /^#+ /m,           // Headings
        /^\s*[-*] /m,      // Unordered lists
        /^\s*\d+\. /m,     // Ordered lists
        /\*\*.*\*\*/,      // Bold
        /`.*`/,            // Inline code
        /^```/m,           // Code blocks
        /^\|.*\|/m,        // Tables
        /^---$/m           // HR
    ];

    return mdPatterns.some(pattern => pattern.test(text));
}

/**
 * Detects if a string likely contains source code or HTML.
 */
export function isCodeLike(text) {
    const codePatterns = [
        /[{};]/,                       // Braces or semicolons
        /\b(function|class|const|let|var|import|export|if|else|for|while|return|async|await)\b/, // JS Keywords
        /<[a-z][\s\S]*>/i,             // HTML tags
        /\b(public|private|protected|void|static|int|String|bool|final)\b/, // Other lang keywords
        /^[ \t]+/m,                    // Indentation at start of lines
        /\(\) =>/,                     // Arrow function
        /=> {/                         // Arrow function with block
    ];

    // Minimum criteria: at least 2 code-like features or very specific ones
    let score = 0;
    if (/[{};]/.test(text)) score += 1;
    if (/\b(function|class|const|let|var|return)\b/.test(text)) score += 1;
    if (/<[a-z][\s\S]*>/i.test(text)) score += 1;
    if (/^[ \t]+/m.test(text)) score += 1;
    if (/\(\) =>/.test(text)) score += 1;

    // High certainty patterns
    if (/function\s+\w+\s*\(/.test(text)) return true;
    if (/class\s+\w+\s*\{/.test(text)) return true;
    if (/<\/?[a-z][\s\S]*>/i.test(text)) return true;

    return score >= 2;
}

/**
 * Intelligent paste handler that chooses between Markdown parsing or raw code wrapping.
 */
export function smartParse(text) {
    if (!text) return '';

    // If it's explicitly Markdown (has headings, fenced code blocks, etc.), parse it as Markdown
    if (isMarkdown(text)) {
        return parseMarkdown(text);
    }

    // If it's not Markdown but looks like code, wrap it in a code block
    if (isCodeLike(text)) {
        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Use the standardized highlightCode if possible, or just text
        const highlighted = highlightCode(escaped, 'text');
        return `<pre class="code-block" data-lang="text" contenteditable="false"><code>${highlighted}</code></pre>`;
    }

    // Default: treat as plain text with smart line breaks
    const sections = text.split('\n\n');
    return sections.map(section => {
        const content = section
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .split('\n').join('<br>');
        return `<div>${content}</div>`;
    }).join('');
}
