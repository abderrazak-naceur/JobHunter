import { useEffect, useMemo, useState } from 'react';
import { animate } from 'motion/react';
import { useReveal, usePrefersReducedMotion } from './hooks';

type Parsed = { prefix: string; number: number; decimals: number; separator: string; suffix: string };

const pattern = /^(\D*?)(\d+)(?:([.,])(\d+))?(\D*)$/;

/** Splits "10+" into prefix "", number 10 and suffix "+". Returns null when there is no number to animate. */
export function parseNumber(value: string): Parsed | null {
  const match = pattern.exec(value.trim());
  if (!match) return null;
  const [, prefix, integer, separator = '.', fraction = '', suffix] = match;
  return { prefix, number: parseFloat(`${integer}.${fraction || '0'}`), decimals: fraction.length, separator, suffix };
}

export function formatNumber(parsed: Parsed, current: number): string {
  const text = current.toFixed(parsed.decimals).replace('.', parsed.separator);
  return `${parsed.prefix}${text}${parsed.suffix}`;
}

/**
 * A number that counts up from zero when it scrolls into view. Without IntersectionObserver, with
 * reduced motion, or for values that are not numbers, the final text is shown straight away.
 */
export default function AnimatedNumber({ value, className }: { value: string; className?: string }) {
  const parsed = useMemo(() => parseNumber(value), [value]);
  const reducedMotion = usePrefersReducedMotion();
  const { ref, visible } = useReveal<HTMLSpanElement>();
  const canAnimate = parsed !== null && !reducedMotion && typeof IntersectionObserver !== 'undefined';
  const [display, setDisplay] = useState(() => (canAnimate && parsed ? formatNumber(parsed, 0) : value));

  useEffect(() => {
    if (!canAnimate || !visible || !parsed) return;
    const controls = animate(0, parsed.number, {
      duration: 1.6,
      ease: 'easeOut',
      onUpdate: current => setDisplay(formatNumber(parsed, current)),
      onComplete: () => setDisplay(value)
    });
    return () => controls.stop();
  }, [canAnimate, visible, parsed, value]);

  if (!canAnimate) return <span className={className}>{value}</span>;

  // Screen readers get the final value; the counting text is decorative.
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">{display}</span>
    </span>
  );
}
