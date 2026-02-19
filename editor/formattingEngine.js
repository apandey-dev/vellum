/**
 * formattingEngine.js
 * Handles applying inline styles and formatting commands.
 */

const formattingConfig = {
    fonts: {
        'Fredoka': "'Fredoka', sans-serif",
        'Kalam': "'Kalam', cursive",
        'Playpen Sans': "'Playpen Sans', cursive",
        'Patrick Hand': "'Patrick Hand', cursive",
        'Baloo 2': "'Baloo 2', cursive",
        'Comic Neue': "'Comic Neue', cursive",
        'Comic Sans MS': "'Comic Sans MS', cursive, sans-serif"
    }
};

/**
 * Applies a font to the current selection or at the cursor.
 */
export function applyFont(fontName) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    if (selection.isCollapsed) {
        // Insert a zero-width space wrapped in a span with the font.
        // This ensures the NEXT character typed falls into this span.
        const span = document.createElement('span');
        span.style.fontFamily = formattingConfig.fonts[fontName] || fontName;
        span.innerHTML = '&#8203;';

        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(span);

        range.setStart(span, 1);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        document.execCommand('fontName', false, formattingConfig.fonts[fontName] || fontName);
    }
}

/**
 * Applies a color to the current selection or at the cursor.
 */
export function applyColor(color) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    if (selection.isCollapsed) {
        const span = document.createElement('span');
        span.style.color = color;
        span.innerHTML = '&#8203;';

        const range = selection.getRangeAt(0);
        range.insertNode(span);

        range.setStart(span, 1);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        document.execCommand('foreColor', false, color);
    }
}

/**
 * Executes a standard formatting command.
 */
export function execCommand(command, value = null) {
    document.execCommand(command, false, value);
}

/**
 * Gets the current active font name.
 */
export function getCurrentFontName(writingCanvas) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return 'Fredoka';
    let node = selection.getRangeAt(0).startContainer;

    if (node.nodeType === 3) node = node.parentElement;

    while (node && node !== writingCanvas) {
        if (node.tagName === 'SPAN' && node.style.fontFamily) {
            const fam = node.style.fontFamily;
            for (const [name, val] of Object.entries(formattingConfig.fonts)) {
                if (fam.includes(name) || val.includes(fam)) return name;
            }
        }
        node = node.parentElement;
    }

    // Fallback to computed style
    node = selection.getRangeAt(0).startContainer;
    if (node.nodeType === 3) node = node.parentElement;

    while (node && node !== writingCanvas) {
        const computed = window.getComputedStyle(node).fontFamily;
        for (const [name, fam] of Object.entries(formattingConfig.fonts)) {
            if (computed.includes(name)) return name;
        }
        node = node.parentElement;
    }

    return 'Fredoka';
}

export { formattingConfig };
