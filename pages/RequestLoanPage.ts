import { expect, type Locator, type Page } from '@playwright/test';
import { expectLoadedOrSkip } from '../utils/cloudflare';
import { formRow } from './formRow';

export class RequestLoanPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly loanAmountInput: Locator;
  readonly downPaymentInput: Locator;
  readonly fromAccountSelect: Locator;
  readonly applyButton: Locator;
  readonly resultHeading: Locator;
  readonly providerCell: Locator;
  readonly dateCell: Locator;
  readonly statusCell: Locator;
  readonly approvedMessage: Locator;
  readonly newAccountLink: Locator;
  readonly errorHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Apply for a Loan' });
    this.loanAmountInput = formRow(page, 'Loan Amount: $').getByRole('textbox');
    this.downPaymentInput = formRow(page, 'Down Payment: $').getByRole('textbox');
    this.fromAccountSelect = formRow(page, 'From account #:').getByRole('combobox');
    this.applyButton = page.getByRole('button', { name: 'Apply Now' });
    this.resultHeading = page.getByRole('heading', { name: 'Loan Request Processed' });
    this.providerCell = formRow(page, 'Loan Provider:').getByRole('cell').nth(1);
    this.dateCell = formRow(page, 'Date:').getByRole('cell').nth(1);
    this.statusCell = formRow(page, 'Status:').getByRole('cell').nth(1);
    this.approvedMessage = page.getByText('Congratulations, your loan has been approved.');
    this.newAccountLink = page.locator('#newAccountId');
    this.errorHeading = page.getByRole('heading', { name: 'Error!' });
  }

  async goto() {
    await this.page.getByRole('link', { name: 'Request Loan' }).click();
    await expectLoadedOrSkip(this.page, this.heading, 'Request Loan page');
    await expect(this.fromAccountSelect.getByRole('option')).not.toHaveCount(0);
  }

  deniedMessage(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  /** Submits the application and waits for the server to answer, whatever the outcome. */
  async apply(loanAmount: string, downPayment: string, fromAccountId?: string) {
    await this.loanAmountInput.fill(loanAmount);
    await this.downPaymentInput.fill(downPayment);
    if (fromAccountId) {
      await this.fromAccountSelect.selectOption(fromAccountId);
    }
    await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/services_proxy/bank/requestLoan')),
      this.applyButton.click(),
    ]);
    await expect(this.resultHeading.or(this.errorHeading)).toBeVisible();
  }
}
