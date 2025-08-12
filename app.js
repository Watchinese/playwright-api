import express from 'express';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Ensure debug folder exists
const debugDir = '/app/debug';
if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir, { recursive: true });
}

app.post('/scrape', async (req, res) => {
  const { url, token, selectors } = req.body;
  const API_TOKEN = process.env.API_TOKEN;

  if (token !== API_TOKEN) {
    return res.status(403).json({ error: 'Invalid API token' });
  }

  console.log('Visiting:', url);

  const browser = await chromium.launch({
    headless: false, // HEADFUL MODE for debug
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Log all console messages from the page
  page.on('console', (msg) => console.log('BROWSER LOG:', msg.text()));

  // Log network responses
  page.on('response', (res) =>
      console.log(`RESPONSE: ${res.status()} ${res.url()}`)
  );

  try {
    await page.goto(url, { timeout: 60000, waitUntil: 'domcontentloaded' });

    // Save screenshot and HTML for debugging
    const screenshotPath = path.join(debugDir, 'page.png');
    const htmlPath = path.join(debugDir, 'page.html');

    await page.screenshot({ path: screenshotPath, fullPage: true });
    fs.writeFileSync(htmlPath, await page.content());

    console.log(`Saved screenshot to ${screenshotPath}`);
    console.log(`Saved HTML to ${htmlPath}`);

    const result = {};
    for (const [key, selector] of Object.entries(selectors || {})) {
      const elements = await page.$$eval(selector, (els) =>
          els.map((el) => el.innerText.trim())
      );
      result[key] = elements.join('\n');
    }

    await browser.close();
    res.json(result);
  } catch (err) {
    console.error('Scraping failed:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Playwright API service listening on port ${PORT}`);
});
