import asyncio
from playwright import async_api

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:5173/manowzab-v4/", wait_until="commit", timeout=10000)

        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass

        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:5173/manowzab-v4/
        await page.goto("http://localhost:5173/manowzab-v4/", wait_until="commit", timeout=10000)
        
        # -> Reload the app by navigating to http://localhost:5173/manowzab-v4/ in the current tab, then re-scan the page for interactive elements (login fields, Sign In button, Devices/Presence panel).
        await page.goto("http://localhost:5173/manowzab-v4/", wait_until="commit", timeout=10000)
        
        # -> Open the site in a new tab (try the root URL) and wait so the page can load; then re-scan for interactive elements (login fields, sign-in button, presence/devices panel). If still blank, prepare alternative navigation (different path or inspect Firebase console).
        await page.goto("http://localhost:5173/", wait_until="commit", timeout=10000)
        
        # -> Open the site root (http://localhost:5173/) in a new tab and wait briefly to see if the SPA renders; then rescan the page for interactive elements (login fields, sign-in button, presence/devices panel). If still blank, prepare alternative navigation or debugging steps.
        await page.goto("http://localhost:5173/", wait_until="commit", timeout=10000)
        
        # -> Navigate to the explicit index file (http://localhost:5173/manowzab-v4/index.html) in the current tab to attempt loading the SPA and reveal interactive elements.
        await page.goto("http://localhost:5173/manowzab-v4/index.html", wait_until="commit", timeout=10000)
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        try:
            await expect(frame.locator('text=Presence removed for closed device').first).to_be_visible(timeout=3000)
        except AssertionError:
            raise AssertionError("Test case failed: Expected the UI to show that the closed device's presence was removed in Firebase (verifying presence tracking across multiple devices for the same user), but the presence-removal confirmation did not appear, so presence/status updates are not working as expected")
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    