import { test, expect } from '../fixtures/test';
import { type AccountsOverviewPage } from '../pages/AccountsOverviewPage';
import { formatCurrency } from '../utils/money';

/**
 * The shared demo occasionally credits other people's transfers into our accounts, so
 * balances are always compared against values read just before the action.
 */
async function readBalances(overview: AccountsOverviewPage, ...accountIds: string[]) {
  await overview.goto();
  const balances: Record<string, number> = {};
  for (const id of accountIds) balances[id] = await overview.balanceOf(id);
  return balances;
}

async function expectBalances(overview: AccountsOverviewPage, expected: Record<string, number>) {
  await overview.goto();
  for (const [id, amount] of Object.entries(expected)) {
    await expect(overview.balanceCell(id), `balance of account ${id}`).toHaveText(formatCurrency(amount));
  }
}

test.describe('Transfer Funds', () => {
  test('transfers between own accounts and updates both balances', { tag: '@smoke' }, async ({
    twoAccounts: { primaryId, secondaryId },
    transferFundsPage,
    accountsOverviewPage,
  }) => {
    const before = await readBalances(accountsOverviewPage, primaryId, secondaryId);

    await transferFundsPage.goto();
    await transferFundsPage.transfer('25', secondaryId, primaryId);

    await expect(transferFundsPage.successHeading).toBeVisible();
    await expect(transferFundsPage.successMessage).toContainText(
      `$25.00 has been transferred from account #${secondaryId} to account #${primaryId}.`,
    );
    await expectBalances(accountsOverviewPage, {
      [secondaryId]: before[secondaryId] - 25,
      [primaryId]: before[primaryId] + 25,
    });
  });

  test('transfers an amount with cents exactly', { tag: '@regression' }, async ({
    twoAccounts: { primaryId, secondaryId },
    transferFundsPage,
    accountsOverviewPage,
  }) => {
    const before = await readBalances(accountsOverviewPage, primaryId, secondaryId);

    await transferFundsPage.goto();
    await transferFundsPage.transfer('10.50', secondaryId, primaryId);

    await expect(transferFundsPage.successMessage).toContainText('$10.50 has been transferred');
    await expectBalances(accountsOverviewPage, {
      [secondaryId]: before[secondaryId] - 10.5,
      [primaryId]: before[primaryId] + 10.5,
    });
  });

  /*
   * Known defects (docs/test-scenarios.md D1–D4). Each test asserts the *correct* behaviour
   * and is marked test.fail(), so it starts failing loudly once ParaBank fixes the defect.
   */
  test.describe('rejects invalid transfers', { tag: ['@regression', '@known-issue'] }, () => {
    test('negative amount (D1)', async ({
      twoAccounts: { primaryId, secondaryId },
      transferFundsPage,
      accountsOverviewPage,
    }) => {
      test.fail(true, 'D1: ParaBank accepts negative transfer amounts');
      const before = await readBalances(accountsOverviewPage, primaryId, secondaryId);

      await transferFundsPage.goto();
      await transferFundsPage.transfer('-5', secondaryId, primaryId);

      await expect(transferFundsPage.successHeading).toBeHidden();
      await expectBalances(accountsOverviewPage, before);
    });

    test('amount greater than the available balance (D2)', async ({
      twoAccounts: { primaryId, secondaryId },
      transferFundsPage,
      accountsOverviewPage,
    }) => {
      test.fail(true, 'D2: ParaBank allows overdrawing the source account');
      const before = await readBalances(accountsOverviewPage, primaryId, secondaryId);

      await transferFundsPage.goto();
      await transferFundsPage.transfer(String(before[secondaryId] + 1000), secondaryId, primaryId);

      await expect(transferFundsPage.successHeading).toBeHidden();
      await expectBalances(accountsOverviewPage, before);
    });

    test('same source and destination account (D3)', async ({
      twoAccounts: { secondaryId },
      transferFundsPage,
    }) => {
      test.fail(true, 'D3: ParaBank accepts a transfer to the same account');

      await transferFundsPage.goto();
      await transferFundsPage.transfer('1', secondaryId, secondaryId);

      await expect(transferFundsPage.successHeading).toBeHidden();
    });

    test('empty amount shows a field validation message (D4)', async ({
      twoAccounts: { primaryId, secondaryId },
      transferFundsPage,
    }) => {
      test.fail(true, 'D4: empty amount shows a generic internal error instead');

      await transferFundsPage.goto();
      await transferFundsPage.transfer('', secondaryId, primaryId);

      await expect(transferFundsPage.amountEmptyMessage).toBeVisible();
    });

    test('non-numeric amount shows a field validation message (D4)', async ({
      twoAccounts: { primaryId, secondaryId },
      transferFundsPage,
    }) => {
      test.fail(true, 'D4: non-numeric amount shows a generic internal error instead');

      await transferFundsPage.goto();
      await transferFundsPage.transfer('abc', secondaryId, primaryId);

      await expect(transferFundsPage.amountInvalidMessage).toBeVisible();
    });
  });
});
