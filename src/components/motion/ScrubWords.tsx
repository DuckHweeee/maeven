"use client";

import { useRef } from "react";
import { MOTION_OK, SplitText, gsap, useGSAP } from "@/lib/gsap";

type Tag = "p" | "h2" | "h3" | "div";

/**
 * Words brighten from `dim` (0.15) to 1 as the block crosses the viewport,
 * scrubbed to scroll — reading pace set by the reader's thumb.
 *
 * Words only (no lines), so no re-split on resize is needed. Reduced motion /
 * no JS: full-opacity text. Headings keep an `aria-label`; `p`/`div` keep their
 * text exposed directly.
 *
 * @example <ScrubWords className="text-headline">Mười bốn mẫu, một mùa…</ScrubWords>
 */
export default function ScrubWords({
  as: Tag = "p",
  children,
  className = "",
  dim = 0.15,
  start = "top 80%",
  end = "bottom 45%",
  scrub = true,
}: {
  /** Element to render. Default `p`. */
  as?: Tag;
  children: React.ReactNode;
  className?: string;
  /** Opacity of words not yet reached. */
  dim?: number;
  /** ScrollTrigger start. */
  start?: string;
  /** ScrollTrigger end. */
  end?: string;
  /** `true` (default; the smoother already eases) or seconds of catch-up. */
  scrub?: boolean | number;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const split = SplitText.create(el, {
          type: "words",
          aria: Tag === "p" || Tag === "div" ? "none" : "auto",
        });
        gsap.fromTo(
          split.words,
          { opacity: dim },
          {
            opacity: 1,
            ease: "none",
            stagger: 0.1,
            scrollTrigger: { trigger: el, start, end, scrub },
          },
        );
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [Tag, dim, start, end, scrub] },
  );

  return (
    <Tag ref={ref as React.Ref<never>} className={className}>
      {children}
    </Tag>
  );
}
