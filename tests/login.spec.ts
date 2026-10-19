import { test, expect } from '../fixtures/test';

test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('valid credentials open the accounts overview', async ({
    page,
    registeredUser,
    loginPage,
    accountsOverviewPage,
  }) => {
    await loginPage.login(registeredUser.username, registeredUser.password);

    await expect(page).toHaveURL(/overview\.htm/);
    await expect(accountsOverviewPage.heading).toBeVisible();
    await expect(
      accountsOverviewPage.welcomeText(`${registeredUser.firstName} ${registeredUser.lastName}`),
    ).toBeVisible();
    await expect(loginPage.logoutLink).toBeVisible();
  });

  test('invalid password is rejected', async ({ registeredUser, loginPage }) => {
    await loginPage.login(registeredUser.username, `${registeredUser.password}-wrong`);

    await expect(loginPage.errorHeading).toBeVisible();
    await expect(
      loginPage.errorMessage('The username and password could not be verified.'),
    ).toBeVisible();
    await expect(loginPage.logoutLink).toBeHidden();
  });

  test('empty username and password are rejected', async ({ loginPage }) => {
    await loginPage.login('', '');

    await expect(loginPage.errorHeading).toBeVisible();
    await expect(loginPage.errorMessage('Please enter a username and password.')).toBeVisible();
    await expect(loginPage.logoutLink).toBeHidden();
  });
});
