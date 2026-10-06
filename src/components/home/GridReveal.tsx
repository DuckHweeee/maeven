"use client";

import { useRef } from "react";
import { EASE_SNAP, MOTION_OK, ScrollTrigger, gsap, useGSAP } from "@/lib/gsap";

/**
 * A list whose items wipe up into view (clip-path from the bottom edge) in
 * batches as they enter: one `ScrollTrigger.batch` for the whole grid rather
 * than a trigger and a tween per card. Items that enter together stagger by
 * 80ms. Inline styles clear on completion, so card hover transforms work.
 *
 * Reduced motion / no JS: the items are simply there.
 */
export default function GridReveal({
  children,
  className = "",
  label,
}: {
  /** `<li>` elements. */
  children: React.ReactNode;
  className?: string;
  /** Optional accessible name for the list. */
  label?: string;
}) {
  const ref = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const items = Array.from(el.children) as HTMLElement[];
        gsap.set(items, { clipPath: "inset(100% 0% 0% 0%)" });
        ScrollTrigger.batch(items, {
          start: "top 88%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 0.9,
              ease: EASE_SNAP,
              stagger: 0.08,
              clearProps: "clipPath",
            }),
        });
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <ul ref={ref} aria-label={label} className={`list-none ${className}`}>
      {children}
    </ul>
  );
}
