import { test, expect } from '../fixtures/test';
import { type AccountType } from '../pages/OpenAccountPage';

test.describe('Open New Account', () => {
  for (const type of ['CHECKING', 'SAVINGS'] as AccountType[]) {
    test(`opens a ${type} account funded from the default account`, async ({
      loggedInPage: page,
      openAccountPage,
      accountsOverviewPage,
    }) => {
      await accountsOverviewPage.goto();
      await expect(accountsOverviewPage.accountLinks).toHaveCount(1);
      const fundingAccountId = (await accountsOverviewPage.accountLinks.innerText()).trim();

      await openAccountPage.goto();
      const newAccountId = await openAccountPage.openAccount(type, fundingAccountId);

      await expect(openAccountPage.successMessage).toBeVisible();
      expect(newAccountId).toMatch(/^\d+$/);
      expect(newAccountId).not.toBe(fundingAccountId);

      await openAccountPage.newAccountLink.click();
      await expect(page).toHaveURL(new RegExp(`activity\\.htm\\?id=${newAccountId}$`));
      await expect(page.getByRole('cell', { name: type, exact: true })).toBeVisible();
    });
  }

  test('moves the $100 minimum deposit from the funding account', async ({
    loggedInPage,
    openAccountPage,
    accountsOverviewPage,
  }) => {
    await accountsOverviewPage.goto();
    await expect(accountsOverviewPage.accountLinks).toHaveCount(1);
    const fundingAccountId = (await accountsOverviewPage.accountLinks.innerText()).trim();
    await expect(accountsOverviewPage.accountRow(fundingAccountId)).toContainText('$100.00');

    await openAccountPage.goto();
    const newAccountId = await openAccountPage.openAccount('CHECKING', fundingAccountId);

    await accountsOverviewPage.goto();
    await expect(accountsOverviewPage.accountLinks).toHaveCount(2);
    await expect(accountsOverviewPage.accountRow(fundingAccountId).getByRole('cell').nth(1)).toHaveText('$0.00');
    await expect(accountsOverviewPage.accountRow(newAccountId).getByRole('cell').nth(1)).toHaveText('$100.00');
    await expect(accountsOverviewPage.totalRow).toContainText('$100.00');
  });

  test('offers only CHECKING and SAVINGS account types', async ({
    loggedInPage,
    openAccountPage,
  }) => {
    await openAccountPage.goto();
    await expect(openAccountPage.accountTypeSelect.getByRole('option')).toHaveText([
      'CHECKING',
      'SAVINGS',
    ]);
  });
});
