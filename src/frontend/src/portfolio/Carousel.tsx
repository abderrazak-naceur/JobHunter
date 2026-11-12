import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = { label: string; children: ReactNode };

type Position = { pages: number; page: number; atStart: boolean; atEnd: boolean };

const initial: Position = { pages: 1, page: 0, atStart: true, atEnd: true };

/**
 * Horizontal scroll-snap carousel: swipe on touch devices, round arrow buttons and dots otherwise.
 * Controls only appear when the cards do not all fit on screen.
 */
export default function Carousel({ label, children }: Props) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState<Position>(initial);
  const items = Children.toArray(children);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;

    const pages = Math.max(1, Math.ceil((track.scrollWidth - 2) / track.clientWidth));
    const atStart = track.scrollLeft <= 2;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    const page = atEnd ? pages - 1 : Math.min(pages - 1, Math.round(track.scrollLeft / track.clientWidth));

    setPosition(previous =>
      previous.pages === pages && previous.page === page && previous.atStart === atStart && previous.atEnd === atEnd
        ? previous
        : { pages, page, atStart, atEnd });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, items.length]);

  function scrollByPage(direction: 1 | -1) {
    const track = trackRef.current;
    track?.scrollBy?.({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' });
  }

  const buttonClass =
    'grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white shadow-lg transition ' +
    'hover:scale-105 hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-lav-300 disabled:text-white disabled:shadow-none ' +
    'disabled:hover:scale-100 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-brand-600';

  return (
    <div role="group" aria-roledescription="carousel" aria-label={label}>
      <ul
        ref={trackRef}
        onScroll={measure}
        className="no-scrollbar -mx-6 flex snap-x snap-mandatory scroll-pl-6 gap-6 overflow-x-auto scroll-smooth px-6 pb-6 pt-2"
      >
        {items.map((item, index) => (
          <li key={index} className="shrink-0 basis-[86%] snap-start sm:basis-[46%] lg:basis-[31.5%]">
            {item}
          </li>
        ))}
      </ul>

      {position.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-6">
          <button type="button" className={buttonClass} aria-label="Precedente" disabled={position.atStart} onClick={() => scrollByPage(-1)}>
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <div aria-hidden="true" className="flex items-center gap-2">
            {Array.from({ length: position.pages }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${index === position.page ? 'w-10 bg-brand-600' : 'w-6 bg-lav-300'}`}
              />
            ))}
          </div>
          <button type="button" className={buttonClass} aria-label="Successivo" disabled={position.atEnd} onClick={() => scrollByPage(1)}>
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
