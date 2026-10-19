import { test, expect } from '../fixtures/test';
import { formatCurrency } from '../utils/money';

test.describe('Request Loan', () => {
  let accountId: string;

  test.beforeEach(async ({ loggedInPage, accountsOverviewPage }) => {
    await accountsOverviewPage.goto();
    await expect(accountsOverviewPage.accountLinks).toHaveCount(1);
    accountId = (await accountsOverviewPage.accountLinks.innerText()).trim();
  });

  test('approves an affordable loan and opens a loan account', { tag: '@smoke' }, async ({
    requestLoanPage,
    accountsOverviewPage,
  }) => {
    const before = await accountsOverviewPage.balanceOf(accountId);

    await requestLoanPage.goto();
    await requestLoanPage.apply('200', '20', accountId);

    await expect(requestLoanPage.resultHeading).toBeVisible();
    await expect(requestLoanPage.providerCell).toHaveText('ParaBank');
    await expect(requestLoanPage.dateCell).toHaveText(/^\d{2}-\d{2}-\d{4}$/);
    await expect(requestLoanPage.statusCell).toHaveText('Approved');
    await expect(requestLoanPage.approvedMessage).toBeVisible();
    const loanAccountId = (await requestLoanPage.newAccountLink.innerText()).trim();
    expect(loanAccountId).toMatch(/^\d+$/);

    await accountsOverviewPage.goto();
    await expect(accountsOverviewPage.accountLinks).toHaveCount(2);
    await expect(accountsOverviewPage.balanceCell(loanAccountId)).toHaveText('$200.00');
    await expect(accountsOverviewPage.balanceCell(accountId)).toHaveText(formatCurrency(before - 20));
  });

  test.describe('denials', { tag: '@regression' }, () => {
    test('denies a loan too large for the available funds', async ({
      requestLoanPage,
      accountsOverviewPage,
    }) => {
      await requestLoanPage.goto();
      await requestLoanPage.apply('1000000', '10', accountId);

      await expect(requestLoanPage.statusCell).toHaveText('Denied');
      await expect(
        requestLoanPage.deniedMessage('We cannot grant a loan in that amount with your available funds.'),
      ).toBeVisible();
      await expect(requestLoanPage.approvedMessage).toBeHidden();

      await accountsOverviewPage.goto();
      await expect(accountsOverviewPage.accountLinks).toHaveCount(1);
    });

    test('denies a down payment larger than the account balance', async ({ requestLoanPage }) => {
      await requestLoanPage.goto();
      await requestLoanPage.apply('500', '5000', accountId);

      await expect(requestLoanPage.statusCell).toHaveText('Denied');
      await expect(
        requestLoanPage.deniedMessage('You do not have sufficient funds for the given down payment.'),
      ).toBeVisible();
    });
  });

  /*
   * Known defect D6: empty or non-numeric input gives a generic internal error instead of
   * field validation. Asserts the correct behaviour; test.fail() flips once it is fixed.
   */
  test.describe('input validation', { tag: ['@regression', '@known-issue'] }, () => {
    for (const [name, amount, downPayment] of [
      ['empty fields', '', ''],
      ['non-numeric loan amount', 'abc', '10'],
    ]) {
      test(`${name} does not cause an internal error (D6)`, async ({ requestLoanPage }) => {
        test.fail(true, `D6: ${name} shows a generic internal error`);

        await requestLoanPage.goto();
        await requestLoanPage.apply(amount, downPayment, accountId);

        await expect(requestLoanPage.errorHeading).toBeHidden();
      });
    }
  });
});
