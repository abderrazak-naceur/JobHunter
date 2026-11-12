import { useEffect, useRef, useState } from 'react';

/**
 * Returns a ref and a flag that turns true (once) when the element scrolls into view.
 * Without IntersectionObserver (old browsers, tests) the element is simply shown.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return { ref, visible };
}

/** Keeps a progress bar element in sync with the page scroll, without re-rendering React. */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const element = ref.current;
      if (!element) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
      element.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}
