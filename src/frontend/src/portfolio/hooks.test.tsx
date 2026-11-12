import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Reveal from './Reveal';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

function installObserver() {
  const instances: { callback: Callback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  class FakeObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    constructor(callback: Callback) {
      instances.push({ callback, observe: this.observe, disconnect: this.disconnect });
    }
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  return instances;
}

describe('Reveal', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('stays hidden until it scrolls into view, then shows once and stops observing', () => {
    const observers = installObserver();
    render(<Reveal><p>Contenuto</p></Reveal>);

    const wrapper = screen.getByText('Contenuto').parentElement!;
    expect(wrapper).not.toHaveClass('is-visible');
    expect(observers).toHaveLength(1);
    expect(observers[0].observe).toHaveBeenCalledTimes(1);

    act(() => observers[0].callback([{ isIntersecting: false }]));
    expect(wrapper).not.toHaveClass('is-visible');

    act(() => observers[0].callback([{ isIntersecting: true }]));
    expect(wrapper).toHaveClass('is-visible');
    expect(observers[0].disconnect).toHaveBeenCalled();
  });

  it('applies the stagger delay as a CSS variable', () => {
    installObserver();
    render(<Reveal delay={300}><p>Contenuto</p></Reveal>);

    expect(screen.getByText('Contenuto').parentElement!.style.getPropertyValue('--reveal-delay')).toBe('300ms');
  });

  it('shows the content immediately when IntersectionObserver is not supported', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Reveal><p>Contenuto</p></Reveal>);

    expect(screen.getByText('Contenuto').parentElement).toHaveClass('is-visible');
  });
});
