import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AnimatedNumber from './AnimatedNumber';

// Motion's animation is replaced by one that never advances: this is a browser that throttles animation
// frames (background tab, crawler, very slow device). The real value must still end up on screen.
vi.mock('motion/react', () => ({ animate: () => ({ stop: () => {} }) }));

class EntersImmediately {
  constructor(private readonly callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {}
  observe() { this.callback([{ isIntersecting: true }]); }
  disconnect() {}
}

describe('AnimatedNumber safety net', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the real value after the animation time even if the animation never moves', async () => {
    vi.stubGlobal('IntersectionObserver', EntersImmediately);
    vi.useFakeTimers();

    const { container } = render(<AnimatedNumber value="25+" />);
    const counting = () => container.querySelector('[aria-hidden="true"]');
    expect(counting()).toHaveTextContent('0+');

    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(counting()).toHaveTextContent('0+'); // still within the normal animation time

    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(counting()).toHaveTextContent('25+');
  });

  it('keeps the real value available to screen readers throughout', () => {
    vi.stubGlobal('IntersectionObserver', EntersImmediately);

    const { container } = render(<AnimatedNumber value="25+" />);

    expect(container.querySelector('.sr-only')).toHaveTextContent('25+');
  });
});
