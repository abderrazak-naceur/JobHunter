import type { CSSProperties, ElementType, ReactNode } from 'react';
import { useReveal } from './hooks';

type Props = {
  children: ReactNode;
  className?: string;
  /** Delay in milliseconds, used to stagger items of a grid. */
  delay?: number;
  as?: ElementType;
};

export default function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }: Props) {
  const { ref, visible } = useReveal<HTMLElement>();
  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
