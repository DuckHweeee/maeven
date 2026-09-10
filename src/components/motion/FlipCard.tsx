"use client";

import { useState } from "react";
import Link from "next/link";
import Photo from "@/components/Photo";
import { usePointerEffects } from "@/lib/motion";
import type { Product } from "@/lib/data";

/**
 * Product card that turns over like a lookbook page: front is the garment, back
 * is the workshop that wove the cloth.
 *
 * Hover flips it for pointer users; the always-present button handles touch and
 * keyboard. The hidden face is `inert` so it never takes focus or reaches a
 * screen reader, which is what makes a flip card safe rather than a focus trap.
 */
export default function FlipCard({ product }: { product: Product }) {
  const [flipped, setFlipped] = useState(false);
  const { enabled: hoverable, reduced } = usePointerEffects();

  const show = (v: boolean) => hoverable && setFlipped(v);

  return (
    <div
      className="[perspective:1400px]"
      onMouseEnter={() => show(true)}
      onMouseLeave={() => show(false)}
    >
      <div
        className={`relative grid [transform-style:preserve-3d] ${
          reduced ? "" : "transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        }`}
        style={{ transform: flipped ? "rotateY(180deg)" : undefined }}
      >
        {/* ------------------------------------------------------- front */}
        <div
          className="col-start-1 row-start-1 [backface-visibility:hidden]"
          aria-hidden={flipped}
          inert={flipped}
        >
          <Link href={`/product/${product.sku}`} className="group block">
            <Photo
              src={product.gallery[0].src}
              alt={product.gallery[0].alt}
              ratio="3 / 4"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
            >
              <span className="mono-label absolute top-2.5 left-3 z-10 text-[10.5px] tracking-[0.12em] text-paper mix-blend-difference">
                {product.no}
              </span>
            </Photo>
            <div className="mt-3 flex justify-between gap-3 border-t border-ink pt-[11px] text-[14.5px]">
              <span className="transition-colors group-hover:text-forest">
                {product.name}
              </span>
              <span className="font-mono text-graphite">{product.price}</span>
            </div>
            <div className="mt-1 font-mono text-[10.5px] text-smoke">
              {product.material}
            </div>
          </Link>
        </div>

        {/* -------------------------------------------------------- back */}
        <div
          className="col-start-1 row-start-1 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          aria-hidden={!flipped}
          inert={!flipped}
        >
          <div className="weave flex h-full flex-col justify-between bg-ink p-5 text-paper">
            <div>
              <div className="mono-label text-[10px] tracking-[0.16em] text-mint">
                {product.maker.place}
              </div>
              <h3 className="mt-2 font-display text-[22px] leading-[1.15] font-bold tracking-[-0.02em]">
                {product.maker.workshop}
              </h3>
              <p className="mt-3 text-[13.5px] leading-[1.65] text-chalk">
                {product.maker.story}
              </p>
            </div>
            <Link
              href={`/product/${product.sku}`}
              className="mono-label mt-5 inline-block border-b border-mint pb-1 text-[10px] tracking-[0.14em] text-paper"
            >
              {product.name} →
            </Link>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        aria-pressed={flipped}
        className="mono-label mt-2 cursor-pointer text-[10px] tracking-[0.14em] text-smoke transition-colors hover:text-ink"
      >
        {flipped ? "Xem sản phẩm" : "Câu chuyện xưởng"}
      </button>
    </div>
  );
}
