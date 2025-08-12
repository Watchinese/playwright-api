import express from 'express';
import bodyParser from 'body-parser';
import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;
const API_TOKEN = process.env.API_TOKEN || '';

console.log(`✅ Service starting... Listening on port ${PORT}`);

app.post('/scrape', async (req, res) => {
  const { url, token, selectors } = req.body;

  if (API_TOKEN && token !== API_TOKEN) {
    return res.status(403).json({ error: 'Invalid API token' });
  }

  console.log(`📥 Incoming request for URL: ${url}`);

  try {
    console.log(`🖥 Launching browser (headless mode)...`);
    console.log('🔍 Checking Chromium executable...');
    console.log('Chromium path:', chromium.executablePath());

    // Launch browser
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    // Log browser version
    const version = await browser.version();
    console.log('Chromium version:', version);

    console.log(`📄 Creating new page...`);
    const page = await browser.newPage();

    console.log(`🌐 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const data = {};

    for (const [key, selector] of Object.entries(selectors)) {
      const element = await page.$(selector);
      data[key] = element ? await element.textContent() : null;
    }

    await browser.close();
    res.json({ success: true, data });

  } catch (err) {
    console.error('❌ Scraping failed:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Playwright API service is running on port ${PORT}`);
});
