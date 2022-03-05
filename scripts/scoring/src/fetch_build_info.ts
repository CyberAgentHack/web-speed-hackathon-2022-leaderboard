import puppeteer from 'puppeteer-core';

import type { BuildInfo, Competitor } from './types';
import { logger } from './logger';

export async function fetchBuildInfo(competitor: Competitor): Promise<BuildInfo | null> {
  const browser = await puppeteer.launch({
    args: ['--headless', '--no-sandbox', '--hide-scrollbars'],
    channel: 'chrome',
  });

  try {
    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();

    await page.goto(competitor.url);

    const commitHash = (await page.evaluate(
      // @ts-expect-error window.__BUILD_INFO__ must be available
      () => window.__BUILD_INFO__?.COMMIT_HASH,
    )) as string;
    const buildDate = (await page.evaluate(
      // @ts-expect-error window.__BUILD_INFO__ must be available
      () => window.__BUILD_INFO__?.BUILD_DATE,
    )) as string;

    const buildInfo = {
      commitHash,
      buildDate,
    };

    logger.info('buildInfo: %o', buildInfo);

    return buildInfo;
  } catch (e) {
    logger.error(e);
    return null;
  } finally {
    await browser.close();
  }
}
