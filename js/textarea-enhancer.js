/**
 * js/textarea-enhancer.js
 * Enhances the native textarea with IDE-like features.
 */

export const TextareaEnhancer = (function() {
    function handleTab(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = e.target;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const value = textarea.value;

            if (start === end) {
                textarea.value = value.substring(0, start) + "  " + value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 2;
            } else {
                const lines = value.substring(start, end).split('\n');
                let newValue;
                if (e.shiftKey) {
                    newValue = lines.map(line => line.startsWith('  ') ? line.substring(2) : (line.startsWith(' ') ? line.substring(1) : line)).join('\n');
                } else {
                    newValue = lines.map(line => '  ' + line).join('\n');
                }
                textarea.value = value.substring(0, start) + newValue + value.substring(end);
                textarea.selectionStart = start;
                textarea.selectionEnd = start + newValue.length;
            }
            textarea.dispatchEvent(new Event('input'));
        }
    }

    function init(textarea) {
        if (!textarea) return;
        textarea.addEventListener('keydown', handleTab);
    }

    return { init };
})();
