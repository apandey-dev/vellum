const test = require('node:test');
const assert = require('node:assert');
const { escapeHtml } = require('../utils.js');

test('escapeHtml', async (t) => {
    await t.test('escapes & correctly', () => {
        assert.strictEqual(escapeHtml('foo & bar'), 'foo &amp; bar');
    });

    await t.test('escapes < correctly', () => {
        assert.strictEqual(escapeHtml('<script>'), '&lt;script&gt;');
    });

    await t.test('escapes > correctly', () => {
        assert.strictEqual(escapeHtml('a > b'), 'a &gt; b');
    });

    await t.test('escapes " correctly', () => {
        assert.strictEqual(escapeHtml('He said "hello"'), 'He said &quot;hello&quot;');
    });

    await t.test('escapes multiple characters correctly', () => {
        assert.strictEqual(escapeHtml('& < > "'), '&amp; &lt; &gt; &quot;');
    });

    await t.test('returns same string if no special characters', () => {
        const input = 'Hello World 123';
        assert.strictEqual(escapeHtml(input), input);
    });

    await t.test('handles empty string', () => {
        assert.strictEqual(escapeHtml(''), '');
    });

    await t.test('handles non-string inputs', () => {
        assert.strictEqual(escapeHtml(null), null);
        assert.strictEqual(escapeHtml(undefined), undefined);
        assert.strictEqual(escapeHtml(123), 123);
    });
});
