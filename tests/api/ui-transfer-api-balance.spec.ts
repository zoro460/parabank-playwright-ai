import { test, expect } from '../../fixtures/test';
import { type Transaction } from '../../api/ParaBankApi';

test.describe('UI + API', () => {
  test('a transfer made in the UI is reflected in API balances', { tag: '@smoke' }, async ({
    api,
    twoAccounts: { primaryId, secondaryId },
    transferFundsPage,
  }) => {
    const from = Number(secondaryId);
    const to = Number(primaryId);
    const before = { from: await api.balanceOf(from), to: await api.balanceOf(to) };

    await transferFundsPage.goto();
    await transferFundsPage.transfer('33.33', secondaryId, primaryId);
    await expect(transferFundsPage.successHeading).toBeVisible();

    expect(await api.balanceOf(from)).toBeCloseTo(before.from - 33.33, 2);
    expect(await api.balanceOf(to)).toBeCloseTo(before.to + 33.33, 2);

    const debits = await api.json<Transaction[]>(api.getTransactionsByAmount(from, 33.33));
    expect(debits).toContainEqual(
      expect.objectContaining({ type: 'Debit', description: 'Funds Transfer Sent' }),
    );
  });
});
