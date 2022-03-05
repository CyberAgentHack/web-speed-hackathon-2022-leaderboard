import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer-core';

declare global {
  var __DEBUG__REACHED_BOTTOM: boolean;
}

type Params = {
  url: string;
  width: number;
  height: number;
};

export async function captureScreenshot({ url, width, height }: Params): Promise<Buffer | null> {
  const browser = await puppeteer.launch({
    args: ['--headless', '--no-sandbox', '--hide-scrollbars'],
    channel: 'chrome',
  });

  try {
    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();

    await page.setViewport({ width, height });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluateOnNewDocument(await fs.readFile(path.join(__dirname, './mockdate.js'), 'utf-8'));

    await page.goto(url, {
      timeout: 60 * 1000,
      waitUntil: 'networkidle0',
    });

    // 無限スクロールの待機
    await page.evaluate(() => {
      (async () => {
        window.__DEBUG__REACHED_BOTTOM = false;
        const scroller = document.documentElement;

        let previousPosition = -1;

        while (true) {
          scroller.scrollTop += scroller.scrollHeight;
          await new Promise((resolve) => window.setTimeout(resolve, 1000));

          const currentPosition = scroller.scrollTop;

          if (currentPosition > previousPosition) {
            previousPosition = currentPosition;
          } else {
            window.__DEBUG__REACHED_BOTTOM = true;
            break;
          }
        }
      })();
    });

    await page.waitForFunction('window.__DEBUG__REACHED_BOTTOM === true', {
      timeout: 90 * 1000,
      polling: 1000,
    });

    const screenshot = (await page.screenshot({
      captureBeyondViewport: false,
      fullPage: true,
    })) as Buffer;

    return screenshot;
  } finally {
    await browser.close();
  }
}
