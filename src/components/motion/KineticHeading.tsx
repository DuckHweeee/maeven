"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { clamp, usePointerEffects } from "@/lib/motion";

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
 * Word rects are measured once per interaction and on resize — never per frame,
 * and each word's swell is a `gsap.quickTo` that gets retargeted rather than a
 * hand-rolled requestAnimationFrame lerp.
 *
 * The dependency list spreads `weight` and `width` into numbers on purpose: they
 * arrive as array literals, which are a fresh reference on every render, so
 * depending on the arrays themselves tore down and rebuilt the whole effect each
 * time the parent re-rendered.
 */
export default function KineticHeading({
  text,
  className = "",
  weight = [520, 860],
  width = [88, 118],
}: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { enabled } = usePointerEffects();

  useGSAP(
    () => {
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

    // One eased value per word, 0 at rest and 1 under the pointer.
    const swell = words.map(() => ({ t: 0 }));

    const paint = (i: number) => {
      const t = swell[i].t;
      const wght = Math.round(weight[0] + (weight[1] - weight[0]) * t);
      const wdth = Math.round(width[0] + (width[1] - width[0]) * t);
      words[i].style.setProperty(
        "font-variation-settings",
        `"wght" ${wght}, "wdth" ${wdth}`,
      );
    };

    const to = swell.map((s, i) =>
      gsap.quickTo(s, "t", {
        duration: 0.55,
        ease: "power3.out",
        onUpdate: () => paint(i),
      }),
    );

    const onMove = (e: PointerEvent) => {
      if (!centers.length) measure();
      for (let i = 0; i < centers.length; i++) {
        const d = Math.hypot(e.clientX - centers[i].x, e.clientY - centers[i].y);
        // Influence falls off over ~260px, so neighbouring words swell slightly.
        to[i](clamp(1 - d / 260, 0, 1));
      }
    };

    const onLeave = () => to.forEach((f) => f(0));

    const onScrollOrResize = () => {
      centers = [];
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    root.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      root.removeEventListener("pointerleave", onLeave);
    };
    },
    {
      scope: ref,
      dependencies: [enabled, weight[0], weight[1], width[0], width[1]],
    },
  );

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
