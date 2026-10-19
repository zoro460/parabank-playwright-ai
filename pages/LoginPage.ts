import { type Locator, type Page } from '@playwright/test';
import { expectLoadedOrSkip } from '../utils/cloudflare';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly logoutLink: Locator;
  readonly errorHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    // The login inputs have no accessible label (captions are plain <p> text) and both
    // have the textbox role, so the name attribute is the only stable hook.
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.getByRole('button', { name: 'Log In' });
    this.logoutLink = page.getByRole('link', { name: 'Log Out' });
    this.errorHeading = page.getByRole('heading', { name: 'Error!' });
  }

  async goto() {
    await this.page.goto('index.htm');
    await expectLoadedOrSkip(this.page, this.usernameInput, 'Login page');
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async logout() {
    await this.logoutLink.click();
  }

  errorMessage(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }
}
