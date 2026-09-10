"use client";

import { useEffect, useRef } from "react";
import { clamp, lerp, usePointerEffects } from "@/lib/motion";

type Props = {
  text: string;
  className?: string;
  /** Weight range travelled, along Archivo's wght axis (100–900). */
  weight?: [number, number];
  /** Width range travelled, along Archivo's wdth axis (62–125). */
  width?: [number, number];
};

/**
 * Headline whose letters thicken and widen as the pointer passes over them, and
 * settle as the page scrolls past. Archivo is loaded as a variable font, so this
 * animates the real wght/wdth axes rather than faking weight with a transform.
 *
 * Word rects are measured once per interaction and on resize — never per frame.
 */
export default function KineticHeading({
  text,
  className = "",
  weight = [520, 860],
  width = [88, 118],
}: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { enabled } = usePointerEffects();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const words = Array.from(
      root.querySelectorAll<HTMLSpanElement>("[data-word]"),
    );
    if (!words.length) return;

    // Static, readable default. Applied whether or not the effect runs.
    const base = () =>
      words.forEach((w) =>
        w.style.setProperty(
          "font-variation-settings",
          `"wght" ${weight[0]}, "wdth" ${width[0]}`,
        ),
      );

    base();
    if (!enabled) return;

    let centers: { x: number; y: number }[] = [];
    const measure = () => {
      centers = words.map((w) => {
        const r = w.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    };

    const current = words.map(() => 0);
    const target = words.map(() => 0);
    let frame = 0;
    let running = false;

    const tick = () => {
      let moving = false;
      for (let i = 0; i < words.length; i++) {
        current[i] = lerp(current[i], target[i], 0.12);
        if (Math.abs(current[i] - target[i]) > 0.002) moving = true;

        const t = current[i];
        const wght = Math.round(lerp(weight[0], weight[1], t));
        const wdth = Math.round(lerp(width[0], width[1], t));
        words[i].style.setProperty(
          "font-variation-settings",
          `"wght" ${wght}, "wdth" ${wdth}`,
        );
      }
      if (!moving) {
        running = false;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (!centers.length) measure();
      for (let i = 0; i < centers.length; i++) {
        const d = Math.hypot(e.clientX - centers[i].x, e.clientY - centers[i].y);
        // Influence falls off over ~260px, so neighbouring words swell slightly.
        target[i] = clamp(1 - d / 260, 0, 1);
      }
      start();
    };

    const onLeave = () => {
      target.fill(0);
      start();
    };

    const onScrollOrResize = () => {
      centers = [];
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    root.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled, weight, width]);

  return (
    <h1 ref={ref} className={className}>
      {text.split(" ").map((word, i) => (
        <span key={`${word}-${i}`} data-word className="inline-block">
          {word}
          {i < text.split(" ").length - 1 ? " " : ""}
        </span>
      ))}
    </h1>
  );
}
