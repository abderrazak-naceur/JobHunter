import { describe, expect, it } from 'vitest';
import { emptyOffer, type Offer } from '@/services/applicationApi';
import { bestOffer, formatEuro, grossPerPayment, parseAmount, totalGross } from './offers';

const offer = (grossAnnual: number | null, bonus: number | null = null): Offer => ({ ...emptyOffer, grossAnnual, bonus });

describe('parseAmount', () => {
  it.each([
    ['', null],
    ['   ', null],
    ['55000', 55000],
    ['55.000', 55000],
    ['1.250.000', 1250000],
    ['55.000,50', 55000.5],
    ['55000,5', 55000.5],
    ['55000.5', 55000.5],
    ['55k', 55000],
    ['55,5K', 55500],
    ['€ 55.000', 55000],
    ['55 000', 55000]
  ])('reads %j as %j', (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });

  it.each(['abc', '55€x', '-100', '5..0'])('rejects %j', text => {
    expect(parseAmount(text)).toBeNaN();
  });
});

describe('offer numbers', () => {
  it('formats euro the Italian way, with a dash for unknown amounts', () => {
    expect(formatEuro(55000).replace(/\s/g, ' ')).toBe('55.000 €');
    expect(formatEuro(null)).toBe('—');
  });

  it('adds the bonus to the yearly gross only when the base salary is known', () => {
    expect(totalGross(offer(50000, 5000))).toBe(55000);
    expect(totalGross(offer(50000))).toBe(50000);
    expect(totalGross(offer(null, 5000))).toBeNull();
    expect(totalGross(null)).toBeNull();
  });

  it('splits the yearly gross into 13 or 14 payments', () => {
    expect(grossPerPayment(offer(52000), 13)).toBe(4000);
    expect(grossPerPayment(offer(56000), 14)).toBe(4000);
    expect(grossPerPayment(offer(null), 13)).toBeNull();
  });

  it('picks the highest total only when at least two offers can be compared', () => {
    expect(bestOffer([offer(50000, 8000), offer(55000), offer(null)])).toBe(0);
    expect(bestOffer([offer(50000), offer(null)])).toBeNull();
    expect(bestOffer([])).toBeNull();
  });
});
