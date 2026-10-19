import { test, expect } from '../../fixtures/test';
import { AccountType, type Account, type Customer } from '../../api/ParaBankApi';

test.describe('API: customers and accounts', () => {
  test('login returns the registered customer', { tag: '@regression' }, async ({ api, apiCustomer }) => {
    const { user, customer } = apiCustomer;
    expect(customer).toMatchObject({
      firstName: user.firstName,
      lastName: user.lastName,
      address: { street: user.street, city: user.city, state: user.state, zipCode: user.zipCode },
    });

    const fetched = await api.json<Customer>(api.getCustomer(customer.id));
    expect(fetched).toEqual(customer);
  });

  test('login with a wrong password is rejected', { tag: '@regression' }, async ({ api, apiCustomer }) => {
    const res = await api.login(apiCustomer.user.username, 'definitely-wrong');
    expect(res.status()).toBe(400);
    expect(await res.text()).toBe('Invalid username and/or password');
  });

  test('get customer accounts returns the default checking account', { tag: '@smoke' }, async ({
    api,
    apiCustomer: { customer },
  }) => {
    const res = await api.getCustomerAccounts(customer.id);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');

    const accounts = (await res.json()) as Account[];
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toEqual({
      id: expect.any(Number),
      customerId: customer.id,
      type: 'CHECKING',
      balance: expect.any(Number),
    });
  });

  test('get account by id matches the customer account list', { tag: '@smoke' }, async ({
    api,
    apiCustomer: { accounts },
  }) => {
    const account = await api.json<Account>(api.getAccount(accounts[0].id));
    expect(account).toEqual(accounts[0]);
  });

  test('a newly created account is listed and holds the $100 opening deposit', { tag: '@regression' }, async ({
    api,
    apiCustomer: { customer, accounts },
  }) => {
    const fundingId = accounts[0].id;
    const fundingBefore = await api.balanceOf(fundingId);

    const created = await api.json<Account>(api.createAccount(customer.id, AccountType.SAVINGS, fundingId));
    expect(created).toMatchObject({ customerId: customer.id, type: 'SAVINGS' });

    const listed = await api.json<Account[]>(api.getCustomerAccounts(customer.id));
    expect(listed.map((a) => a.id)).toEqual(expect.arrayContaining([fundingId, created.id]));
    expect(await api.balanceOf(created.id)).toBe(100);
    expect(await api.balanceOf(fundingId)).toBeCloseTo(fundingBefore - 100, 2);
  });

  test.describe('not found', { tag: '@regression' }, () => {
    test('unknown account id returns 400', async ({ api }) => {
      const res = await api.getAccount(99999999);
      expect(res.status()).toBe(400);
      expect(await res.text()).toBe('Could not find account #99999999');
    });

    test('accounts of an unknown customer returns 400', async ({ api }) => {
      const res = await api.getCustomerAccounts(99999999);
      expect(res.status()).toBe(400);
      expect(await res.text()).toBe('Could not find customer #99999999');
    });
  });

  test.describe('known issues', { tag: ['@regression', '@known-issue'] }, () => {
    test('customer data requires authentication (D13)', async ({ api, apiCustomer: { customer } }) => {
      test.fail(true, 'D13: the API serves any customer and account to unauthenticated callers');
      // The `request` fixture carries no session, so this is an anonymous call.
      const res = await api.getCustomer(customer.id);
      expect([401, 403]).toContain(res.status());
    });

    test('createAccount response reports the funded balance (D14)', async ({
      api,
      apiCustomer: { customer, accounts },
    }) => {
      test.fail(true, 'D14: createAccount responds with balance 0 although the account holds $100');
      const created = await api.json<Account>(api.createAccount(customer.id, AccountType.CHECKING, accounts[0].id));
      expect(created.balance).toBe(100);
    });
  });
});
