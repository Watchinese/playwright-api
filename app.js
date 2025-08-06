import express from 'express';
import { chromium } from 'playwright';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const API_TOKEN = process.env.API_TOKEN;

app.post('/scrape', async (req, res) => {
  const { url, token, selectors } = req.body;

  if (token !== API_TOKEN) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  console.log("Visiting:", url);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { timeout: 120000, waitUntil: 'domcontentloaded' });

    const result = {};
    for (const [key, selector] of Object.entries(selectors || {})) {
      result[key] = await page.$$eval(selector, els =>
        els.map(el => el.innerText.trim()).join('\n\n')
      );
    }

    await browser.close();
    res.json(result);
  } catch (error) {
    await browser.close();
    console.error("Scraping failed:", error);
    res.status(500).json({ error: error.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`Playwright API service listening on port ${PORT}`);
});
