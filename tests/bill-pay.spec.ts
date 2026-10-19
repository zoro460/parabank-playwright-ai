import { test, expect } from '../fixtures/test';
import { type Payee } from '../pages/BillPayPage';
import { formatCurrency } from '../utils/money';

const payee: Payee = {
  name: 'Electric Co',
  street: '1 Power Rd',
  city: 'Springfield',
  state: 'IL',
  zipCode: '62701',
  phone: '5550001111',
  accountNumber: '12345',
};

test.describe('Bill Pay', () => {
  test('pays a bill and debits the source account', { tag: '@smoke' }, async ({
    loggedInPage,
    billPayPage,
    accountsOverviewPage,
  }) => {
    await accountsOverviewPage.goto();
    await expect(accountsOverviewPage.accountLinks).toHaveCount(1);
    const accountId = (await accountsOverviewPage.accountLinks.innerText()).trim();
    const before = await accountsOverviewPage.balanceOf(accountId);

    await billPayPage.goto();
    await billPayPage.fillForm(payee, '15', accountId);
    await billPayPage.sendPayment();

    await expect(billPayPage.successHeading).toBeVisible();
    await expect(billPayPage.successMessage).toContainText(
      `Bill Payment to ${payee.name} in the amount of $15.00 from account ${accountId} was successful.`,
    );
    await accountsOverviewPage.goto();
    await expect(accountsOverviewPage.balanceCell(accountId)).toHaveText(formatCurrency(before - 15));
  });

  test.describe('validation', { tag: '@regression' }, () => {
    test.beforeEach(async ({ loggedInPage, billPayPage }) => {
      await billPayPage.goto();
    });

    test('empty form shows a required message for every field', async ({ billPayPage }) => {
      await billPayPage.sendPayment();

      const expected: [string, string][] = [
        ['Payee Name:', 'Payee name is required.'],
        ['Address:', 'Address is required.'],
        ['City:', 'City is required.'],
        ['State:', 'State is required.'],
        ['Zip Code:', 'Zip Code is required.'],
        ['Phone #:', 'Phone number is required.'],
        ['Account #:', 'Account number is required.'],
        ['Verify Account #:', 'Account number is required.'],
        ['Amount: $', 'The amount cannot be empty.'],
      ];
      for (const [field, message] of expected) {
        await expect(billPayPage.fieldError(field, message), field).toBeVisible();
      }
      await expect(billPayPage.successHeading).toBeHidden();
    });

    test('mismatched account numbers are rejected', async ({ billPayPage }) => {
      await billPayPage.fillForm({ ...payee, verifyAccountNumber: '54321' }, '10');
      await billPayPage.sendPayment();

      await expect(
        billPayPage.fieldError('Verify Account #:', 'The account numbers do not match.'),
      ).toBeVisible();
      await expect(billPayPage.successHeading).toBeHidden();
    });

    test('non-numeric account numbers and amount are rejected', async ({ billPayPage }) => {
      await billPayPage.fillForm({ ...payee, accountNumber: 'abc' }, 'xyz');
      await billPayPage.sendPayment();

      await expect(billPayPage.fieldError('Account #:', 'Please enter a valid number.')).toBeVisible();
      await expect(
        billPayPage.fieldError('Verify Account #:', 'Please enter a valid number.'),
      ).toBeVisible();
      await expect(billPayPage.fieldError('Amount: $', 'Please enter a valid amount.')).toBeVisible();
      await expect(billPayPage.successHeading).toBeHidden();
    });
  });
});
