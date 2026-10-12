"use client";

import { useEffect, useRef, useState } from "react";
import SplitReveal from "@/components/motion/SplitReveal";
import { SIZES } from "@/lib/constants";
import type { Product } from "@/lib/data";
import { addToCart } from "@/lib/cart";
import { DUR_FAST, EASE_SNAP, Flip, MOTION_OK, useGSAP } from "@/lib/gsap";

/** How long the mint "added" confirmation stays on the button. */
const ADDED_MS = 2400;

/**
 * Number, name, price, size and the add-to-cart action — pinned beside the
 * gallery on desktop by ProductStage.
 *
 * The active-size marker is a single mint bar that React re-creates inside the
 * chosen button; Flip (matched by `data-flip-id`) carries it across from the
 * previous one. Reduced motion: it simply appears under the new size.
 * Mint is used only as signal here: that marker and the "added" confirmation.
 */
export default function BuyPanel({ product }: { product: Product }) {
  // Middle of whatever scale this product uses — "M" on the clothing scale,
  // which is what this defaulted to when the scale was the only one there was.
  const scale = product.sizes ?? SIZES;
  const [size, setSize] = useState(() => scale[Math.floor(scale.length / 2)]);
  const [added, setAdded] = useState(false);

  const sizesRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);

  const pick = (label: string) => {
    if (label === size) return;
    if (sizesRef.current && window.matchMedia(MOTION_OK).matches) {
      flipState.current = Flip.getState(sizesRef.current.querySelector("[data-flip-id]"));
    }
    setSize(label);
  };

  useGSAP(
    () => {
      const state = flipState.current;
      flipState.current = null;
      if (!state) return;
      Flip.from(state, {
        targets: sizesRef.current?.querySelector("[data-flip-id]"),
        duration: DUR_FAST,
        ease: EASE_SNAP,
      });
    },
    { scope: sizesRef, dependencies: [size] },
  );

  // Not an animation: just drops the confirmation after a moment.
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), ADDED_MS);
    return () => clearTimeout(t);
  }, [added]);

  return (
    <div className="pb-2">
      <div className="flex items-start justify-between gap-4">
        <span
          aria-hidden
          className="font-mono text-[clamp(4rem,2rem+4vw,6.5rem)] leading-[0.8] tracking-[-0.06em] tabular-nums"
        >
          {product.no}
        </span>
        <span className="pt-1 text-right font-mono text-label text-smoke uppercase">
          {product.sku}
          <br />
          SS26
        </span>
      </div>

      <SplitReveal
        as="h1"
        trigger="load"
        delay={0.15}
        className="mt-8 mb-0 text-[clamp(2.5rem,1rem+3vw,4.5rem)] md:mt-6 leading-[0.92] font-semibold tracking-[-0.03em] [font-stretch:75%]"
      >
        {product.name}
      </SplitReveal>

      {/* ProductStage keeps this line below the header while the panel is pinned. */}
      <div data-pin-keep className="mt-5 font-mono text-[15px] tabular-nums md:mt-4">
        {product.price}
      </div>
      <p className="mt-6 mb-0 max-w-[46ch] text-[15.5px] leading-[1.65] text-graphite md:mt-4">
        {product.blurb}
      </p>

      <div className="mt-8 flex items-baseline justify-between font-mono text-label text-smoke uppercase md:mt-6">
        <span id="size-label">Kích cỡ</span>
        <span aria-hidden>{size}</span>
      </div>
      <div
        ref={sizesRef}
        role="group"
        aria-labelledby="size-label"
        // One equal row, whatever the scale's length (5 letters, 3 head
        // sizes): a wrapping flex row orphaned "XL" on a line of its own.
        className="mt-3 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${scale.length}, minmax(0, 1fr))` }}
      >
        {scale.map((label) => {
          const on = size === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => pick(label)}
              aria-pressed={on}
              className={`relative min-w-0 cursor-pointer border px-3 py-3 font-mono text-xs transition-colors ${
                on ? "border-ink text-ink" : "border-line-3 text-slate hover:border-ink hover:text-ink"
              }`}
            >
              {label}
              {on && (
                <span
                  aria-hidden
                  data-flip-id="size-mark"
                  className="absolute inset-x-0 -bottom-px h-[3px] bg-mint"
                />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          addToCart(product.sku, size);
          setAdded(true);
        }}
        className="mt-6 flex w-full cursor-pointer items-center justify-center gap-3 border md:mt-4 border-ink bg-ink px-5 py-4 font-mono text-label text-paper uppercase transition-colors hover:bg-graphite"
      >
        {added && <span aria-hidden className="h-2 w-2 bg-mint" />}
        {added ? `Đã thêm · size ${size}` : `Thêm vào giỏ · size ${size}`}
      </button>
      <span className="sr-only" aria-live="polite">
        {added ? `Đã thêm ${product.name}, size ${size}, vào giỏ` : ""}
      </span>

      <dl className="mt-8 mb-0 border-t border-ink md:mt-6">
        {product.specs.map((s) => (
          <div key={s.k} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 border-b border-line py-3">
            <dt className="font-mono text-label text-smoke uppercase">{s.k}</dt>
            <dd className="m-0 text-[14px] leading-snug text-graphite">{s.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
