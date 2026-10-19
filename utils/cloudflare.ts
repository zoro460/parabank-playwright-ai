import { test, expect, type Locator, type Page } from '@playwright/test';

/*
 * The public demo sits behind Cloudflare, which interrupts automated traffic far more often
 * from CI runners than from a home connection: a bot check that may clear on its own, or a
 * rate-limit ban (Error 1015) that lasts minutes. Either is an environment issue, not an app
 * failure, so the test is skipped. A skip is not retried, so a blocked run does not burn the
 * full timeout three times over (and retries would only extend the ban).
 */

function botCheck(page: Page): Locator {
  return page.getByRole('heading', { name: 'Performing security verification' });
}

function rateLimit(page: Page): Locator {
  return page.getByRole('heading', { name: 'You are being rate limited' });
}

/** Skips the test if a Cloudflare page is showing instead of ParaBank. */
export async function skipIfBlocked(page: Page, what: string) {
  const reason = `${what} was blocked by Cloudflare's`;
  test.skip(await rateLimit(page).isVisible(), `${reason} rate limit (environment issue, not an app failure).`);
  if (!(await botCheck(page).isVisible())) return;
  await expect(botCheck(page)).toBeHidden().catch(() => {});
  test.skip(await botCheck(page).isVisible(), `${reason} bot check (environment issue, not an app failure).`);
}

/** Waits for `ready` to show, or skips the test if Cloudflare blocks the page instead. */
export async function expectLoadedOrSkip(page: Page, ready: Locator, what: string) {
  await expect(ready.or(botCheck(page)).or(rateLimit(page)), `${what} did not load`).toBeVisible();
  await skipIfBlocked(page, what);
  await expect(ready, `${what} did not load`).toBeVisible();
}
