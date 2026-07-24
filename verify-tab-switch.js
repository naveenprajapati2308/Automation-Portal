const { chromium } = require('playwright-core');
async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:15000/', { waitUntil: 'load' });
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await page.fill('input[type="text"]', 'superadmin@gmail.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.locator('text=Automation').first().click().catch(()=>{});
  await page.waitForTimeout(1000);
  await page.locator('text=Execution Center').first().click().catch(()=>{});
  await page.waitForTimeout(3000);

  const iframeEl = await page.waitForSelector('iframe');
  const frame = await iframeEl.contentFrame();
  await frame.waitForSelector('text=AUTO-20260722055629', { timeout: 15000 });

  const before = await frame.locator('tr', { hasText: 'AUTO-20260722055629' }).innerText();
  console.log('BEFORE (exec 11 row):', before.replace(/\s+/g, ' '));
  const beforeRunning = await frame.locator('tr', { hasText: 'AUTO-20260722054822' }).innerText().catch(()=>'not found');
  console.log('BEFORE (exec 10 row):', beforeRunning.replace(/\s+/g, ' '));

  // Simulate the tab going into the background (inside the iframe's own document, since
  // visibilitychange is per-document, and App.jsx's listener is registered on this document).
  await frame.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  console.log('Simulated tab -> hidden');

  // Wait long enough for real backend progress (well past a real EMP_ARCH test or two)
  await page.waitForTimeout(20000);

  // Simulate tab becoming visible again
  await frame.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  console.log('Simulated tab -> visible');
  await page.waitForTimeout(3000);

  const after = await frame.locator('tr', { hasText: 'AUTO-20260722055629' }).innerText();
  console.log('AFTER (exec 11 row):', after.replace(/\s+/g, ' '));
  const afterRunning = await frame.locator('tr', { hasText: 'AUTO-20260722054822' }).innerText().catch(()=>'not found');
  console.log('AFTER (exec 10 row):', afterRunning.replace(/\s+/g, ' '));

  await page.screenshot({ path: 'tab-switch-verify.png' });
  await browser.close();
}
main().catch(e=>{console.error(e);process.exit(1)});
