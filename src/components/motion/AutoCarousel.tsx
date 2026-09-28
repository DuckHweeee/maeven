"use client";

import { Children, useCallback, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/motion";

const SPEED = 0.35; // px per frame at 60fps — a slow drift, not a slideshow

/**
 * Continuously drifting carousel.
 *
 * The list is rendered twice and the scroll position wraps at the halfway mark,
 * so the loop is seamless. It runs on a native scroll container, which means it
 * still swipes on touch and scrolls with a trackpad while it drifts.
 *
 * WCAG 2.2.2: content that moves automatically for more than five seconds needs
 * a way to stop it. Hovering pauses it, focus pauses it, and there is an
 * explicit pause control — hover alone would leave keyboard users stuck.
 *
 * The drift adds to `scrollLeft` each frame rather than tweening it, so a swipe
 * or a trackpad scroll composes with the motion instead of fighting a tween that
 * owns the property. What GSAP replaces here is the loop itself: `gsap.ticker`
 * is the same frame callback every other animation on the page already shares,
 * so this no longer runs a requestAnimationFrame of its own. Stopping and
 * starting eases through a speed value, the way the marquee does.
 */
export default function AutoCarousel({
  children,
  label,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);

  const items = Children.toArray(children);
  // Pointer/focus pauses live in a ref so they never re-render mid-drift.
  const held = useRef(false);

  // Eased 0..1 multiplier, so pausing coasts to a stop instead of cutting.
  const speed = useRef({ v: 1 });

  const retarget = useCallback((wantPaused: boolean) => {
    gsap.to(speed.current, {
      v: wantPaused || held.current ? 0 : 1,
      duration: 0.45,
      ease: "power2.out",
      overwrite: true,
    });
  }, []);

  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track || reduced) return;

      let last = gsap.ticker.time;
      // The drift is sub-pixel per frame and `scrollLeft` rounds to whole
      // pixels, so reading it back and adding 0.35 never moves: 10 + 0.35 reads
      // as 10 again, forever. The position is accumulated here at full
      // precision and only the rounded value reaches the DOM.
      let pos = track.scrollLeft;

      const tick = () => {
        const now = gsap.ticker.time;
        const dt = Math.min((now - last) * 60, 3); // ticker.time is seconds
        last = now;

        if (speed.current.v < 0.001) return;

        // If the reader scrolled it themselves, adopt where they left it rather
        // than dragging the rail back to our own idea of the position.
        if (Math.abs(track.scrollLeft - Math.round(pos)) > 1) pos = track.scrollLeft;

        const half = track.scrollWidth / 2;
        pos += SPEED * dt * speed.current.v;
        if (half > 0 && pos >= half) pos -= half;
        track.scrollLeft = pos;
      };

      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    },
    { dependencies: [reduced] },
  );

  const hold = useCallback(
    (v: boolean) => {
      held.current = v;
      retarget(paused);
    },
    [paused, retarget],
  );

  return (
    <div className={`relative ${className}`}>
      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        onMouseEnter={() => hold(true)}
        onMouseLeave={() => hold(false)}
        onFocusCapture={() => hold(true)}
        onBlurCapture={() => hold(false)}
        onPointerDown={() => hold(true)}
        onPointerUp={() => hold(false)}
        className="flex gap-6 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, i) => (
          <div key={`a-${i}`} className="w-[68vw] flex-none sm:w-[38vw] lg:w-[23%]">
            {child}
          </div>
        ))}
        {/* Duplicate run: presentational only, hidden from assistive tech. */}
        {!reduced &&
          items.map((child, i) => (
            <div
              key={`b-${i}`}
              aria-hidden
              className="w-[68vw] flex-none sm:w-[38vw] lg:w-[23%]"
            >
              {child}
            </div>
          ))}
      </div>

      {!reduced && (
        <button
          type="button"
          onClick={() => {
            const next = !paused;
            setPaused(next);
            retarget(next);
          }}
          aria-pressed={paused}
          className="mono-label mt-3 cursor-pointer text-[10px] tracking-[0.14em] text-smoke transition-colors hover:text-ink"
        >
          {paused ? "▶ Chạy tiếp" : "❚❚ Tạm dừng"}
        </button>
      )}
    </div>
  );
}
