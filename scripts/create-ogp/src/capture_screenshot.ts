import puppeteer from 'puppeteer-core';

type Params = {
  html: string;
  width: number;
  height: number;
};

export async function captureScreenshot({ html, width, height }: Params): Promise<Buffer | null> {
  const browser = await puppeteer.launch({
    args: ['--headless', '--no-sandbox', '--hide-scrollbars'],
    channel: 'chrome',
  });

  try {
    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();

    await page.setViewport({ width, height });
    await page.setContent(html, {
      timeout: 60 * 1000,
      waitUntil: 'networkidle0',
    });

    const screenshot = (await page.screenshot({
      captureBeyondViewport: false,
    })) as Buffer;

    return screenshot;
  } finally {
    await browser.close();
  }
}
