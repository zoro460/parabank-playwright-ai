import { test as base, expect } from '../../fixtures/test';
import { AccountType, type Account, type Transaction } from '../../api/ParaBankApi';

/** A customer with two accounts: the default one and a second funded from it via the API. */
const test = base.extend<{ accountIds: { primary: number; secondary: number } }>({
  accountIds: async ({ api, apiCustomer: { customer, accounts } }, use) => {
    const primary = accounts[0].id;
    const created = await api.json<Account>(api.createAccount(customer.id, AccountType.CHECKING, primary));
    await use({ primary, secondary: created.id });
  },
});

test.describe('API: transfer funds', () => {
  test('transfer moves the amount between both accounts', { tag: '@smoke' }, async ({
    api,
    accountIds: { primary, secondary },
  }) => {
    // Balances are read first: the shared demo sometimes reuses accounts with old balances.
    const before = { primary: await api.balanceOf(primary), secondary: await api.balanceOf(secondary) };

    const res = await api.transfer(secondary, primary, 12.34);
    expect(res.status()).toBe(200);
    expect(await res.text()).toBe(
      `Successfully transferred $12.34 from account #${secondary} to account #${primary}`,
    );

    expect(await api.balanceOf(secondary)).toBeCloseTo(before.secondary - 12.34, 2);
    expect(await api.balanceOf(primary)).toBeCloseTo(before.primary + 12.34, 2);
  });

  test('transfer records a debit and a matching credit', { tag: '@regression' }, async ({
    api,
    accountIds: { primary, secondary },
  }) => {
    await api.text(api.transfer(secondary, primary, 7.25));

    const debit = await api.json<Transaction[]>(api.getTransactionsByAmount(secondary, 7.25));
    expect(debit).toContainEqual(expect.objectContaining({ type: 'Debit', description: 'Funds Transfer Sent' }));

    const credit = await api.json<Transaction[]>(api.getTransactionsByAmount(primary, 7.25));
    expect(credit).toContainEqual(
      expect.objectContaining({ type: 'Credit', description: 'Funds Transfer Received' }),
    );
  });

  test.describe('rejected requests', { tag: '@regression' }, () => {
    test('unknown destination account returns 400 and moves no money', async ({
      api,
      accountIds: { secondary },
    }) => {
      const before = await api.balanceOf(secondary);

      const res = await api.transfer(secondary, 99999999, 1);
      expect(res.status()).toBe(400);
      expect(await res.text()).toBe(`Could not find account number ${secondary} and/or 99999999`);
      expect(await api.balanceOf(secondary)).toBe(before);
    });

    test('non-numeric amount is a client error and moves no money', async ({
      api,
      accountIds: { primary, secondary },
    }) => {
      const before = await api.balanceOf(secondary);

      const res = await api.transfer(secondary, primary, 'abc');
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
      expect(await api.balanceOf(secondary)).toBe(before);
    });
  });

  test('negative amount is rejected (D15)', { tag: ['@regression', '@known-issue'] }, async ({
    api,
    accountIds: { primary, secondary },
  }) => {
    test.fail(true, 'D15: the API accepts negative transfer amounts (D1 at the API level)');
    const before = await api.balanceOf(secondary);

    const res = await api.transfer(secondary, primary, -5);
    expect(res.ok()).toBe(false);
    expect(await api.balanceOf(secondary)).toBe(before);
  });
});
