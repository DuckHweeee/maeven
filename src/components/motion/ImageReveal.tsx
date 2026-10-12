"use client";

import { useRef } from "react";
import Photo, { type PhotoProps } from "@/components/Photo";
import { EASE_SNAP, MOTION_OK, gsap, useGSAP } from "@/lib/gsap";

type Edge = "bottom" | "top" | "left" | "right";

/** Fully clipped from each edge: the wipe grows away from `from`. */
const CLOSED: Record<Edge, string> = {
  bottom: "inset(100% 0% 0% 0%)",
  top: "inset(0% 0% 100% 0%)",
  left: "inset(0% 100% 0% 0%)",
  right: "inset(0% 0% 0% 100%)",
};
const OPEN = "inset(0% 0% 0% 0%)";

/**
 * `Photo` revealed by a one-axis clip-path wipe, with the image inside settling
 * from scale 1.08 → 1. No opacity: the frame is either cut or whole.
 *
 * Inline styles are cleared on completion, so CSS hover transforms on the
 * image (e.g. a card's `group-hover:scale-[1.03]`) work afterwards.
 * Reduced motion / no JS: the photo is simply there.
 *
 * @example <ImageReveal src={p.src} alt={p.alt} ratio="4 / 5" from="bottom" sizes="50vw" />
 * @example <ImageReveal {...hero} ratio="16 / 9" from="top" trigger="load" priority />
 */
export default function ImageReveal({
  from = "bottom",
  trigger = "scroll",
  delay = 0,
  duration = 1.1,
  start = "top 85%",
  className = "",
  photoClassName = "",
  ...photo
}: Omit<PhotoProps, "className"> & {
  /** Edge the wipe starts from. Default `bottom` (rises upward). */
  from?: Edge;
  /** `scroll` (default) plays once on enter; `load` plays on mount. */
  trigger?: "scroll" | "load";
  /** Seconds. */
  delay?: number;
  /** Seconds. */
  duration?: number;
  /** ScrollTrigger start, for `trigger="scroll"`. */
  start?: string;
  /** Layout classes for the clipping wrapper (grid placement, width). */
  className?: string;
  /** Passed to `Photo` as its `className`. */
  photoClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const img = el.querySelector("img");
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline({
          delay,
          defaults: { duration, ease: EASE_SNAP },
          scrollTrigger: trigger === "scroll" ? { trigger: el, start, once: true } : undefined,
        });
        tl.fromTo(el, { clipPath: CLOSED[from] }, { clipPath: OPEN, clearProps: "clipPath" });
        if (img) {
          tl.fromTo(img, { scale: 1.08 }, { scale: 1, clearProps: "transform" }, 0);
        }
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [from, trigger, delay, duration, start] },
  );

  return (
    <div ref={ref} className={className}>
      <Photo {...photo} className={photoClassName} />
    </div>
  );
}
