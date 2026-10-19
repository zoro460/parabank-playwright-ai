import { type Locator, type Page } from '@playwright/test';
import { formRow } from './formRow';
import { expectLoadedOrSkip } from '../utils/cloudflare';

export type UserData = {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  ssn: string;
  username: string;
  password: string;
};

export class RegisterPage {
  readonly page: Page;
  readonly registerButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.registerButton = page.getByRole('button', { name: 'Register' });
  }

  async goto() {
    await this.page.goto('register.htm');
    await expectLoadedOrSkip(this.page, this.field('First Name:'), 'Register page');
  }

  field(label: string): Locator {
    return formRow(this.page, label).getByRole('textbox');
  }

  async fillForm(user: UserData, confirmPassword = user.password) {
    await this.field('First Name:').fill(user.firstName);
    await this.field('Last Name:').fill(user.lastName);
    await this.field('Address:').fill(user.street);
    await this.field('City:').fill(user.city);
    await this.field('State:').fill(user.state);
    await this.field('Zip Code:').fill(user.zipCode);
    await this.field('Phone #:').fill(user.phone ?? '');
    await this.field('SSN:').fill(user.ssn);
    await this.field('Username:').fill(user.username);
    await this.field('Password:').fill(user.password);
    await this.field('Confirm:').fill(confirmPassword);
  }

  async register(user: UserData) {
    await this.goto();
    await this.fillForm(user);
    await this.registerButton.click();
  }

  welcomeHeading(username: string): Locator {
    return this.page.getByRole('heading', { name: `Welcome ${username}` });
  }

  successMessage(): Locator {
    return this.page.getByText('Your account was created successfully. You are now logged in.');
  }
}
