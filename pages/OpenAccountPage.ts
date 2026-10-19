import { expect, type Locator, type Page } from '@playwright/test';
import { expectLoadedOrSkip } from '../utils/cloudflare';

export type AccountType = 'CHECKING' | 'SAVINGS';

export class OpenAccountPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly accountTypeSelect: Locator;
  readonly fromAccountSelect: Locator;
  readonly openAccountButton: Locator;
  readonly successHeading: Locator;
  readonly successMessage: Locator;
  readonly newAccountLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Open New Account' });
    // Both dropdowns are unlabeled (their captions are plain <p> text), so use their ids.
    this.accountTypeSelect = page.locator('#type');
    this.fromAccountSelect = page.locator('#fromAccountId');
    this.openAccountButton = page.getByRole('button', { name: 'Open New Account' });
    this.successHeading = page.getByRole('heading', { name: 'Account Opened!' });
    this.successMessage = page.getByText('Congratulations, your account is now open.');
    this.newAccountLink = page.locator('#newAccountId');
  }

  async goto() {
    await this.page.getByRole('link', { name: 'Open New Account' }).click();
    await expectLoadedOrSkip(this.page, this.heading, 'Open New Account page');
  }

  async openAccount(type: AccountType, fromAccountId?: string) {
    // The funding-account options are loaded via AJAX after the page renders.
    await expect(this.fromAccountSelect.getByRole('option')).not.toHaveCount(0);
    await this.accountTypeSelect.selectOption(type);
    if (fromAccountId) {
      await this.fromAccountSelect.selectOption(fromAccountId);
    }
    await this.openAccountButton.click();
    await expect(this.successHeading).toBeVisible();
    return (await this.newAccountLink.innerText()).trim();
  }
}
