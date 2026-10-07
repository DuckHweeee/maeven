"use client";

import { useRef } from "react";
import { EASE_SNAP, MOTION_OK, SplitText, gsap, useGSAP } from "@/lib/gsap";

type Tag = "h1" | "h2" | "h3" | "p" | "div";

/** Font loading never blocks text for longer than this. */
const FONT_WAIT_MS = 1200;

/**
 * Headline that rises into place line by line behind a mask (SplitText,
 * `mask: "lines"`, yPercent 100 → 0).
 *
 * - Waits for `document.fonts.ready` (capped at 1.2s) so lines are measured in
 *   Archivo, not the fallback; the element is held invisible from JS only, so
 *   no-JS readers and reduced motion always see the text.
 * - `autoSplit` re-splits on resize / late font swaps; the tween is returned
 *   from `onSplit` so SplitText reverts and time-syncs it.
 * - Masks are padded (`--mask-pad-top/bottom` in globals.css) so Vietnamese
 *   stacked marks (Ộ Ẫ Ữ) and dot-below are not clipped at leading 0.92.
 * - Accessible name: headings get `aria-label` + `aria-hidden` lines; `p` and
 *   `div` keep their text exposed (aria-label is not valid on them).
 * - Plain text children only; nested inline elements are split too, but links
 *   inside a split heading lose their own accessible role. Keep links out.
 *
 * @example <SplitReveal as="h2" className="text-display">Mười bốn mẫu</SplitReveal>
 * @example <SplitReveal as="h1" trigger="load" delay={0.4}>…</SplitReveal>
 */
export default function SplitReveal({
  as: Tag = "h2",
  children,
  className = "",
  id,
  trigger = "scroll",
  delay = 0,
  stagger = 0.08,
  duration = 0.9,
  start = "top 85%",
}: {
  /** Element to render. Default `h2`. */
  as?: Tag;
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** `scroll` (default) plays once when the block enters; `load` plays on mount. */
  trigger?: "scroll" | "load";
  /** Seconds before the first line moves. */
  delay?: number;
  /** Seconds between lines. */
  stagger?: number;
  /** Seconds per line. */
  duration?: number;
  /** ScrollTrigger start, for `trigger="scroll"`. */
  start?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, (ctx) => {
        let cancelled = false;
        // From-state in JS: hide until the split exists, never in CSS.
        gsap.set(el, { autoAlpha: 0 });

        const split = () => {
          if (cancelled) return;
          ctx.add(() => {
            SplitText.create(el, {
              type: "lines",
              mask: "lines",
              linesClass: "sr-line",
              autoSplit: true,
              aria: Tag === "p" || Tag === "div" ? "none" : "auto",
              onSplit(self) {
                gsap.set(el, { autoAlpha: 1 });
                return gsap.from(self.lines, {
                  yPercent: 100,
                  duration,
                  ease: EASE_SNAP,
                  stagger,
                  delay,
                  scrollTrigger:
                    trigger === "scroll" ? { trigger: el, start, once: true } : undefined,
                });
              },
            });
          });
        };

        Promise.race([
          document.fonts?.ready ?? Promise.resolve(),
          new Promise((r) => setTimeout(r, FONT_WAIT_MS)),
        ]).then(split);

        return () => {
          cancelled = true;
        };
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [Tag, trigger, delay, stagger, duration, start] },
  );

  return (
    <Tag
      // Polymorphic ref: every allowed tag is an HTMLElement.
      ref={ref as React.Ref<never>}
      id={id}
      className={`split-reveal ${className}`}
    >
      {children}
    </Tag>
  );
}
