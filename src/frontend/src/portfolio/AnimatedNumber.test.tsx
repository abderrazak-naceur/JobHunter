import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AnimatedNumber, { formatNumber, parseNumber } from './AnimatedNumber';

describe('parseNumber', () => {
  it.each([
    ['10+', { prefix: '', number: 10, decimals: 0, separator: '.', suffix: '+' }],
    ['99%', { prefix: '', number: 99, decimals: 0, separator: '.', suffix: '%' }],
    ['€40', { prefix: '€', number: 40, decimals: 0, separator: '.', suffix: '' }],
    ['1,5k', { prefix: '', number: 1.5, decimals: 1, separator: ',', suffix: 'k' }],
    ['  7 ', { prefix: '', number: 7, decimals: 0, separator: '.', suffix: '' }]
  ])('reads %j', (value, expected) => {
    expect(parseNumber(value)).toEqual(expected);
  });

  it.each(['', 'N/A', 'molti', '10 e 20'])('returns null for %j', value => {
    expect(parseNumber(value)).toBeNull();
  });
});

describe('formatNumber', () => {
  it('keeps prefix, suffix, decimals and the original separator', () => {
    expect(formatNumber(parseNumber('10+')!, 4.6)).toBe('5+');
    expect(formatNumber(parseNumber('1,5k')!, 0.25)).toBe('0,3k');
    expect(formatNumber(parseNumber('€40')!, 0)).toBe('€0');
  });
});

describe('AnimatedNumber', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the final value straight away when scroll detection is unavailable', () => {
    render(<AnimatedNumber value="10+" />);

    expect(screen.getByText('10+')).toBeInTheDocument();
  });

  it('shows values that are not numbers untouched', () => {
    render(<AnimatedNumber value="Molti" />);

    expect(screen.getByText('Molti')).toBeInTheDocument();
  });

  it('counts up when it enters the viewport and ends on the exact value', async () => {
    class EntersImmediately {
      constructor(private readonly callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {}
      observe() { this.callback([{ isIntersecting: true }]); }
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', EntersImmediately);

    const { container } = render(<AnimatedNumber value="25+" />);

    // Screen readers always get the final value; the counting text is hidden from them.
    expect(container.querySelector('.sr-only')).toHaveTextContent('25+');
    await waitFor(() => expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('25+'), { timeout: 4000 });
  });

  it('does not animate for visitors who prefer reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      query => ({ matches: true, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList
    );
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });

    render(<AnimatedNumber value="10+" />);

    expect(screen.getByText('10+')).toBeInTheDocument();
  });
});
