from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # 1. Root Access (Should redirect to /login if no auth)
    print("Navigating to / ...")
    page.goto("http://localhost:8000/")
    page.wait_for_selector("#view-login:not(.hidden)", timeout=5000)
    page.screenshot(path="verification/spa_login_redirect_fix.png")
    print("Redirected to Login View.")

    # 2. Check for Console Errors
    page.on("console", lambda msg: print(f"Console: {msg.text}"))

    # 3. Try to click Signup (triggers router logic)
    page.click("a[href='/signup']")
    page.wait_for_selector("#view-signup:not(.hidden)", timeout=5000)
    page.screenshot(path="verification/spa_signup_nav_fix.png")
    print("Navigated to Signup via Router.")

    browser.close()

with sync_playwright() as p:
    run(p)
