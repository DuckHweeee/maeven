"use client";

import { useRef } from "react";
import { DUR_FAST, EASE_SNAP, MOTION_OK, gsap, useGSAP } from "@/lib/gsap";

const DIGITS = "0123456789".split("");

/**
 * Mono index like `01 / 04` whose digits roll vertically, one column per
 * digit, when `value` changes — the mechanical counter of the brief.
 *
 * The resting position is rendered by React (CSS `translate`), so SSR, no-JS
 * and reduced motion all show the right number; GSAP only animates a temporary
 * `transform` offset from the old digit back to zero. Screen readers get one
 * plain string (`label`, or the formatted numbers); pass `live` when the value
 * changes in response to scrolling and should be announced.
 *
 * @example <Counter value={active + 1} total={looks.length} className="text-label" />
 */
export default function Counter({
  value,
  total,
  pad = 2,
  separator = " / ",
  label,
  live = false,
  className = "",
}: {
  /** Current number (integer ≥ 0). */
  value: number;
  /** Optional fixed total shown after the separator; does not roll. */
  total?: number;
  /** Zero-pad width. Default 2 → `01`. */
  pad?: number;
  separator?: string;
  /** Accessible text. Default `"01 / 04"`-style string. */
  label?: string;
  /** Announce changes politely (aria-live). Default false. */
  live?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const str = String(Math.max(0, Math.floor(value))).padStart(pad, "0");
  const totalStr = total == null ? null : String(total).padStart(pad, "0");
  const prev = useRef(str);

  useGSAP(
    () => {
      const before = prev.current;
      prev.current = str;
      const el = ref.current;
      if (!el || before === str || before.length !== str.length) return;

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const cols = el.querySelectorAll<HTMLElement>("[data-digit-col]");
        let order = 0;
        // Right-most digit first, like a drum counter.
        for (let i = str.length - 1; i >= 0; i--) {
          const a = Number(before[i]);
          const b = Number(str[i]);
          if (a === b) continue;
          gsap.fromTo(
            cols[i],
            { yPercent: (b - a) * 10 },
            { yPercent: 0, duration: DUR_FAST, ease: EASE_SNAP, delay: order++ * 0.05 },
          );
        }
      });
      // revertOnUpdate: a value change mid-roll snaps the old roll to rest.
      return () => mm.revert();
    },
    { scope: ref, dependencies: [str], revertOnUpdate: true },
  );

  return (
    <span
      ref={ref}
      className={`inline-flex items-start font-mono leading-none tabular-nums ${className}`}
    >
      <span className="sr-only" aria-live={live ? "polite" : undefined}>
        {label ?? (totalStr ? `${str}${separator}${totalStr}` : str)}
      </span>
      <span aria-hidden className="inline-flex items-start">
        {str.split("").map((d, i) => (
          <span key={`${str.length}-${i}`} className="relative inline-block h-[1em] w-[1ch] overflow-clip">
            {/* Resting position on a wrapper GSAP never tweens: GSAP folds a
                CSS `translate` into `transform` (and sets translate: none) the
                first time it animates an element, after which React's next
                `translate` stacks on top and the digits drift (05 / 04). */}
            <span className="block" style={{ translate: `0 ${Number(d) * -10}%` }}>
              <span data-digit-col className="block">
                {DIGITS.map((n) => (
                  <span key={n} className="block h-[1em]">
                    {n}
                  </span>
                ))}
              </span>
            </span>
          </span>
        ))}
        {totalStr && (
          <span className="inline-block h-[1em] whitespace-pre">
            {separator}
            {totalStr}
          </span>
        )}
      </span>
    </span>
  );
}
