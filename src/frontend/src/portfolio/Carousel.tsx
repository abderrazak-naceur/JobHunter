import { Children, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import type { EmblaCarouselType } from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { usePrefersReducedMotion } from './hooks';

type Props = { label: string; children: ReactNode };

type Position = { snaps: number; selected: number; canPrev: boolean; canNext: boolean };

const initial: Position = { snaps: 0, selected: 0, canPrev: false, canNext: false };

const roundButton =
  'grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white shadow-lg transition ' +
  'hover:scale-105 hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-lav-300 disabled:shadow-none ' +
  'disabled:hover:scale-100 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-brand-600';

/**
 * Carousel built on Embla: drag with mouse or finger, round arrow buttons, clickable dots and a slow
 * automatic scroll that stops on hover, focus or interaction. The automatic scroll can be paused with
 * a button and is never started for visitors who prefer reduced motion.
 */
export default function Carousel({ label, children }: Props) {
  const items = Children.toArray(children);
  const reducedMotion = usePrefersReducedMotion();
  const autoplay = useMemo(() => Autoplay({ delay: 5500, stopOnInteraction: true, stopOnMouseEnter: true }), []);
  const [viewportRef, api] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps' }, reducedMotion ? [] : [autoplay]);
  const [position, setPosition] = useState<Position>(initial);
  const [playing, setPlaying] = useState(false);

  const update = useCallback((embla: EmblaCarouselType) => {
    setPosition({
      snaps: embla.scrollSnapList().length,
      selected: embla.selectedScrollSnap(),
      canPrev: embla.canScrollPrev(),
      canNext: embla.canScrollNext()
    });
  }, []);

  useEffect(() => {
    if (!api) return;
    update(api);
    api.on('select', update).on('reInit', update);

    const sync = () => setPlaying(Boolean(api.plugins().autoplay?.isPlaying()));
    sync();
    api.on('autoplay:play', sync).on('autoplay:stop', sync);

    return () => {
      api.off('select', update).off('reInit', update);
      api.off('autoplay:play', sync).off('autoplay:stop', sync);
    };
  }, [api, update]);

  function toggleAutoplay() {
    const plugin = api?.plugins().autoplay;
    if (!plugin) return;
    if (plugin.isPlaying()) plugin.stop();
    else plugin.play();
  }

  const showControls = position.snaps > 1;

  return (
    <div role="group" aria-roledescription="carousel" aria-label={label}>
      {/* The viewport reaches into the section padding so cards can bleed to the edge and shadows are not clipped. */}
      <div ref={viewportRef} className="-mx-6 -my-4 overflow-hidden py-4">
        <ul className="flex touch-pan-y">
          {items.map((item, index) => (
            <li key={index} className="min-w-0 shrink-0 grow-0 basis-[86%] pl-6 sm:basis-[46%] lg:basis-[33.333%]">
              {item}
            </li>
          ))}
        </ul>
      </div>

      {showControls && (
        <div className="mt-8 flex items-center justify-center gap-5">
          <button type="button" className={roundButton} aria-label="Precedente" disabled={!position.canPrev} onClick={() => api?.scrollPrev()}>
            <ChevronLeft size={22} aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: position.snaps }, (_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Vai alla pagina ${index + 1}`}
                aria-current={index === position.selected}
                onClick={() => api?.scrollTo(index)}
                className="grid h-6 place-items-center focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <span className={`h-1.5 rounded-full transition-all duration-300 ${index === position.selected ? 'w-10 bg-brand-600' : 'w-6 bg-lav-300'}`} />
              </button>
            ))}
          </div>

          <button type="button" className={roundButton} aria-label="Successivo" disabled={!position.canNext} onClick={() => api?.scrollNext()}>
            <ChevronRight size={22} aria-hidden="true" />
          </button>

          {!reducedMotion && (
            <button
              type="button"
              aria-label={playing ? 'Metti in pausa lo scorrimento automatico' : 'Avvia lo scorrimento automatico'}
              onClick={toggleAutoplay}
              className="grid h-10 w-10 place-items-center rounded-full border border-lav-300 bg-white text-brand-700 transition hover:bg-lav-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
