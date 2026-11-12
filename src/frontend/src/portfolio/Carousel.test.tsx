import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Carousel from './Carousel';

function mockLayout({ client, scroll }: { client: number; scroll: number }) {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(client);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scroll);
}

function renderCarousel() {
  return render(
    <Carousel label="Esempi">
      <p>Uno</p>
      <p>Due</p>
      <p>Tre</p>
    </Carousel>
  );
}

describe('Carousel', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders every card inside a labelled carousel group', () => {
    renderCarousel();

    expect(screen.getByRole('group', { name: 'Esempi' })).toHaveAttribute('aria-roledescription', 'carousel');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('hides the controls when all cards fit', () => {
    mockLayout({ client: 900, scroll: 900 });
    renderCarousel();

    expect(screen.queryByRole('button', { name: 'Successivo' })).not.toBeInTheDocument();
  });

  it('shows controls when cards overflow, scrolls on click and disables the ends', async () => {
    mockLayout({ client: 300, scroll: 900 });
    const scrollBy = vi.fn();
    HTMLElement.prototype.scrollBy = scrollBy as unknown as typeof HTMLElement.prototype.scrollBy;
    renderCarousel();

    const previous = await screen.findByRole('button', { name: 'Precedente' });
    const next = screen.getByRole('button', { name: 'Successivo' });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    await userEvent.click(next);
    expect(scrollBy).toHaveBeenCalledWith({ left: 255, behavior: 'smooth' });

    const track = screen.getAllByRole('listitem')[0].parentElement!;
    track.scrollLeft = 600;
    fireEvent.scroll(track);

    expect(await screen.findByRole('button', { name: 'Successivo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Precedente' })).toBeEnabled();
  });
});