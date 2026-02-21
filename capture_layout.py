import time
from playwright.sync_api import sync_playwright

def capture_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # We use verify_logic.html as a host to avoid index.html redirect issues
        # and we can inject the styles there
        page.goto('http://localhost:8001/verify_logic.html')

        # Inject the CSS from styles.css
        with open('styles.css', 'r') as f:
            css = f.read()

        page.add_style_tag(content=css)

        # Inject the test content
        content = """
        <div class="writing-canvas">
            <h1>Compact Spacing Test</h1>
            <div>This is a paragraph with standard spacing. Next should be a code block.</div>
            <pre class="code-block"><code>const x = 10;\nconsole.log(x);</code></pre>
            <div>Directly following code. No massive gap.</div>
            <hr>
            <h2>Subheading</h2>
            <ul><li>List Item 1</li><li>List Item 2</li></ul>
        </div>
        """

        page.evaluate(f"document.body.innerHTML = `{content}`")
        page.set_viewport_size({"width": 800, "height": 600})
        page.screenshot(path='/home/jules/verification/layout_final.png')
        browser.close()

if __name__ == "__main__":
    capture_layout()
