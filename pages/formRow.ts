import { type Locator, type Page } from '@playwright/test';

/**
 * ParaBank forms have no <label> elements: each caption is a sibling table cell.
 * This returns the table row whose caption cell matches `label` exactly. Anchoring on the
 * caption cell (rather than the row's accessible name) keeps working when a validation
 * message is rendered into the same row.
 */
export function formRow(page: Page, label: string): Locator {
  return page.getByRole('row').filter({ has: page.getByRole('cell', { name: label, exact: true }) });
}
