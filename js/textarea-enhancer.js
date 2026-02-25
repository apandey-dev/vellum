/**
 * textarea-enhancer.js
 * Enhances the native textarea with IDE-like features (Tab indentation, etc.)
 */

export const TextareaEnhancer = (function() {
    /**
     * Handles Tab and Shift+Tab for indentation
     * @param {KeyboardEvent} e
     */
    function handleTab(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = e.target;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const value = textarea.value;

            if (start === end) {
                // Single cursor: Insert 2 spaces (Standard for Markdown)
                textarea.value = value.substring(0, start) + "  " + value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 2;
            } else {
                // Multi-line selection: Indent or Unindent
                const lines = value.substring(start, end).split('\n');
                let newValue;

                if (e.shiftKey) {
                    // Unindent
                    newValue = lines.map(line => line.startsWith('  ') ? line.substring(2) : (line.startsWith(' ') ? line.substring(1) : line)).join('\n');
                } else {
                    // Indent
                    newValue = lines.map(line => '  ' + line).join('\n');
                }

                textarea.value = value.substring(0, start) + newValue + value.substring(end);
                textarea.selectionStart = start;
                textarea.selectionEnd = start + newValue.length;
            }

            // Trigger input event to update preview and auto-save
            textarea.dispatchEvent(new Event('input'));
        }
    }

    function init(textarea) {
        if (!textarea) return;
        textarea.addEventListener('keydown', handleTab);
    }

    return {
        init
    };
})();
