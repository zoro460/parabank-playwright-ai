import { expect, type Locator, type Page } from '@playwright/test';
import { expectLoadedOrSkip } from '../utils/cloudflare';
import { formRow } from './formRow';

export type Payee = {
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  accountNumber: string;
  verifyAccountNumber?: string;
};

export class BillPayPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly fromAccountSelect: Locator;
  readonly sendPaymentButton: Locator;
  readonly successHeading: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Bill Payment Service' });
    this.fromAccountSelect = formRow(page, 'From account #:').getByRole('combobox');
    this.sendPaymentButton = page.getByRole('button', { name: 'Send Payment' });
    this.successHeading = page.getByRole('heading', { name: 'Bill Payment Complete' });
    this.successMessage = page.locator('#billpayResult');
  }

  async goto() {
    await this.page.getByRole('link', { name: 'Bill Pay' }).click();
    await expectLoadedOrSkip(this.page, this.heading, 'Bill Pay page');
    await expect(this.fromAccountSelect.getByRole('option')).not.toHaveCount(0);
  }

  row(label: string): Locator {
    return formRow(this.page, label);
  }

  field(label: string): Locator {
    return this.row(label).getByRole('textbox');
  }

  /** A validation message shown in the row of the given field. */
  fieldError(label: string, message: string): Locator {
    return this.row(label).getByText(message, { exact: true });
  }

  async fillForm(payee: Payee, amount: string, fromAccountId?: string) {
    await this.field('Payee Name:').fill(payee.name);
    await this.field('Address:').fill(payee.street);
    await this.field('City:').fill(payee.city);
    await this.field('State:').fill(payee.state);
    await this.field('Zip Code:').fill(payee.zipCode);
    await this.field('Phone #:').fill(payee.phone);
    await this.field('Account #:').fill(payee.accountNumber);
    await this.field('Verify Account #:').fill(payee.verifyAccountNumber ?? payee.accountNumber);
    await this.field('Amount: $').fill(amount);
    if (fromAccountId) {
      await this.fromAccountSelect.selectOption(fromAccountId);
    }
  }

  async sendPayment() {
    await this.sendPaymentButton.click();
  }
}
