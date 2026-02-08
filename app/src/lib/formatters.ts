/** Thousand separator (non-breaking space) for French-style amounts. */
const THOUSAND_SEP = '\u00A0';

export function formatCurrency(amount: number | string): string {
  const n = typeof amount === 'number' ? amount : Number(amount) || 0;
  const abs = Math.abs(n);
  const integer = Math.floor(abs);
  const str = String(integer);
  const grouped = str.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSAND_SEP);
  return `${grouped} FCFA`;
}

/** Format stored date (ISO or YYYY-MM-DD) for display (YYYY-MM-DD). Leaves non-date strings as-is. */
export function formatDateForDisplay(value: string | undefined): string {
  if (!value) return '';
  const s = value.trim();
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

/** Format an integer amount for display in amount inputs (thousand separators, no decimals). */
export function formatAmountForInput(value: string, locale = 'fr-FR'): string {
  const digits = String(value || '').replace(/\D/g, '');
  const num = digits === '' ? 0 : Math.floor(parseInt(digits, 10) || 0);
  return num.toLocaleString(locale, { maximumFractionDigits: 0 });
}

/** Parse user input to integer string (digits only). Used while typing and for form state. */
export function parseAmountToInteger(inputValue: string): string {
  const digits = String(inputValue || '').replace(/\D/g, '');
  if (digits === '') return '0';
  return digits.replace(/^0+(\d)/, '$1') || '0';
}
