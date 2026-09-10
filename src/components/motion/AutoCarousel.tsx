"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    const track = trackRef.current;
    if (!track || reduced) return;

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;

      if (!paused && !held.current) {
        const half = track.scrollWidth / 2;
        let next = track.scrollLeft + SPEED * dt;
        if (half > 0 && next >= half) next -= half;
        track.scrollLeft = next;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, paused]);

  const hold = useCallback((v: boolean) => {
    held.current = v;
  }, []);

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
          onClick={() => setPaused((v) => !v)}
          aria-pressed={paused}
          className="mono-label mt-3 cursor-pointer text-[10px] tracking-[0.14em] text-smoke transition-colors hover:text-ink"
        >
          {paused ? "▶ Chạy tiếp" : "❚❚ Tạm dừng"}
        </button>
      )}
    </div>
  );
}
