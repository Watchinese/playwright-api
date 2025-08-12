import express from 'express';
import bodyParser from 'body-parser';
import playwright from 'playwright';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;
const API_TOKEN = process.env.API_TOKEN || 'changeme';

// Ensure debug folder exists
const debugDir = '/app/debug';
if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir, { recursive: true });
}

console.log(`✅ Service starting... Listening on port ${PORT}`);
app.listen(PORT, () => {
  console.log(`🚀 Playwright API service is running on port ${PORT}`);
});

// POST /scrape
app.post('/scrape', async (req, res) => {
  const { url, token, selectors } = req.body;

  console.log(`📥 Incoming request for URL: ${url}`);

  if (!token || token !== API_TOKEN) {
    console.warn("❌ Invalid API token");
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!url) {
    return res.status(400).json({ error: 'Missing URL' });
  }

  let browser;
  try {
    console.log("🖥 Launching browser (headless mode)...");
    browser = await playwright.chromium.launch({ headless: true });

    console.log("📄 Creating new page...");
    const page = await browser.newPage();

    console.log(`🌐 Navigating to ${url}`);
    await page.goto(url, { timeout: 20000, waitUntil: 'domcontentloaded' });
    console.log("✅ Page loaded");

    const results = {};
    if (selectors && typeof selectors === 'object') {
      for (const [key, selector] of Object.entries(selectors)) {
        console.log(`🔍 Extracting ${key} with selector "${selector}"`);
        results[key] = await page.$$eval(selector, els =>
            els.map(el => el.innerText.trim())
        );
      }
    }

    // Save debug files
    const safeName = url.replace(/[^a-z0-9]/gi, '_').slice(0, 50);
    const screenshotPath = path.join(debugDir, `${safeName}.png`);
    const htmlPath = path.join(debugDir, `${safeName}.html`);

    console.log(`💾 Saving screenshot: ${screenshotPath}`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    console.log(`💾 Saving HTML: ${htmlPath}`);
    const html = await page.content();
    fs.writeFileSync(htmlPath, html);

    console.log("✅ Scraping complete");
    res.json({ success: true, data: results });

  } catch (err) {
    console.error("❌ Scraping error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) {
      console.log("🔻 Closing browser...");
      await browser.close();
    }
  }
});
