"use client";

import { useRef } from "react";
import { EASE_SNAP, MOTION_OK, gsap, useGSAP } from "@/lib/gsap";

/**
 * A 1px rule that draws itself (scaleX from the left, or scaleY from the top)
 * when it enters the viewport. Decorative, so `aria-hidden`.
 *
 * `className` carries the colour (default `bg-line`) and any sizing; pass a
 * full set, e.g. `className="bg-ink"`. For a staggered table, give each rule
 * `delay={i * 0.06}`.
 *
 * @example <Hairline />
 * @example <Hairline axis="y" className="bg-line h-24" delay={0.2} />
 */
export default function Hairline({
  axis = "x",
  className = "bg-line",
  trigger = "scroll",
  delay = 0,
  duration = 0.9,
  start = "top 92%",
}: {
  /** `x` (default) draws left → right; `y` draws top → bottom. */
  axis?: "x" | "y";
  /** Colour + extra sizing. Default `bg-line`. */
  className?: string;
  /** `scroll` (default) plays once on enter; `load` plays on mount. */
  trigger?: "scroll" | "load";
  /** Seconds. */
  delay?: number;
  /** Seconds. */
  duration?: number;
  /** ScrollTrigger start, for `trigger="scroll"`. */
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const prop = axis === "x" ? "scaleX" : "scaleY";
        gsap.fromTo(
          el,
          { [prop]: 0 },
          {
            [prop]: 1,
            duration,
            delay,
            ease: EASE_SNAP,
            clearProps: "transform",
            scrollTrigger: trigger === "scroll" ? { trigger: el, start, once: true } : undefined,
          },
        );
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [axis, trigger, delay, duration, start] },
  );

  return (
    <div
      ref={ref}
      aria-hidden
      className={`${axis === "x" ? "h-px w-full origin-left" : "h-full w-px origin-top"} ${className}`}
    />
  );
}
