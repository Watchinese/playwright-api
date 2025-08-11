import express from "express";
import { chromium } from "playwright";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const API_TOKEN = process.env.API_TOKEN || "";
const PORT = process.env.PORT || 10000;

app.post("/scrape", async (req, res) => {
  const { url, token, selectors } = req.body;

  if (!token || token !== API_TOKEN) {
    return res.status(403).json({ error: "Invalid or missing API token" });
  }
  if (!url || !selectors) {
    return res.status(400).json({ error: "Missing url or selectors" });
  }

  console.log(`Visiting: ${url}`);

  let browser;
  try {
    browser = await chromium.launch({
      headless: true, // change to false for visual debugging
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const context = await browser.newContext({
      userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
    });

    const page = await context.newPage();

    // DEBUG LOGS
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    page.on("request", (req) =>
        console.log("REQ:", req.method(), req.url())
    );
    page.on("response", (res2) =>
        console.log("RES:", res2.status(), res2.url())
    );

    // Skip heavy resources
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "stylesheet", "font", "media"].includes(type)) {
        return route.abort();
      }
      route.continue();
    });

    // Go to page, don't wait forever
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000, // fail after 30s
    });

    // Wait for title
    const titleHandle = await page.waitForSelector(selectors.title, {
      timeout: 10000,
    });
    const title = await titleHandle.innerText();

    // Wait for body paragraphs
    const bodyNodes = await page.$$(selectors.body);
    const body = [];
    for (let node of bodyNodes) {
      body.push((await node.innerText()).trim());
    }

    res.json({ title, body });
  } catch (err) {
    console.error("Scraping failed:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Playwright API service listening on port ${PORT}`);
});
