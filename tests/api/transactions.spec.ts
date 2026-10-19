import { test as base, expect } from '../../fixtures/test';
import { AccountType, toParaBankDate, type Account, type Transaction } from '../../api/ParaBankApi';

const AMOUNT = 12.34;

/**
 * A fresh second account with exactly two transactions: the $100 opening deposit (Credit)
 * and a $12.34 transfer out (Debit). A fresh account keeps the expectations exact.
 */
const test = base.extend<{ account: { id: number; otherId: number } }>({
  account: async ({ api, apiCustomer: { customer, accounts } }, use) => {
    const otherId = accounts[0].id;
    const created = await api.json<Account>(api.createAccount(customer.id, AccountType.CHECKING, otherId));
    await api.text(api.transfer(created.id, otherId, AMOUNT));
    await use({ id: created.id, otherId });
  },
});

test.describe('API: transactions', () => {
  test('lists all transactions of an account', { tag: '@smoke' }, async ({ api, account }) => {
    const transactions = await api.json<Transaction[]>(api.getTransactions(account.id));

    expect(transactions).toHaveLength(2);
    expect(transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: account.id, type: 'Credit', amount: 100, description: 'Funds Transfer Received' }),
        expect.objectContaining({ accountId: account.id, type: 'Debit', amount: AMOUNT, description: 'Funds Transfer Sent' }),
      ]),
    );
    for (const t of transactions) {
      expect(t).toEqual({
        id: expect.any(Number),
        accountId: account.id,
        type: expect.stringMatching(/^(Credit|Debit)$/),
        date: expect.any(Number),
        amount: expect.any(Number),
        description: expect.any(String),
      });
    }
  });

  test('gets a single transaction by id', { tag: '@regression' }, async ({ api, account }) => {
    const [first] = await api.json<Transaction[]>(api.getTransactions(account.id));

    const fetched = await api.json<Transaction>(api.getTransaction(first.id));
    expect(fetched).toEqual(first);
  });

  test.describe('filters', { tag: '@regression' }, () => {
    test('by amount', async ({ api, account }) => {
      const result = await api.json<Transaction[]>(api.getTransactionsByAmount(account.id, AMOUNT));
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ amount: AMOUNT, type: 'Debit' });
    });

    test('by date range', async ({ api, account }) => {
      // A window around today avoids depending on the server's time zone.
      const day = 24 * 60 * 60 * 1000;
      const from = toParaBankDate(new Date(Date.now() - day));
      const to = toParaBankDate(new Date(Date.now() + day));

      const result = await api.json<Transaction[]>(api.getTransactionsByDateRange(account.id, from, to));
      expect(result).toHaveLength(2);
    });

    test('by month and type', async ({ api, account }) => {
      const debits = await api.json<Transaction[]>(api.getTransactionsByMonthAndType(account.id, 'All', 'Debit'));
      expect(debits).toHaveLength(1);
      expect(debits[0].type).toBe('Debit');

      const credits = await api.json<Transaction[]>(api.getTransactionsByMonthAndType(account.id, 'All', 'Credit'));
      expect(credits).toHaveLength(1);
      expect(credits[0].type).toBe('Credit');
    });

    test('amount with no matches returns an empty list', async ({ api, account }) => {
      const result = await api.json<Transaction[]>(api.getTransactionsByAmount(account.id, 999.99));
      expect(result).toEqual([]);
    });
  });

  test.describe('not found', { tag: '@regression' }, () => {
    test('unknown transaction id returns 400', async ({ api }) => {
      const res = await api.getTransaction(99999999);
      expect(res.status()).toBe(400);
      expect(await res.text()).toBe('Could not find transaction #99999999');
    });

    test('transactions of an unknown account returns 400', async ({ api }) => {
      const res = await api.getTransactions(99999999);
      expect(res.status()).toBe(400);
      expect(await res.text()).toBe('Could not find transactions for account #99999999');
    });
  });
});
