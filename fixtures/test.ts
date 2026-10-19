import { test as base, expect, type Page } from '@playwright/test';
import { randomBytes } from 'crypto';
import { RegisterPage, type UserData } from '../pages/RegisterPage';
import { LoginPage } from '../pages/LoginPage';
import { AccountsOverviewPage } from '../pages/AccountsOverviewPage';
import { OpenAccountPage } from '../pages/OpenAccountPage';

type Fixtures = {
  /** Unique user data for this test; not registered yet. */
  newUser: UserData;
  /** A user registered in a separate context; the test's `page` starts logged out. */
  registeredUser: UserData;
  /** The test's `page`, logged in as `newUser` (registered through the UI). */
  loggedInPage: Page;
  registerPage: RegisterPage;
  loginPage: LoginPage;
  accountsOverviewPage: AccountsOverviewPage;
  openAccountPage: OpenAccountPage;
};

function uniqueUsername(): string {
  return `pw${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
}

async function registerThroughUi(page: Page, user: UserData) {
  const registerPage = new RegisterPage(page);
  await registerPage.register(user);

  const welcome = registerPage.welcomeHeading(user.username);
  // The public demo sits behind a bot check that occasionally interrupts automated traffic.
  const botCheck = page.getByRole('heading', { name: 'Performing security verification' });
  await expect(welcome.or(botCheck), `registration of ${user.username} failed`).toBeVisible();
  if (await botCheck.isVisible()) {
    throw new Error(
      `Registration of ${user.username} was blocked by the site's bot check (environment issue, not an app failure).`,
    );
  }
}

export const test = base.extend<Fixtures>({
  newUser: async ({}, use) => {
    const password = process.env.TEST_USER_PASSWORD;
    if (!password) throw new Error('TEST_USER_PASSWORD is not set in .env');
    await use({
      firstName: 'Test',
      lastName: 'User',
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      phone: '5551234567',
      ssn: '123-45-6789',
      username: uniqueUsername(),
      password,
    });
  },

  registeredUser: async ({ browser, baseURL, newUser }, use) => {
    const context = await browser.newContext({ baseURL });
    try {
      await registerThroughUi(await context.newPage(), newUser);
    } finally {
      await context.close();
    }
    await use(newUser);
  },

  loggedInPage: async ({ page, newUser }, use) => {
    // ParaBank logs the user in as part of registration.
    await registerThroughUi(page, newUser);
    await use(page);
  },

  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  accountsOverviewPage: async ({ page }, use) => use(new AccountsOverviewPage(page)),
  openAccountPage: async ({ page }, use) => use(new OpenAccountPage(page)),
});

export { expect };
