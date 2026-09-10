"use client";

import { Children, useCallback, useEffect, useRef } from "react";
import { clamp, useReducedMotion } from "@/lib/motion";

const MAX_ROT = 18;   // past ~20deg a card reads as broken layout, not depth
const MAX_Z = 90;
const MIN_SCALE = 0.94;

/**
 * Depth rail: the item nearest the centre stands face-forward and sharp while
 * its neighbours curve back into space, like garments turning on a rack.
 *
 * Two things make this work rather than look broken:
 *
 * 1. The transform goes on an inner wrapper, never on the flex item itself.
 *    Transforming the scroll child changes its bounding box, which corrupts the
 *    track's scrollWidth and kills the scrolling the effect depends on.
 * 2. Items are sized to overflow the track, so there is a real centre to move
 *    through. A rail that exactly fits its container is just a skewed grid.
 *
 * The track is a native scroll-snap container, so it swipes on touch, scrolls on
 * a trackpad and stays keyboard reachable. If the script never runs, it degrades
 * to an ordinary horizontal scroller.
 */
export default function Coverflow({
  children,
  className = "",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const items = Children.toArray(children);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || reduced) return;

    const cells = Array.from(
      track.querySelectorAll<HTMLElement>("[data-cf-inner]"),
    );
    let frame = 0;

    const apply = () => {
      frame = 0;
      const mid = track.scrollLeft + track.clientWidth / 2;

      // Fade only the side that actually has more rail to reach, so the first
      // card is never dimmed by an edge that leads nowhere.
      const max = track.scrollWidth - track.clientWidth;
      const root = rootRef.current;
      if (root) {
        root.style.setProperty("--cf-fade-l", clamp(track.scrollLeft / 48, 0, 1).toFixed(3));
        root.style.setProperty("--cf-fade-r", clamp((max - track.scrollLeft) / 48, 0, 1).toFixed(3));

        // Indicator: a thumb as wide as the visible fraction of the rail.
        const frac = track.clientWidth / Math.max(track.scrollWidth, 1);
        const progress = max > 0 ? track.scrollLeft / max : 0;
        root.style.setProperty("--cf-thumb", `${(frac * 100).toFixed(2)}%`);
        root.style.setProperty("--cf-progress", progress.toFixed(4));
        root.dataset.cfStart = progress <= 0.001 ? "true" : "false";
        root.dataset.cfEnd = progress >= 0.999 ? "true" : "false";
      }

      for (const inner of cells) {
        const cell = inner.parentElement;
        if (!cell) continue;

        const centre = cell.offsetLeft + cell.offsetWidth / 2;
        const d = clamp((centre - mid) / (cell.offsetWidth * 1.25), -1, 1);
        const abs = Math.abs(d);

        inner.style.setProperty("--cf-rot", `${(-d * MAX_ROT).toFixed(2)}deg`);
        inner.style.setProperty("--cf-z", `${(-abs * MAX_Z).toFixed(1)}px`);
        inner.style.setProperty("--cf-scale", (1 - abs * (1 - MIN_SCALE)).toFixed(3));
        inner.style.setProperty("--cf-dim", (1 - abs * 0.35).toFixed(3));
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced]);

  const nudge = useCallback((dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const first = track.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + 20 : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * step, behavior: "smooth" });
  }, []);

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      style={{ "--cf-fade-l": 0, "--cf-fade-r": reduced ? 0 : 1 } as React.CSSProperties}
    >
      {/* Soft edge fades, so a card leaving the rail reads as depth rather than
          a clipped layout. Overlays rather than a mask on the track itself —
          masking a scroll container flattens its 3D context in some engines. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-4 z-10 w-10 bg-gradient-to-r from-paper to-transparent opacity-[var(--cf-fade-l,0)] sm:-left-6 sm:w-16"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -right-4 z-10 w-10 bg-gradient-to-l from-paper to-transparent opacity-[var(--cf-fade-r,0)] sm:-right-6 sm:w-16"
      />
      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="-mx-4 flex snap-x snap-mandatory items-start gap-5 overflow-x-auto px-4 pt-2 pb-6 [-ms-overflow-style:none] [perspective-origin:50%_38%] [perspective:1200px] [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, i) => (
          <div
            key={i}
            // Sized to overflow the track on every breakpoint, so there is
            // always a centre to scroll through.
            className="w-[74vw] flex-none snap-center sm:w-[46vw] lg:w-[30%]"
          >
            <div
              data-cf-inner
              className="origin-center opacity-[var(--cf-dim,1)] transition-[opacity] duration-200 will-change-transform [transform:rotateY(var(--cf-rot,0deg))_translateZ(var(--cf-z,0px))_scale(var(--cf-scale,1))] [transform-style:preserve-3d]"
            >
              {child}
            </div>
          </div>
        ))}
      </div>

      {/* Hairline scroll indicator and bare arrows — the site's own language.
          Bordered arrow boxes read as dated pagination chrome. */}
      <div className="mt-3 flex items-center gap-6">
        <div className="relative h-px flex-1 bg-line" aria-hidden>
          <span
            className="absolute inset-y-0 block bg-ink transition-[left] duration-150"
            style={{
              width: "var(--cf-thumb, 100%)",
              left: "calc(var(--cf-progress, 0) * (100% - var(--cf-thumb, 100%)))",
            }}
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Sản phẩm trước"
            className="cf-prev cursor-pointer font-mono text-[15px] leading-none text-ink transition-colors hover:text-forest"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Sản phẩm tiếp theo"
            className="cf-next cursor-pointer font-mono text-[15px] leading-none text-ink transition-colors hover:text-forest"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
