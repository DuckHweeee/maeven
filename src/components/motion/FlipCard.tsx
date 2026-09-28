"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Photo from "@/components/Photo";
import { EASE_IN_OUT, gsap, useGSAP } from "@/lib/gsap";
import { usePointerEffects } from "@/lib/motion";
import type { Product } from "@/lib/data";

/**
 * Product card that turns over like a lookbook page: front is the garment, back
 * is the workshop that wove the cloth.
 *
 * Hover flips it for pointer users; the always-present button handles touch and
 * keyboard. The hidden face is `inert` so it never takes focus or reaches a
 * screen reader, which is what makes a flip card safe rather than a focus trap.
 *
 * React owns `flipped` because the accessibility state — which face is inert,
 * what the button says — has to be declarative. GSAP owns only the transform.
 *
 * A plain CSS transition already reverses from the current angle, so that is not
 * what GSAP is for here. What it adds is the two things layered on the turn: a
 * scale dip running in parallel on its own easing curve, and the back-face copy
 * staggering in at a delay expressed as a fraction of the turn, so the two stay
 * in step if the duration is ever changed.
 */
export default function FlipCard({ product }: { product: Product }) {
  const [flipped, setFlipped] = useState(false);
  const { enabled: hoverable, reduced } = usePointerEffects();
  const scope = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  const show = (v: boolean) => hoverable && setFlipped(v);

  useGSAP(
    () => {
      const duration = reduced ? 0 : 0.8;

      gsap.to(inner.current, {
        rotationY: flipped ? 180 : 0,
        duration,
        ease: EASE_IN_OUT,
        overwrite: "auto",
      });

      // A page lifts off the stack before it lands. Runs alongside the turn, so
      // the dip tracks the rotation rather than queueing behind it.
      if (!reduced) {
        gsap.to(inner.current, {
          keyframes: { scale: [1, 0.965, 1] },
          duration,
          ease: "sine.inOut",
          overwrite: "auto",
        });
      }

      // Back-face copy arrives once the turn is past halfway and the face is
      // actually pointing at the reader.
      if (flipped && !reduced) {
        gsap.fromTo(
          "[data-back-item]",
          { autoAlpha: 0, y: 10 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.07,
            delay: duration * 0.55,
            overwrite: "auto",
          },
        );
      } else {
        // Turning back can interrupt the stagger mid-flight. Clear it, or the
        // copy is stranded half-faded the next time this face comes round.
        gsap.set("[data-back-item]", { clearProps: "opacity,visibility,y" });
      }
    },
    { scope, dependencies: [flipped, reduced] },
  );

  return (
    <div
      ref={scope}
      className="[perspective:1400px]"
      onMouseEnter={() => show(true)}
      onMouseLeave={() => show(false)}
    >
      <div ref={inner} className="relative grid [transform-style:preserve-3d]">
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
          <div
            data-back
            className="weave flex h-full flex-col justify-between bg-ink p-5 text-paper"
          >
            <div>
              <div data-back-item className="mono-label text-[10px] tracking-[0.16em] text-mint">
                {product.maker.place}
              </div>
              <h3 data-back-item className="mt-2 font-display text-[22px] leading-[1.15] font-bold tracking-[-0.02em]">
                {product.maker.workshop}
              </h3>
              <p data-back-item className="mt-3 text-[13.5px] leading-[1.65] text-chalk">
                {product.maker.story}
              </p>
            </div>
            <Link
              data-back-item
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
