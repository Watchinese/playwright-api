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
    console.log("🖥 Launching browser...");
    const browser = await chromium.launch({
      headless: true, // 非 headless 模式，有助於繞過 Cloudflare
 //     slowMo: 100, // 放慢操作，模擬人類行為
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-software-rasterizer']
    });
    console.log("✅ Browser launched");
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.117 Safari/537.36',
    });
    console.log("📄 Creating new page...");
    const page = await browser.newPage();
    console.log("✅ New page created");

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
