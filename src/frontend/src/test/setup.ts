import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom has no layout engine. These minimal stand-ins let libraries such as Embla and Motion run;
// they never report a match or a size. IntersectionObserver is deliberately NOT stubbed: components
// treat its absence as "everything is visible", which keeps tests deterministic.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  });
}

if (typeof window.ResizeObserver !== 'function') {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
