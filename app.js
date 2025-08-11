import express from 'express';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());

const API_TOKEN = process.env.API_TOKEN || 'changeme';
const DEBUG_DIR = '/app/debug';
fs.mkdirSync(DEBUG_DIR, { recursive: true });

app.post('/scrape', async (req, res) => {
  const { url, token, selectors } = req.body;

  if (token !== API_TOKEN) {
    return res.status(403).json({ error: 'Invalid API token' });
  }
  if (!url || !selectors) {
    return res.status(400).json({ error: 'Missing url or selectors' });
  }

  console.log(`Visiting: ${url}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });

    // Wait for title selector
    await page.waitForSelector(selectors.title, { timeout: 60000 });

    const result = {};
    for (const [key, sel] of Object.entries(selectors)) {
      result[key] = await page.$$eval(sel, els => els.map(e => e.innerText.trim()).join('\n'));
    }

    await browser.close();
    return res.json(result);

  } catch (err) {
    console.error(`Error scraping ${url}:`, err);

    // Save screenshot & HTML for debugging
    const safeName = url.replace(/[^a-z0-9]/gi, '_').slice(0, 50);
    const screenshotPath = path.join(DEBUG_DIR, `${safeName}.png`);
    const htmlPath = path.join(DEBUG_DIR, `${safeName}.html`);

    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      const html = await page.content();
      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log(`Debug files saved: ${screenshotPath}, ${htmlPath}`);
    } catch (fsErr) {
      console.error('Error saving debug files:', fsErr);
    }

    await browser.close();
    return res.status(500).json({ error: err.message });
  }
});

app.listen(10000, () => {
  console.log('Playwright API service listening on port 10000');
});
