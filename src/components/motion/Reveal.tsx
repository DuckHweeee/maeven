"use client";

import { useRef } from "react";
import { DUR, EASE_OUT, gsap, useGSAP } from "@/lib/gsap";

/**
 * Reveals children once they enter the viewport.
 *
 * `gsap.from()` is what makes this safe without JavaScript: the hidden state is
 * written by the tween, so a reader whose script never runs simply sees the
 * content. The previous CSS version put `opacity: 0` in the stylesheet and
 * needed a `@media (scripting: enabled)` guard to avoid hiding the page from
 * no-JS readers and crawlers — with GSAP there is nothing to guard.
 *
 * `matchMedia` carries the reduced-motion contract: under `reduce` the tween is
 * never created at all, so nothing is ever hidden and nothing moves.
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  /** Milliseconds, so call sites can keep writing `delay={i * 70}`. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(ref.current, {
          autoAlpha: 0,
          y: 18,
          duration: DUR,
          ease: EASE_OUT,
          delay: delay / 1000,
          scrollTrigger: {
            trigger: ref.current,
            // Slightly inside the fold, so a block animates as it arrives
            // rather than after it has already been read.
            start: "top 88%",
            once: true,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [delay] },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
