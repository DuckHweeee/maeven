"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Drifts a photo against the page as it scrolls past.
 *
 * The child is scaled up before it is moved. Translating a `fill` image inside
 * a fixed-ratio frame would otherwise drag its own edge into view at the top or
 * bottom of the travel; the overscan covers exactly the distance the tween
 * asks for, so the frame stays full whatever `amount` is set to.
 *
 * `scrub: true` ties progress to scroll position rather than playing on entry,
 * which is the difference between parallax and an animation that happens to be
 * triggered by scrolling.
 */
export default function Parallax({
  children,
  amount = 60,
  className = "",
}: {
  children: React.ReactNode;
  /** Total vertical travel in px across the whole pass. */
  amount?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Enough overscan to hide `amount` of travel in either direction.
        const frame = ref.current;
        const overscan = frame ? 1 + amount / frame.offsetHeight : 1.1;
        gsap.set(inner.current, { scale: overscan });

        gsap.fromTo(
          inner.current,
          { y: -amount / 2 },
          {
            y: amount / 2,
            ease: "none",
            scrollTrigger: {
              trigger: frame,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [amount] },
  );

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <div ref={inner} className="h-full w-full will-change-transform">
        {children}
      </div>
    </div>
  );
}
