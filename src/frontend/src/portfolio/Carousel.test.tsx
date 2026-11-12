import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Carousel from './Carousel';

// Embla needs real layout, which jsdom does not have, so it is replaced by a small controllable fake.
type Listener = (api: unknown) => void;

const listeners = new Map<string, Listener[]>();
const autoplay = { isPlaying: vi.fn(() => true), play: vi.fn(), stop: vi.fn() };
const emblaState = { snaps: 3, selected: 0, canPrev: false, canNext: true };

const fakeApi = {
  scrollSnapList: () => Array.from({ length: emblaState.snaps }, (_, index) => index),
  selectedScrollSnap: () => emblaState.selected,
  canScrollPrev: () => emblaState.canPrev,
  canScrollNext: () => emblaState.canNext,
  scrollPrev: vi.fn(),
  scrollNext: vi.fn(),
  scrollTo: vi.fn(),
  plugins: () => ({ autoplay }),
  on(event: string, listener: Listener) {
    listeners.set(event, [...(listeners.get(event) ?? []), listener]);
    return fakeApi;
  },
  off(event: string, listener: Listener) {
    listeners.set(event, (listeners.get(event) ?? []).filter(item => item !== listener));
    return fakeApi;
  }
};

vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), fakeApi] }));
vi.mock('embla-carousel-autoplay', () => ({ default: () => ({}) }));

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
  beforeEach(() => {
    Object.assign(emblaState, { snaps: 3, selected: 0, canPrev: false, canNext: true });
    listeners.clear();
    autoplay.isPlaying.mockReturnValue(true);
    for (const fn of [fakeApi.scrollPrev, fakeApi.scrollNext, fakeApi.scrollTo, autoplay.play, autoplay.stop]) fn.mockClear();
  });

  it('renders every card inside a labelled carousel group', () => {
    renderCarousel();

    expect(screen.getByRole('group', { name: 'Esempi' })).toHaveAttribute('aria-roledescription', 'carousel');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Due')).toBeInTheDocument();
  });

  it('hides all controls when every card fits on screen', () => {
    emblaState.snaps = 1;
    renderCarousel();

    expect(screen.queryByRole('button', { name: 'Successivo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pagina/ })).not.toBeInTheDocument();
  });

  it('shows arrows and one dot per page, disabling the arrow at each end', () => {
    renderCarousel();

    expect(screen.getByRole('button', { name: 'Precedente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Successivo' })).toBeEnabled();
    expect(screen.getAllByRole('button', { name: /Vai alla pagina/ })).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Vai alla pagina 1' })).toHaveAttribute('aria-current', 'true');
  });

  it('scrolls with the arrows and jumps with the dots', async () => {
    renderCarousel();

    await userEvent.click(screen.getByRole('button', { name: 'Successivo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Vai alla pagina 3' }));

    expect(fakeApi.scrollNext).toHaveBeenCalledTimes(1);
    expect(fakeApi.scrollTo).toHaveBeenCalledWith(2);
  });

  it('can pause and resume the automatic scroll', async () => {
    renderCarousel();

    await userEvent.click(screen.getByRole('button', { name: 'Metti in pausa lo scorrimento automatico' }));
    expect(autoplay.stop).toHaveBeenCalledTimes(1);

    autoplay.isPlaying.mockReturnValue(false);
    await userEvent.click(screen.getByRole('button', { name: 'Metti in pausa lo scorrimento automatico' }));
    expect(autoplay.play).toHaveBeenCalledTimes(1);
  });

  it('does not offer the automatic scroll to visitors who prefer reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      query => ({ matches: true, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList
    );
    renderCarousel();

    expect(screen.queryByRole('button', { name: /scorrimento automatico/ })).not.toBeInTheDocument();
  });
});
