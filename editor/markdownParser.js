/**
 * markdownParser.js
 * Converts Markdown string to structured HTML blocks.
 */

/**
 * Advanced syntax highlighter using Prism.js if available,
 * otherwise falls back to a basic highlighter.
 */
export function highlightCode(code, lang = 'javascript') {
    if (!code) return '';

    // Normalize language name for Prism
    let prismLang = lang.toLowerCase();
    if (prismLang === 'js') prismLang = 'javascript';
    if (prismLang === 'html') prismLang = 'markup';

    if (window.Prism && window.Prism.languages[prismLang]) {
        return window.Prism.highlight(code, window.Prism.languages[prismLang], prismLang);
    }

    // Fallback to basic highlighter if Prism is missing or doesn't support the language
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

    matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    let result = '';
    let lastIndex = 0;
    for (const match of matches) {
        if (match.start < lastIndex) continue;
        result += code.substring(lastIndex, match.start);
        result += `<span class="token ${match.type}">${match.text}</span>`;
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
    const lines = html.split('\n');
    html = lines.map(line => {
        if (line.startsWith('<') || line.includes('PARSERCODEBLOCK') || line.includes('PARSERTABLE')) return line;
        if (!line.trim()) return '<br>';
        return `<div>${line}</div>`;
    }).join('\n');

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
 * Detects if a string likely contains source code.
 */
export function isCodeLike(text) {
    if (!text || text.length < 5) return false;

    // Explicit fenced code blocks
    if (text.trim().startsWith('```') && text.trim().endsWith('```')) return true;

    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return false;

    let codeScore = 0;

    // 1. Check for common programming keywords
    const keywords = /\b(const|let|var|function|class|return|import|export|if|else|for|while|async|await|public|private|protected|void|int|string|bool|bool|dynamic|print|final|static|try|catch|new|this|super|extends|implements)\b/g;
    const keywordMatches = (text.match(keywords) || []).length;
    if (keywordMatches >= 2) codeScore += 2;
    if (keywordMatches >= 5) codeScore += 3;

    // 2. Check for structural symbols
    if (/[{};]/.test(text)) codeScore += 2;
    if ((text.match(/=>/g) || []).length >= 1) codeScore += 1;
    if ((text.match(/\(\)/g) || []).length >= 1) codeScore += 1;

    // 3. Check for indentation consistency (multiple lines starting with spaces/tabs)
    const indentedLines = lines.filter(line => /^[ \t]{2,}/.test(line)).length;
    if (indentedLines >= 2) codeScore += 2;

    // 4. Check for common HTML/XML patterns
    if (/<\/?[a-z][\s\S]*>/i.test(text)) codeScore += 2;

    // Threshold for being "code-like"
    return codeScore >= 4;
}
