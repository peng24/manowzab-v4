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
        await page.goto("http://localhost:5173", wait_until="commit", timeout=10000)

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
        # -> Navigate to http://localhost:5173
        await page.goto("http://localhost:5173", wait_until="commit", timeout=10000)
        
        # -> Reload the application by navigating to the same URL (attempt 2) to try to get the SPA to load; after navigation, check the page for interactive elements (chat input, send button, queues, TTS controls).
        await page.goto("http://localhost:5173/manowzab-v4/", wait_until="commit", timeout=10000)
        
        # -> Open the application in a new tab at http://localhost:5173/manowzab-v4/ to try to load the SPA and reveal interactive elements so spam-filter tests can proceed.
        await page.goto("http://localhost:5173/manowzab-v4/", wait_until="commit", timeout=10000)
        
        # -> Navigate to the root URL http://localhost:5173/ and wait 5 seconds for the SPA to load, then re-check the page for interactive elements (chat input, send button, queues, TTS controls). If still blank, prepare alternative navigation (127.0.0.1) or report issue.
        await page.goto("http://localhost:5173/", wait_until="commit", timeout=10000)
        
        # -> Attempt to load the app using the loopback IP: navigate to http://127.0.0.1:5173/manowzab-v4/ and check for interactive elements. If still blank, try additional recovery or report site issue.
        await page.goto("http://127.0.0.1:5173/manowzab-v4/", wait_until="commit", timeout=10000)
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        try:
            await expect(frame.locator('text=Message filtered - no stock update or TTS').first).to_be_visible(timeout=3000)
        except AssertionError:
            raise AssertionError("Test case failed: The test expected the spam/irrelevant message to be filtered and an on-screen indicator 'Message filtered - no stock update or TTS' to appear confirming no stock transactions, queue updates, or TTS were triggered, but that indicator did not appear — the filtering or suppression logic may have failed and unintended actions could have occurred")
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    