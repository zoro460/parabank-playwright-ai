import { expect, type Locator, type Page } from '@playwright/test';
import { expectLoadedOrSkip } from '../utils/cloudflare';

export class TransferFundsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly amountInput: Locator;
  readonly fromAccountSelect: Locator;
  readonly toAccountSelect: Locator;
  readonly transferButton: Locator;
  readonly successHeading: Locator;
  readonly successMessage: Locator;
  readonly errorHeading: Locator;
  readonly internalErrorMessage: Locator;
  readonly amountEmptyMessage: Locator;
  readonly amountInvalidMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Transfer Funds' });
    // The amount input and both dropdowns have no accessible label, so use their ids.
    this.amountInput = page.locator('#amount');
    this.fromAccountSelect = page.locator('#fromAccountId');
    this.toAccountSelect = page.locator('#toAccountId');
    this.transferButton = page.getByRole('button', { name: 'Transfer' });
    this.successHeading = page.getByRole('heading', { name: 'Transfer Complete!' });
    this.successMessage = page.locator('#showResult');
    this.errorHeading = page.getByRole('heading', { name: 'Error!' });
    this.internalErrorMessage = page.getByText('An internal error has occurred and has been logged.');
    this.amountEmptyMessage = page.getByText('The amount cannot be empty.');
    this.amountInvalidMessage = page.getByText('Please enter a valid amount.');
  }

  async goto() {
    await this.page.getByRole('link', { name: 'Transfer Funds' }).click();
    await expectLoadedOrSkip(this.page, this.heading, 'Transfer Funds page');
    // Account options are loaded via AJAX after the page renders.
    await expect(this.fromAccountSelect.getByRole('option')).not.toHaveCount(0);
  }

  /** Submits a transfer and waits for the server to answer, whatever the outcome. */
  async transfer(amount: string, fromAccountId: string, toAccountId: string) {
    await this.amountInput.fill(amount);
    await this.fromAccountSelect.selectOption(fromAccountId);
    await this.toAccountSelect.selectOption(toAccountId);
    await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/services_proxy/bank/transfer')),
      this.transferButton.click(),
    ]);
    await expect(this.successHeading.or(this.errorHeading)).toBeVisible();
  }
}
