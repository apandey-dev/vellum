/**
 * parser.js
 * Handles parsing of complex shortcut strings.
 */

/**
 * Parses a combo shortcut like $head+red+center.
 * @param {string} shortcutString The string between $ and .
 * @returns {object} Object containing headingType, color, and alignment.
 */
export function parseComboShortcut(shortcutString) {
    const parts = shortcutString.split('+');
    const headingType = parts[0]; // e.g., 'head', 'subhead'

    let color = null;
    let alignment = null;

    const alignKeywords = ['center', 'start', 'end', 'left', 'right'];
    const alignMap = {
        'center': 'center',
        'start': 'left',
        'left': 'left',
        'end': 'right',
        'right': 'right'
    };

    for (let i = 1; i < parts.length; i++) {
        const part = parts[i].toLowerCase();
        if (alignKeywords.includes(part)) {
            alignment = alignMap[part];
        } else {
            // Assume color if not alignment
            color = part;
        }
    }

    return {
        headingType,
        color,
        alignment
    };
}

/**
 * Maps heading types to tag names.
 */
export function getHeadingTag(type) {
    const map = {
        'head': 'h2',
        'subhead': 'h3',
        'subhead2': 'h4'
    };
    return map[type] || 'h2';
}
