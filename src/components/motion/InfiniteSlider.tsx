"use client";

import { Children, useCallback, useRef } from "react";
import { Observer } from "gsap/Observer";
import { EASE_OUT, gsap, useGSAP } from "@/lib/gsap";
import { clamp, useMounted, useReducedMotion } from "@/lib/motion";

// Registered here rather than in lib/gsap so pages that never render a slider
// do not pull Observer into their bundle.
gsap.registerPlugin(Observer);

const MAX_ROT = 18; // past ~20deg a card reads as broken layout, not depth
const MIN_SCALE = 0.94;
const DRAG_SLOP = 8; // px of movement before a drag stops counting as a click

/**
 * Endless card rail. The list never reaches an edge in either direction.
 *
 * Why this is transform-driven rather than a native scroller like Coverflow:
 * looping a real scroll container means teleporting `scrollLeft` at the seam,
 * which fights momentum scrolling on iOS and produces a visible stutter. Moving
 * one track with a wrapped `x` has no seam to teleport across.
 *
 * The wrap works because the children are rendered twice and `x` is wrapped into
 * `[-span, 0]`, where `span` is the width of one copy. At any wrapped `x` the
 * visible window always falls inside the doubled track, so there is nothing to
 * reset and nothing to pop.
 *
 * Depth is computed from each card's *rendered* position, not its index, so a
 * card and its clone passing the same point on screen get the same rotation —
 * that is what keeps the seam invisible.
 *
 * Each card carries its own `perspective()` inside its transform, and there is
 * no `transform-style: preserve-3d` anywhere. An earlier version put perspective
 * on this wrapper and preserve-3d on the track, which made the cards' negative
 * `translateZ` genuinely three-dimensional — and pushed them *behind* the plane
 * of their own flex item, so every click hit the wrapper instead of the link
 * inside it. Scale and opacity carry the depth now; nothing sits behind
 * anything.
 *
 * Two things are deliberate about what ships to the server:
 *
 * 1. The duplicate set is added only after mount. The prerendered HTML holds one
 *    copy, so a crawler never sees every product twice, and a reader without
 *    JavaScript gets a plain horizontal scroller instead of a dead track.
 * 2. The clones are `inert` and `aria-hidden`, so Tab order and screen readers
 *    see each product exactly once however many copies are on screen.
 */
export default function InfiniteSlider({
  children,
  className = "",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  /** Static clip window. Never transformed — see the note above. */
  const viewRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Plain refs, not state: these change every frame during a drag.
  const pos = useRef({ x: 0 });
  const span = useRef(0);
  const step = useRef(0);
  const dragged = useRef(false);
  const moved = useRef(0);
  // Set inside useGSAP, called from the arrow handlers that live outside it.
  const renderRef = useRef<() => void>(() => {});

  const mounted = useMounted();
  const reduced = useReducedMotion();

  const items = Children.toArray(children);
  const count = items.length;
  const run = mounted ? [...items, ...items] : items;

  const nudge = useCallback(
    (dir: number) => {
      if (!step.current) return;
      gsap.to(pos.current, {
        x: pos.current.x - dir * step.current,
        duration: reduced ? 0 : 0.6,
        ease: EASE_OUT,
        overwrite: true,
        onUpdate: () => renderRef.current(),
      });
    },
    [reduced],
  );

  useGSAP(
    () => {
      if (!mounted) return;
      const root = rootRef.current;
      const view = viewRef.current;
      const track = trackRef.current;
      if (!root || !view || !track) return;

      const cards = gsap.utils.toArray<HTMLElement>("[data-slide]", track);
      if (cards.length < 2) return;

      // Clones are aria-hidden so a screen reader hears each product once, and
      // their controls are taken out of the tab order for the same reason. They
      // are deliberately NOT `inert`: inert also blocks the pointer, and for
      // most of the rail's travel it is a clone that happens to be on screen —
      // making them inert means clicking the card you can see does nothing.
      for (const card of cards) {
        if (card.dataset.clone !== "true") continue;
        for (const el of card.querySelectorAll<HTMLElement>("a, button, [tabindex]")) {
          el.tabIndex = -1;
        }
      }

      const setX = gsap.quickSetter(track, "x", "px");

      // Positions are measured from the first card, so the track's own padding
      // drops out of the arithmetic.
      const base = () => cards[0].offsetLeft;

      const measure = () => {
        step.current = cards[1].offsetLeft - cards[0].offsetLeft;
        span.current = step.current * count;
      };

      // Not gsap.utils.wrap(-span, 0, …): its upper bound is exclusive, so a
      // resting 0 maps to -span and the rail sits on the second copy — the one
      // made up of clones. This keeps 0 at 0 and stays in (-span, 0].
      const wrapX = (v: number) => -((((-v % span.current) + span.current) % span.current));

      const render = () => {
        if (!span.current) return;
        const x = wrapX(pos.current.x);
        setX(x);

        const railW = view.clientWidth;
        const half = railW / 2;
        const b = base();
        for (const card of cards) {
          const centre = card.offsetLeft - b + x + card.offsetWidth / 2;
          const d = clamp((centre - half) / half, -1, 1);
          const abs = Math.abs(d);
          const inner = card.firstElementChild as HTMLElement | null;
          if (!inner) continue;
          inner.style.setProperty("--cf-rot", `${(-d * MAX_ROT).toFixed(2)}deg`);
          inner.style.setProperty("--cf-scale", (1 - abs * (1 - MIN_SCALE)).toFixed(3));
          inner.style.setProperty("--cf-dim", (1 - abs * 0.35).toFixed(3));
        }

        // Position within one cycle. An endless rail has no end to measure
        // against, so the thumb reports "which of the four" and loops with them.
        const frac = span.current ? (-x / span.current) % 1 : 0;
        root.style.setProperty("--sl-thumb", `${(100 / count).toFixed(3)}%`);
        root.style.setProperty("--sl-progress", frac.toFixed(4));
      };

      measure();
      render();
      renderRef.current = render;

      const ro = new ResizeObserver(() => {
        measure();
        render();
      });
      ro.observe(view);

      const observer = Observer.create({
        target: view,
        type: "touch,pointer,wheel",
        // Never call preventDefault: a rail that eats vertical wheel events
        // traps the page. lockAxis makes Observer pick one axis per gesture and
        // stay there, so a mostly-vertical scroll is simply not our business.
        preventDefault: false,
        lockAxis: true,
        dragMinimum: 3,
        onPress: () => {
          dragged.current = false;
          moved.current = 0;
          gsap.killTweensOf(pos.current);
        },
        onChangeX: (self) => {
          if (self.axis !== "x") return;
          // Wheel deltas point the way the content should go; drag deltas point
          // the way the finger went.
          const wheel = self.event.type === "wheel";
          pos.current.x += wheel ? -self.deltaX : self.deltaX;
          // `self.startX`/`self.x` only exist for pointer gestures, so measure
          // the travel ourselves rather than branching on which fields are set.
          if (!wheel) {
            moved.current += Math.abs(self.deltaX);
            if (moved.current > DRAG_SLOP) dragged.current = true;
          }
          render();
        },
      });

      // A transform-driven track cannot be scrolled by the browser, so focusing
      // a card that has been dragged off-screen would leave the reader tabbing
      // through invisible links. Bring the focused slide back into the rail
      // ourselves — the native scroller this replaced got that for free.
      const onFocusIn = (e: FocusEvent) => {
        const slide = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-slide]");
        if (!slide || !span.current) return;

        const x = wrapX(pos.current.x);
        const left = slide.offsetLeft - base() + x;
        if (left >= 0 && left + slide.offsetWidth <= view.clientWidth) return;

        // Align it where the first card sits at rest, by the shortest way round
        // the loop rather than unwinding through every card in between.
        const desired = cards[0].offsetLeft - slide.offsetLeft;
        const delta = gsap.utils.wrap(
          -span.current / 2,
          span.current / 2,
          desired - pos.current.x,
        );
        gsap.to(pos.current, {
          x: pos.current.x + delta,
          duration: reduced ? 0 : 0.5,
          ease: EASE_OUT,
          overwrite: true,
          onUpdate: render,
        });
      };
      view.addEventListener("focusin", onFocusIn);

      // A drag that ends over a card would otherwise fire that card's link.
      const swallowClick = (e: MouseEvent) => {
        if (!dragged.current) return;
        e.preventDefault();
        e.stopPropagation();
        dragged.current = false;
      };
      view.addEventListener("click", swallowClick, true);

      return () => {
        observer.kill();
        ro.disconnect();
        view.removeEventListener("focusin", onFocusIn);
        renderRef.current = () => {};
        view.removeEventListener("click", swallowClick, true);
      };
    },
    { scope: rootRef, dependencies: [mounted, count, reduced] },
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Soft edge fades, so a card leaving the rail reads as depth rather than
          a clipped layout. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-4 z-10 w-10 bg-gradient-to-r from-paper to-transparent sm:-left-6 sm:w-16"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -right-4 z-10 w-10 bg-gradient-to-l from-paper to-transparent sm:-right-6 sm:w-16"
      />
      <div
        ref={viewRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            nudge(-1);
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            nudge(1);
          }
        }}
        className={`-mx-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-6 [&::-webkit-scrollbar]:hidden ${
          // Before mount this is an ordinary scroller, which is also the whole
          // no-JS experience. After mount the track is driven by transform and
          // must not scroll natively as well.
          mounted
            ? "cursor-grab touch-pan-y overflow-hidden active:cursor-grabbing"
            : "snap-x snap-mandatory overflow-x-auto"
        }`}
      >
        <div
          ref={trackRef}
          className="flex items-start gap-5 px-4 pt-2 pb-6 will-change-transform sm:px-6"
        >
          {run.map((child, i) => {
            const clone = i >= count;
            return (
              <div
                key={i}
                data-slide
                data-clone={clone ? "true" : undefined}
                aria-hidden={clone || undefined}
                // Sized to overflow the track on every breakpoint, so there is
                // always a centre to move through.
                className="w-[74vw] flex-none snap-center sm:w-[46vw] lg:w-[30%]"
              >
                <div className="origin-center opacity-[var(--cf-dim,1)] will-change-transform [transform:perspective(1200px)_rotateY(var(--cf-rot,0deg))_scale(var(--cf-scale,1))]">
                  {child}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hairline indicator and bare arrows — the site's own language. Bordered
          arrow boxes read as dated pagination chrome. */}
      <div className="mt-3 flex items-center gap-6">
        <div className="relative h-px flex-1 bg-line" aria-hidden>
          <span
            className="absolute inset-y-0 block bg-ink"
            style={{
              width: "var(--sl-thumb, 100%)",
              left: "calc(var(--sl-progress, 0) * (100% - var(--sl-thumb, 100%)))",
            }}
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Sản phẩm trước"
            className="cursor-pointer font-mono text-[15px] leading-none text-ink transition-colors hover:text-forest"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Sản phẩm tiếp theo"
            className="cursor-pointer font-mono text-[15px] leading-none text-ink transition-colors hover:text-forest"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
