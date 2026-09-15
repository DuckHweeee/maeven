"use client";

import { useState } from "react";
import { SIZES } from "@/lib/constants";
import type { Product } from "@/lib/data";
import { addToCart } from "@/lib/cart";

export default function BuyPanel({ product }: { product: Product }) {
  // Middle of whatever scale this product uses — "M" on the clothing scale,
  // which is what this defaulted to when the scale was the only one there was.
  const scale = product.sizes ?? SIZES;
  const [size, setSize] = useState(() => scale[Math.floor(scale.length / 2)]);

  return (
    <div>
      <div className="mono-label text-[10.5px] text-smoke">
        {product.sku.toUpperCase()}
      </div>
      <h1 className="mt-3.5 mb-3 font-display text-[clamp(28px,4.2vw,48px)] leading-[1.06] font-bold tracking-[-0.01em]">
        {product.name}
      </h1>
      <div className="mb-[22px] font-mono text-[17px]">{product.price}</div>
      <p className="m-0 mb-[26px] max-w-[52ch] text-base leading-[1.75] text-graphite">
        {product.blurb}
      </p>

      <div className="mono-label mb-2.5 text-[10.5px] tracking-[0.16em] text-smoke">
        Kích cỡ
      </div>
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Chọn kích cỡ">
        {scale.map((label) => {
          const on = size === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setSize(label)}
              aria-pressed={on}
              className={`min-w-[52px] flex-1 cursor-pointer border py-[11px] font-mono text-xs transition-colors hover:border-ink sm:flex-none ${
                on ? "border-ink bg-ink text-paper" : "border-line-3 bg-transparent text-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => addToCart(product.sku, size)}
        className="mb-7 w-full cursor-pointer border border-ink bg-ink px-5 py-[15px] text-[12.5px] tracking-[0.14em] text-paper uppercase transition-colors hover:border-forest hover:bg-forest"
      >
        Thêm vào giỏ · size {size}
      </button>

      <div className="border-t border-line">
        {product.specs.map((s) => (
          <div
            key={s.k}
            className="flex justify-between gap-5 border-b border-line py-3.5 text-[14.5px]"
          >
            <span className="mono-label text-[10.5px] tracking-[0.14em] text-smoke">
              {s.k}
            </span>
            <span className="text-right text-graphite">{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
