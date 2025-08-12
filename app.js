import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const DEBUG_DIR = '/app/debug';
if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR);

export async function scrape(url, selectors) {
  console.log(`Visiting: ${url}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000 // shorter timeout so it doesn't hang forever
    });
  } catch (err) {
    console.error('Navigation failed:', err.message);
    // Capture partial screenshot/HTML anyway
    await page.screenshot({ path: path.join(DEBUG_DIR, 'error.png'), fullPage: true });
    await fs.promises.writeFile(
        path.join(DEBUG_DIR, 'error.html'),
        await page.content()
    );
    await browser.close();
    throw err;
  }

  // Take a screenshot after load
  await page.screenshot({ path: path.join(DEBUG_DIR, 'page.png'), fullPage: true });
  await fs.promises.writeFile(
      path.join(DEBUG_DIR, 'page.html'),
      await page.content()
  );

  const result = {};
  for (const [key, selector] of Object.entries(selectors)) {
    const el = await page.$(selector);
    result[key] = el ? (await page.evaluate(el => el.innerText, el)).trim() : null;
  }

  await browser.close();
  return result;
}
