import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';

export type Customer = {
  id: number;
  firstName: string;
  lastName: string;
  address: { street: string; city: string; state: string; zipCode: string };
  phoneNumber: string;
  ssn: string;
};

export type Account = {
  id: number;
  customerId: number;
  type: 'CHECKING' | 'SAVINGS' | 'LOAN';
  balance: number;
};

export type Transaction = {
  id: number;
  accountId: number;
  type: 'Credit' | 'Debit';
  /** Epoch milliseconds. */
  date: number;
  amount: number;
  description: string;
};

export const AccountType = { CHECKING: 0, SAVINGS: 1 } as const;

/**
 * Thin client for ParaBank's REST API (`{BASE_URL}/services/bank`). Methods return the raw
 * APIResponse so tests can assert status codes and error bodies; `json()` helpers assert
 * success first and return typed data.
 *
 * Never call cleanDB / initializeDB: the instance is shared and they wipe everyone's data.
 */
export class ParaBankApi {
  // Relative to the config baseURL, which ends with "/parabank/".
  private static readonly root = 'services/bank';

  constructor(private readonly request: APIRequestContext) {}

  private get(path: string) {
    return this.send(() =>
      this.request.get(`${ParaBankApi.root}/${path}`, { headers: { Accept: 'application/json' } }),
    );
  }

  private post(path: string, params: Record<string, string | number>) {
    return this.send(() =>
      this.request.post(`${ParaBankApi.root}/${path}`, {
        headers: { Accept: 'application/json' },
        params,
      }),
    );
  }

  /**
   * The demo sits behind Cloudflare, which answers bursts with 429 and a retry delay.
   * Honour that delay (a server-requested back-off, not a timing guess) a couple of times,
   * then hand the 429 to the test so it fails visibly.
   */
  private async send(call: () => Promise<APIResponse>, maxRetries = 2): Promise<APIResponse> {
    for (let attempt = 0; ; attempt++) {
      const res = await call();
      if (res.status() !== 429 || attempt >= maxRetries) return res;
      const delay = await retryAfterMs(res);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  login(username: string, password: string) {
    return this.get(`login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`);
  }

  getCustomer(customerId: number) {
    return this.get(`customers/${customerId}`);
  }

  getCustomerAccounts(customerId: number) {
    return this.get(`customers/${customerId}/accounts`);
  }

  getAccount(accountId: number) {
    return this.get(`accounts/${accountId}`);
  }

  createAccount(customerId: number, type: number, fromAccountId: number) {
    return this.post('createAccount', { customerId, newAccountType: type, fromAccountId });
  }

  transfer(fromAccountId: number, toAccountId: number, amount: number | string) {
    return this.post('transfer', { fromAccountId, toAccountId, amount });
  }

  getTransactions(accountId: number) {
    return this.get(`accounts/${accountId}/transactions`);
  }

  getTransaction(transactionId: number) {
    return this.get(`transactions/${transactionId}`);
  }

  getTransactionsByAmount(accountId: number, amount: number) {
    return this.get(`accounts/${accountId}/transactions/amount/${amount}`);
  }

  /** Dates are MM-DD-YYYY. */
  getTransactionsByDateRange(accountId: number, fromDate: string, toDate: string) {
    return this.get(`accounts/${accountId}/transactions/fromDate/${fromDate}/toDate/${toDate}`);
  }

  /** month: 'All' or a month name; type: 'All' | 'Credit' | 'Debit'. */
  getTransactionsByMonthAndType(accountId: number, month: string, type: string) {
    return this.get(`accounts/${accountId}/transactions/month/${month}/type/${type}`);
  }

  async json<T>(response: Promise<APIResponse> | APIResponse): Promise<T> {
    const res = await response;
    expect(res.ok(), `${res.url()} -> ${res.status()}: ${await res.text()}`).toBe(true);
    return (await res.json()) as T;
  }

  /** For endpoints that answer with plain text (e.g. transfer), despite a JSON content type. */
  async text(response: Promise<APIResponse> | APIResponse): Promise<string> {
    const res = await response;
    const body = await res.text();
    expect(res.ok(), `${res.url()} -> ${res.status()}: ${body}`).toBe(true);
    return body;
  }

  async balanceOf(accountId: number): Promise<number> {
    return (await this.json<Account>(this.getAccount(accountId))).balance;
  }
}

async function retryAfterMs(res: APIResponse): Promise<number> {
  const header = Number(res.headers()['retry-after']);
  if (header > 0) return header * 1000;
  try {
    const body = (await res.json()) as { retry_after?: number };
    if (body.retry_after && body.retry_after > 0) return body.retry_after * 1000;
  } catch {
    // Non-JSON 429 body: fall through to the default.
  }
  return 30_000;
}

/** Formats a Date as ParaBank's MM-DD-YYYY. */
export function toParaBankDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}-${dd}-${date.getFullYear()}`;
}
