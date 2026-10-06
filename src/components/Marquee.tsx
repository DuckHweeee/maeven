"use client";

import { useRef, useState } from "react";
import { MOTION_OK, ScrollTrigger, gsap, useGSAP } from "@/lib/gsap";

/** Base loop length in seconds for one copy of the list. */
const LOOP_S = 38;
/** Scroll velocity (px/s) that adds one extra unit of speed. */
const VEL_UNIT = 450;
const MAX_BOOST = 5;

/**
 * A thin mono strip of standing promises, between two hairlines.
 *
 * It drifts slowly and answers the reader's scroll: velocity from
 * `ScrollTrigger.getVelocity()` speeds it up, and scrolling back up runs it
 * backwards; it settles to the base drift ~0.2s after the page stops. That is
 * the only effect.
 *
 * WCAG 2.2.2: a visible pause button stops it for good (until pressed
 * again); it also stops under the pointer and while focus is inside it.
 * The list is rendered twice for a seamless -50% loop; the copy is
 * `aria-hidden`, so screen readers get each promise once.
 *
 * Reduced motion: nothing moves, so there is no button and no copy — the
 * promises wrap onto as many lines as they need.
 *
 * Items come in as a prop rather than being imported from data.ts, so this
 * client component does not pull the data module into the browser bundle.
 */
export default function Marquee({ items }: { items: readonly string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  /** Every reason to stand still; it runs only when none is set. */
  const holds = useRef({ pointer: false, focus: false, user: false });
  const sync = useRef<(() => void) | null>(null);
  const setHold = (why: keyof typeof holds.current, on: boolean) => {
    holds.current[why] = on;
    sync.current?.();
  };

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const inner = el.querySelector("[data-run]");
        const loop = gsap.to(inner, { xPercent: -50, duration: LOOP_S, ease: "none", repeat: -1 });
        // Wrap the playhead so reversing past 0 keeps looping instead of stopping.
        loop.totalTime(LOOP_S * 1000);

        const speed = { v: 1 };
        let dir = 1;
        let held = false;
        const toSpeed = gsap.quickTo(speed, "v", {
          duration: 0.6,
          ease: "power3.out",
          onUpdate: () => {
            loop.timeScale(speed.v);
          },
        });
        const settle = gsap.delayedCall(0.2, () => toSpeed(held ? 0 : dir)).pause();

        const st = ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            dir = self.direction;
            if (held) return;
            const boost = Math.min(MAX_BOOST, Math.abs(self.getVelocity()) / VEL_UNIT);
            toSpeed(dir * (1 + boost));
            settle.restart(true);
          },
          onToggle: (self) => (self.isActive ? loop.resume() : loop.pause()),
        });
        if (!st.isActive) loop.pause();

        sync.current = () => {
          const h = holds.current;
          held = h.pointer || h.focus || h.user;
          toSpeed(held ? 0 : dir);
        };
        // A pause chosen before a preference change still holds.
        sync.current();
        return () => {
          sync.current = null;
        };
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      className="flex border-y border-line bg-paper font-mono text-label text-slate uppercase"
      onPointerEnter={() => setHold("pointer", true)}
      onPointerLeave={() => setHold("pointer", false)}
      onFocus={() => setHold("focus", true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHold("focus", false);
      }}
    >
      <div className="min-w-0 flex-1 overflow-hidden py-2.5 whitespace-nowrap motion-reduce:px-4 motion-reduce:whitespace-normal sm:motion-reduce:px-6">
        <div data-run className="inline-block will-change-transform motion-reduce:block">
          {[0, 1].map((copy) => (
            <span
              key={copy}
              aria-hidden={copy === 1 || undefined}
              className={copy === 1 ? "motion-reduce:hidden" : undefined}
            >
              {items.map((item, i) => (
                <span key={i} className="motion-reduce:inline-block">
                  {item}
                  <span aria-hidden className="px-6 text-smoke">
                    /
                  </span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-pressed={paused}
        aria-label="Tạm dừng dải chữ chạy"
        onClick={() => {
          const next = !holds.current.user;
          setPaused(next);
          setHold("user", next);
        }}
        className="flex min-w-11 flex-none cursor-pointer items-center justify-center gap-2 border-l border-line px-3 uppercase transition-colors hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink aria-pressed:text-ink motion-reduce:hidden"
      >
        <span aria-hidden className="inline-block w-4 text-center">
          {paused ? "▶" : "❚❚"}
        </span>
        <span aria-hidden className="hidden sm:inline">
          {paused ? "Chạy" : "Dừng"}
        </span>
      </button>
    </div>
  );
}
