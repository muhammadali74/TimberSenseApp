/** WS-G. Vertical auto-scrolling feature cards on a green gradient (SylvaSense login style). */
import {useEffect, useRef, useState} from 'react';
import {FEATURE_CARDS} from './FeatureCards';

const INTERVAL_MS = 4200;
const ANIM_MS = 700;
const GAP_PX = 32;

export function FeatureCarousel() {
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const n = FEATURE_CARDS.length;

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      if (!cardRef.current) return;
      setAnimating(true);
      setOffset(-(cardRef.current.offsetHeight + GAP_PX));
      window.setTimeout(() => {
        setAnimating(false);
        setOffset(0);
        setIndex((i) => (i + 1) % n);
      }, ANIM_MS);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [n]);

  const Prev = FEATURE_CARDS[(index - 1 + n) % n];
  const Curr = FEATURE_CARDS[index];
  const Next = FEATURE_CARDS[(index + 1) % n];

  return (
    <div className="flex h-full w-full items-center justify-center bg-surface p-4 lg:p-6">
      <div className="relative h-full w-full overflow-hidden rounded-[32px] bg-gradient-to-br from-[#3F6B47] via-[#7BA882] to-[#C5DCB5] lg:rounded-[40px]">
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div
            className="flex w-[85%] max-w-[460px] min-w-[280px] flex-col md:w-[62%] xl:w-[48%]"
            style={{
              gap: GAP_PX,
              transform: `translateY(${offset}px)`,
              transition: animating ? `transform ${ANIM_MS}ms ease-in-out` : 'none',
            }}
          >
            <div className="shrink-0 opacity-50">
              <Prev />
            </div>
            <div ref={cardRef} className="shrink-0 shadow-2xl shadow-black/10">
              <Curr />
            </div>
            <div className="shrink-0 opacity-60">
              <Next />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
