import { URL } from 'url';
// @ts-expect-error
import lighthouse from 'lighthouse';
import axios from 'axios';
import { createErr, createOk, Result } from 'option-t/cjs/PlainResult';
import * as chromeLauncher from 'chrome-launcher';

import type { Competitor, HackathonScore, LighthouseScore, LighthouseScoreList } from './types';
import { logger } from './logger';

async function measurePage(url: string): Promise<LighthouseScore> {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--hide-scrollbars'],
  });

  const settings = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance'],
    onlyAudits: [
      'first-contentful-paint',
      'speed-index',
      'largest-contentful-paint',
      'interactive',
      'total-blocking-time',
      'cumulative-layout-shift',
    ],
    port: chrome.port,
  };
  const config = {
    extends: 'lighthouse:default',
  };

  try {
    const runnerResult = await lighthouse(url, settings, config);
    const lhr = runnerResult.lhr;
    const result: LighthouseScore = {
      score: (lhr.categories.performance?.score ?? 0) * 100,
      firstContentfulPaint: lhr.audits['first-contentful-paint']?.score ?? 0,
      speedIndex: lhr.audits['speed-index']?.score ?? 0,
      largestContentfulPaint: lhr.audits['largest-contentful-paint']?.score ?? 0,
      timeToInteractive: lhr.audits['interactive']?.score ?? 0,
      totalBlockingTime: lhr.audits['total-blocking-time']?.score ?? 0,
      cumulativeLayoutShift: lhr.audits['cumulative-layout-shift']?.score ?? 0,
    };

    return result;
  } finally {
    await chrome.kill();
  }
}

async function measurePages(entrypoint: string, paths: string[]): Promise<LighthouseScoreList> {
  const result: LighthouseScoreList = {};

  for (const path of paths) {
    const url = new URL(path, entrypoint);

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('target url is invalid.');
    }

    logger.debug('Target URL: %s', url.href);

    // Check HTTP status before actually running Lighthouse
    const res = await axios(url.href, { method: 'GET', validateStatus: () => true });

    if (res.status !== 200) {
      throw new Error(`target url returns ${res.status}: ${res.statusText}`);
    }

    const lighthouseScore = await measurePage(url.href);

    logger.debug('Lighthouse: %o', lighthouseScore);

    result[path] = lighthouseScore;
  }

  return result;
}

function calculateHackathonScore(lighthouseScores: LighthouseScoreList): HackathonScore {
  // Each metric is within [0, 1] and with up to two fractional digits.
  // https://github.com/GoogleChrome/lighthouse/blob/138541a754523ae4e038a658ce3088fb981d8c83/lighthouse-core/audits/audit.js#L71-L98
  //
  // Calculate a score using the same weights as Lighthouse 8 without rounding
  // to get more precised performance score.
  // https://web.dev/performance-scoring/#lighthouse-8
  //
  // To avoid hiccups related to floating-point arithmetic,
  // all metrics are firstly scaled up by 100.
  const integerisedScore = Object.values(lighthouseScores).reduce((sum, lh) => {
    return (
      sum +
      lh.firstContentfulPaint * 100 * 10 +
      lh.speedIndex * 100 * 10 +
      lh.largestContentfulPaint * 100 * 25 +
      lh.timeToInteractive * 100 * 10 +
      lh.totalBlockingTime * 100 * 30 +
      lh.cumulativeLayoutShift * 100 * 15
    );
  }, 0);

  // Divide the score by 100 to get a performance score
  // with up to two fractional digits preserving the original scale.
  const score = integerisedScore / 100;

  return {
    score,
    lighthouseScores,
  };
}

export async function measureCompetitor(
  competitor: Competitor,
  targetPaths: string[],
): Promise<Result<HackathonScore, Error>> {
  logger.info('Competitor: %s', competitor.id);

  try {
    const lighthouseScores = await measurePages(competitor.url, targetPaths);
    const hackathonScore = calculateHackathonScore(lighthouseScores);

    logger.info('Score: %d', hackathonScore.score);

    return createOk(hackathonScore);
  } catch (e: unknown) {
    if (e instanceof Error) {
      return createErr(e);
    } else {
      return createErr(new Error('unexpected error.'));
    }
  }
}
