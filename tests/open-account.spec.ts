import { test, expect } from '../fixtures/test';
import { type AccountType } from '../pages/OpenAccountPage';
import { formatCurrency } from '../utils/money';

test.describe('Open New Account', () => {
  for (const type of ['CHECKING', 'SAVINGS'] as AccountType[]) {
    test(`opens a ${type} account funded from the default account`, { tag: type === 'CHECKING' ? '@smoke' : '@regression' }, async ({
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

  test('moves the $100 minimum deposit from the funding account', { tag: '@regression' }, async ({
    loggedInPage,
    openAccountPage,
    accountsOverviewPage,
  }) => {
    await accountsOverviewPage.goto();
    await expect(accountsOverviewPage.accountLinks).toHaveCount(1);
    const fundingAccountId = (await accountsOverviewPage.accountLinks.innerText()).trim();
    // Usually $100.00, but the shared demo sometimes hands out account ids that already
    // carry old transactions, so compare against the balance read here.
    const before = await accountsOverviewPage.balanceOf(fundingAccountId);

    await openAccountPage.goto();
    const newAccountId = await openAccountPage.openAccount('CHECKING', fundingAccountId);

    await accountsOverviewPage.goto();
    await expect(accountsOverviewPage.accountLinks).toHaveCount(2);
    await expect(accountsOverviewPage.balanceCell(fundingAccountId)).toHaveText(formatCurrency(before - 100));
    await expect(accountsOverviewPage.balanceCell(newAccountId)).toHaveText('$100.00');
    await expect(accountsOverviewPage.totalRow).toContainText(formatCurrency(before));
  });

  test('offers only CHECKING and SAVINGS account types', { tag: '@regression' }, async ({
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
