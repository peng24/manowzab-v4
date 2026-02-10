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
        
        # -> Open the web app manifest to look for PWA metadata (start_url, service worker info) and then fetch service worker script to inspect cached assets.
        await page.goto("http://localhost:5173/manowzab-v4/manifest.webmanifest", wait_until="commit", timeout=10000)
        
        # -> Fetch the service worker script(s) to inspect cache names and the list of cached assets. Start by requesting /manowzab-v4/sw.js, then /manowzab-v4/service-worker.js, then /sw.js (open each in same tab). If any script is found, extract its contents to look for cache names and asset lists.
        await page.goto("http://localhost:5173/manowzab-v4/sw.js", wait_until="commit", timeout=10000)
        
        await page.goto("http://localhost:5173/manowzab-v4/service-worker.js", wait_until="commit", timeout=10000)
        
        await page.goto("http://localhost:5173/sw.js", wait_until="commit", timeout=10000)
        
        # -> Click the link to /manowzab-v4/sw.js visible on the current page to open the service worker script and extract cache names and cached asset lists (look for caches.open/cache names, precache arrays, or workbox manifest).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the app's index HTML to locate the service worker registration and correct service-worker path (load /manowzab-v4/index.html). If index.html contains the sw path, fetch that script to extract cache names and precache lists.
        await page.goto("http://localhost:5173/manowzab-v4/index.html", wait_until="commit", timeout=10000)
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        try:
            await expect(frame.locator('text=New version available — Refresh to update').first).to_be_visible(timeout=3000)
        except AssertionError:
            raise AssertionError("Test case failed: The test expected the PWA to display an update prompt ('New version available — Refresh to update') after deploying a new version and reloading, but no such prompt was found. This indicates the service worker did not detect the new version or the app failed to notify the user about the available update.")
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    