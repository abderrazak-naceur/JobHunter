import { useRef, type PointerEvent, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { usePrefersReducedMotion } from './hooks';

type Props = {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article';
  /** Maximum tilt in degrees. */
  tilt?: number;
  /** Colour of the light that follows the pointer. */
  spotlight?: string;
};

const spring = { stiffness: 220, damping: 22 };

/**
 * A card that tilts towards the pointer (3D) and lights up where the pointer is. It is a plain card
 * for keyboard and touch users, and for anyone who prefers reduced motion.
 */
export default function InteractiveCard({
  children,
  className = '',
  as = 'div',
  tilt = 5,
  spotlight = 'rgb(255 255 255 / 38%)'
}: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(y, [0, 1], [tilt, -tilt]), spring);
  const rotateY = useSpring(useTransform(x, [0, 1], [-tilt, tilt]), spring);
  const Tag = as === 'article' ? motion.article : motion.div;

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return;
    const element = ref.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    element.style.setProperty('--spot-x', `${offsetX}px`);
    element.style.setProperty('--spot-y', `${offsetY}px`);

    if (!reducedMotion && rect.width > 0 && rect.height > 0) {
      x.set(offsetX / rect.width);
      y.set(offsetY / rect.height);
    }
  }

  function onPointerLeave() {
    x.set(0.5);
    y.set(0.5);
  }

  return (
    <Tag
      ref={ref as never}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={reducedMotion ? undefined : { rotateX, rotateY, transformPerspective: 1000 }}
      className={`group/spot relative ${className}`}
    >
      <span
        aria-hidden="true"
        data-spotlight
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{ background: `radial-gradient(380px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${spotlight}, transparent 65%)` }}
      />
      {children}
    </Tag>
  );
}
