import { type Locator, type Page } from '@playwright/test';

export class AccountsOverviewPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly accountsTable: Locator;
  readonly accountLinks: Locator;
  readonly totalRow: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Accounts Overview' });
    this.accountsTable = page.getByRole('table');
    // Every account row links its number to activity.htm; the Total row has no link.
    this.accountLinks = this.accountsTable.getByRole('link');
    this.totalRow = this.accountsTable
      .getByRole('row')
      .filter({ has: page.getByRole('cell', { name: 'Total', exact: true }) });
  }

  async goto() {
    await this.page.getByRole('link', { name: 'Accounts Overview' }).click();
  }

  welcomeText(fullName: string): Locator {
    return this.page.getByText(`Welcome ${fullName}`);
  }

  accountLink(accountId: string): Locator {
    return this.accountsTable.getByRole('link', { name: accountId, exact: true });
  }

  accountRow(accountId: string): Locator {
    // `has` is resolved relative to the row, so it must not be scoped to the table.
    return this.accountsTable
      .getByRole('row')
      .filter({ has: this.page.getByRole('link', { name: accountId, exact: true }) });
  }
}
