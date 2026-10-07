import Link from "next/link";
import Photo from "@/components/Photo";
import type { Product } from "@/lib/data";

/**
 * Flat product card: 4:5 frame, mono number, name, price, material.
 *
 * Hover / keyboard focus:
 * - the photograph scales to 1.03 inside its frame (motion-safe only),
 * - the price rolls up one line, like a mechanical counter,
 * - an ink rule draws across the top of the caption (scaleX from the left).
 *
 * Pure CSS on purpose: three transform transitions need no JavaScript, no
 * client bundle, and work before hydration. Reduced motion drops the
 * transitions, so the rule simply appears. Nothing transforms the card root,
 * because the home slider owns the transform on its own wrapper. The grid mode
 * of `src/app/product/ProductIndex.tsx` uses the same language.
 *
 * Transitions use expo.out as a CSS curve, the same as EASE_OUT in `@/lib/gsap`.
 */
export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.sku}`} className="group block">
      <Photo
        src={product.gallery[0].src}
        alt={product.gallery[0].alt}
        ratio="4 / 5"
        sizes="(max-width: 640px) 75vw, (max-width: 1024px) 50vw, 320px"
        className="[&>img]:transition-transform [&>img]:duration-700 [&>img]:ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-hover:[&>img]:scale-[1.03] motion-safe:group-focus-visible:[&>img]:scale-[1.03]"
      />

      <div className="@container relative mt-3 pt-2.5">
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-line" />
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-ink transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
        />
        {/* Number · name · price on one line when the card has room; on a
            narrow card (under 18rem) the price drops below the name instead
            of squeezing it to a word per line. */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 @[18rem]:grid-cols-[auto_minmax(0,1fr)_auto]">
          <span className="font-mono text-label tracking-normal text-smoke tabular-nums">
            {product.no}
          </span>
          <span className="text-[15px] leading-snug">{product.name}</span>
          {/* The price rolls: an identical copy slides up into the same one-line mask. */}
          <span className="relative col-start-2 mt-1 justify-self-start overflow-clip font-mono text-[12.5px] leading-[1.4] tabular-nums @[18rem]:col-start-3 @[18rem]:row-start-1 @[18rem]:mt-0">
            <span className="block transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full group-focus-visible:-translate-y-full motion-reduce:transition-none">
              {product.price}
            </span>
            <span
              aria-hidden
              className="absolute inset-x-0 top-full block transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full group-focus-visible:-translate-y-full motion-reduce:transition-none"
            >
              {product.price}
            </span>
          </span>
        </div>
        <div className="mt-1 font-mono text-label tracking-normal text-smoke">
          {product.material}
        </div>
      </div>
    </Link>
  );
}
