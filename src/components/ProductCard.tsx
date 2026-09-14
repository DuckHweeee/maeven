"use client";

import { useRef } from "react";
import Link from "next/link";
import Photo from "@/components/Photo";
import { DUR, EASE_OUT, gsap, useGSAP } from "@/lib/gsap";
import { usePointerEffects } from "@/lib/motion";
import type { Product } from "@/lib/data";

/** Scoped selector, resting state, hovered state, timing. */
const STEPS = [
  { sel: "img", rest: { scale: 1 }, over: { scale: 1.045 }, dur: DUR, at: 0 },
  { sel: "[data-rule]", rest: { scaleX: 0 }, over: { scaleX: 1 }, dur: DUR * 0.8, at: 0 },
  { sel: "[data-no]", rest: { y: 0 }, over: { y: 3 }, dur: DUR * 0.7, at: 0 },
  { sel: "[data-name]", rest: { x: 0 }, over: { x: 3 }, dur: DUR * 0.7, at: 0.05 },
] as const;

/**
 * Product card with a GSAP hover.
 *
 * Four properties across four elements, offset against each other — that
 * orchestration is what GSAP is here for. `overwrite: "auto"` is the other half:
 * the settle tween kills the entry tween and starts from whatever value it had
 * reached, so a pointer sweeping along a row leaves four overlapping settles
 * rather than four jumps.
 *
 * Written as paired tweens rather than a paused timeline played and reversed,
 * which keeps it the same shape as FlipCard — one `gsap.to` per state change,
 * `overwrite` sorting out the rest. A timeline would work equally well here.
 *
 * Colour stays on the CSS `group-hover` below on purpose — it is the one part of
 * the hover a reader without JavaScript still gets.
 *
 * Nothing here transforms the card root: on the home page these sit inside
 * Coverflow, which owns the transform on its own inner wrapper.
 */
export default function ProductCard({ product }: { product: Product }) {
  const root = useRef<HTMLAnchorElement>(null);
  const { enabled } = usePointerEffects();

  const { contextSafe } = useGSAP({ scope: root });

  const set = contextSafe((over: boolean) => {
    for (const step of STEPS) {
      gsap.to(step.sel, {
        ...(over ? step.over : step.rest),
        duration: step.dur,
        // Settling happens together; only the entry is staggered.
        delay: over ? step.at : 0,
        ease: EASE_OUT,
        overwrite: "auto",
      });
    }
  });

  // Focus gets the same treatment as hover, which `group-hover` alone would miss.
  const play = () => {
    if (enabled) set(true);
  };
  const reverse = () => {
    if (enabled) set(false);
  };

  return (
    <Link
      ref={root}
      href={`/product/${product.sku}`}
      className="group block"
      onMouseEnter={play}
      onMouseLeave={reverse}
      onFocus={play}
      onBlur={reverse}
    >
      <Photo
        src={product.gallery[0].src}
        alt={product.gallery[0].alt}
        ratio="3 / 4"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
        className="[&>img]:will-change-transform"
      >
        <span
          data-no
          className="mono-label absolute top-2.5 left-3 z-10 text-[10.5px] tracking-[0.12em] text-paper mix-blend-difference"
        >
          {product.no}
        </span>
      </Photo>
      <div className="relative mt-3 border-t border-ink pt-[11px]">
        {/* Drawn over the rule on hover — the accent the promises cards use,
            borrowed for a moment. */}
        <span
          data-rule
          aria-hidden
          className="absolute -top-px left-0 h-px w-full origin-left scale-x-0 bg-forest"
        />
        <div className="flex justify-between gap-3 text-[14.5px]">
          <span data-name className="transition-colors group-hover:text-forest">
            {product.name}
          </span>
          <span className="font-mono text-graphite">{product.price}</span>
        </div>
      </div>
      <div className="mt-1 font-mono text-[10.5px] text-smoke">{product.material}</div>
    </Link>
  );
}
