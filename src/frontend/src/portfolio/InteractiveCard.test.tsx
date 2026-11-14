import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InteractiveCard from './InteractiveCard';

function reducedMotion() {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    query => ({ matches: true, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList
  );
}

describe('InteractiveCard', () => {
  it('renders its content and keeps the light effect out of the accessibility tree', () => {
    const { container } = render(<InteractiveCard className="card"><h3>Titolo</h3></InteractiveCard>);

    expect(screen.getByRole('heading', { name: 'Titolo' })).toBeInTheDocument();
    expect(container.querySelector('[data-spotlight]')).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstElementChild).toHaveClass('card');
  });

  it('can render as an article', () => {
    render(<InteractiveCard as="article"><p>Contenuto</p></InteractiveCard>);

    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('moves the light to the pointer position', () => {
    const { container } = render(<InteractiveCard><p>Contenuto</p></InteractiveCard>);
    const card = container.firstElementChild as HTMLElement;

    fireEvent.pointerMove(card, { clientX: 40, clientY: 25, pointerType: 'mouse' });

    expect(card.style.getPropertyValue('--spot-x')).toBe('40px');
    expect(card.style.getPropertyValue('--spot-y')).toBe('25px');
  });

  it('ignores touch input so scrolling is never disturbed', () => {
    const { container } = render(<InteractiveCard><p>Contenuto</p></InteractiveCard>);
    const card = container.firstElementChild as HTMLElement;

    fireEvent.pointerMove(card, { clientX: 40, clientY: 25, pointerType: 'touch' });

    expect(card.style.getPropertyValue('--spot-x')).toBe('');
  });

  it('has a 3D perspective by default and is flat for visitors who prefer reduced motion', () => {
    const tilted = render(<InteractiveCard><p>A</p></InteractiveCard>);
    expect((tilted.container.firstElementChild as HTMLElement).style.transform).toContain('perspective');
    tilted.unmount();

    reducedMotion();
    const flat = render(<InteractiveCard><p>B</p></InteractiveCard>);
    expect((flat.container.firstElementChild as HTMLElement).style.transform).not.toContain('perspective');
  });
});
