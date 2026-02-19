from playwright.sync_api import sync_playwright
import time
import os

def verify_routing_and_branding():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        os.makedirs("/home/jules/verification", exist_ok=True)

        # 1. Setup session with migrated keys
        context = browser.new_context()
        page = context.new_page()
        page.goto("http://localhost:8000")

        # Simulate old keys to test migration
        page.evaluate("""() => {
            localStorage.setItem('focuspad_theme', 'dark');
            localStorage.setItem('mj_user', JSON.stringify({name: 'Old User', email: 'old@example.com'}));
            localStorage.setItem('focuspad_notes', JSON.stringify([{id:'n1', name:'Migrated Note', folderId:'f1', content:'Migration test'}]));
            localStorage.setItem('focuspad_activeNote', 'n1');
            localStorage.setItem('focuspad_activeFolder', 'f1');
            localStorage.setItem('focuspad_folders', JSON.stringify([{id:'f1', name:'General', isDefault: true}]));
        }""")

        # 2. Test URL Guard (Redirect from .html)
        page.goto("http://localhost:8000/index.html")
        time.sleep(1) # wait for redirect

        final_url = page.url
        print(f"Final URL after guard: {final_url}")

        # 3. Verify Migration
        migrated_user = page.evaluate("localStorage.getItem('vellum_user')")
        print(f"Migrated user: {migrated_user}")

        # 4. Verify Share Link generation structure
        page.goto("http://localhost:8000")
        page.wait_for_selector('#shareBtn')
        page.click('#shareBtn')

        # Wait for modal visibility
        page.wait_for_selector('#shareModal.show')

        # Toggle public
        page.click('#shareToggle')
        time.sleep(1)

        share_link = page.locator('#shareLinkInput').input_value()
        print(f"Generated Share Link: {share_link}")
        assert "/share/" in share_link

        # 5. Verify Error Page branding
        page.goto("http://localhost:8000/error.html")
        page.wait_for_selector('.error-logo')
        page.screenshot(path="/home/jules/verification/error_page.png")
        print("Error page screenshot taken")

        browser.close()

if __name__ == "__main__":
    verify_routing_and_branding()
