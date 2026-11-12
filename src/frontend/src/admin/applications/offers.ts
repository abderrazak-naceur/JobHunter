import type { Offer } from '@/services/applicationApi';

/**
 * Reads an amount typed the Italian way ("55.000", "55.000,50", "55000", "55k").
 * Returns null for an empty field and NaN for text that is not an amount.
 */
export function parseAmount(text: string): number | null {
  const value = text.trim().replace(/\s|€/g, '');
  if (!value) return null;
  const thousands = /^(\d+(?:[.,]\d+)?)k$/i.exec(value);
  if (thousands) return Math.round(Number(thousands[1].replace(',', '.')) * 1000);
  // "55.000,50" → "55000.50"; a lone dot followed by three digits is a thousands separator.
  const normalised = value.includes(',')
    ? value.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(value) ? value.replace(/\./g, '') : value;
  return /^\d+(\.\d+)?$/.test(normalised) ? Number(normalised) : Number.NaN;
}

const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function formatEuro(amount: number | null | undefined): string {
  return amount === null || amount === undefined ? '—' : euro.format(amount);
}

/** Yearly gross including the bonus, or null when the base salary is unknown. */
export function totalGross(offer: Offer | null | undefined): number | null {
  if (!offer || offer.grossAnnual === null || offer.grossAnnual === undefined) return null;
  return offer.grossAnnual + (offer.bonus ?? 0);
}

/** Gross per monthly payment: Italian contracts pay the yearly salary in 13 or 14 instalments. */
export function grossPerPayment(offer: Offer | null | undefined, payments: 13 | 14): number | null {
  if (!offer || offer.grossAnnual === null || offer.grossAnnual === undefined) return null;
  return Math.round(offer.grossAnnual / payments);
}

/** Index of the offer with the highest total gross; null when fewer than two can be compared. */
export function bestOffer(offers: (Offer | null | undefined)[]): number | null {
  const totals = offers.map(totalGross);
  if (totals.filter(total => total !== null).length < 2) return null;
  let best = -1;
  totals.forEach((total, index) => { if (total !== null && (best < 0 || total > totals[best]!)) best = index; });
  return best;
}
