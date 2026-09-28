"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { MARQUEE_ITEMS } from "@/lib/data";

/**
 * Ticker of standing promises.
 *
 * The list is rendered twice so the -50% travel loops seamlessly.
 *
 * This was a CSS keyframe animation. Moving it to GSAP costs a client component,
 * and buys the thing CSS could not do here: the strip slows to a stop under the
 * pointer. The items are real information — delivery time, where the cloth is
 * woven — so being able to stop and read one is worth the trade.
 */
export default function Marquee() {
  const ref = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const tween = useRef<gsap.core.Tween | null>(null);

  const run = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        tween.current = gsap.to(inner.current, {
          xPercent: -50,
          duration: 26,
          ease: "none",
          repeat: -1,
        });
        return () => {
          tween.current = null;
        };
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  const ease = (to: number) =>
    tween.current && gsap.to(tween.current, { timeScale: to, duration: 0.4 });

  return (
    <div
      ref={ref}
      className="mono-label overflow-hidden whitespace-nowrap bg-mint py-[11px] tracking-[0.24em] text-ink"
      onMouseEnter={() => ease(0)}
      onMouseLeave={() => ease(1)}
    >
      <div ref={inner} className="inline-block will-change-transform">
        {run.map((item, i) => (
          <span key={i}>
            {item}
            <span className="px-2">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
