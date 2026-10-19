/** Parses ParaBank's currency text, e.g. "$1,234.50" or "-$175.00". */
export function parseCurrency(text: string): number {
  const value = Number(text.replace(/[$,\s]/g, ''));
  if (Number.isNaN(value)) throw new Error(`Not a currency value: "${text}"`);
  return value;
}

/** Formats a number the way ParaBank displays it: "$75.00" / "-$175.00". */
export function formatCurrency(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}
