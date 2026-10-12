"use client";

import { useRef } from "react";
import { MOTION_OK, PIN_OK, ScrollTrigger, gsap, useGSAP } from "@/lib/gsap";
import { headerOffset } from "@/lib/scroll";

/** Room kept between the fixed header / viewport edge and the pinned panel. */
const GAP = 24;

/**
 * Gallery (7 columns) beside the BuyPanel (5 columns), with the panel pinned by
 * ScrollTrigger for the length of the gallery. `position: sticky` cannot work
 * inside ScrollSmoother's transformed content, hence the pin.
 *
 * - Panel shorter than the viewport: pins at its top, just below the header.
 *   Taller: pins once its bottom reaches the viewport bottom — unless that
 *   would push the price ([data-pin-keep]) under the header; then it pins
 *   with the price just below the header and the specs under the button wait
 *   for the release.
 * - Pin length = gallery height − panel height, so the panel lets go exactly
 *   when its bottom meets the gallery's. `pinSpacing: false`: the grid row is
 *   already as tall as the gallery.
 * - Desktop (PIN_OK: ≥768px wide and ≥700px tall) with motion allowed only.
 *   Mobile stacks the panel under a swipe strip; reduced motion and short
 *   screens get the same columns, unpinned, and simply scroll.
 * - The pinned element is an inner wrapper, so the pin-spacer ScrollTrigger
 *   inserts never has to inherit grid placement.
 */
export default function ProductStage({
  gallery,
  panel,
}: {
  gallery: React.ReactNode;
  panel: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`${MOTION_OK} and ${PIN_OK}`, () => {
        const g = galleryRef.current;
        const p = panelRef.current;
        if (!g || !p) return;
        /** Screen y of the panel's top edge while pinned. */
        const pinTop = () => {
          const below = headerOffset() + GAP;
          if (p.offsetHeight + below + GAP <= window.innerHeight) return below;
          // Taller than the screen: bottom-aligned, but never so high that the
          // price ([data-pin-keep]) slides under the header — price, sizes and
          // add-to-cart stay on screen together; specs below the button may
          // wait for the pin to release.
          const keep = p.querySelector("[data-pin-keep]");
          const keepAt = keep ? keep.getBoundingClientRect().top - p.getBoundingClientRect().top : 0;
          return Math.max(window.innerHeight - GAP - p.offsetHeight, below - keepAt);
        };

        ScrollTrigger.create({
          trigger: p,
          pin: p,
          pinSpacing: false,
          start: () => `top ${pinTop()}px`,
          end: () => `+=${Math.max(0, g.offsetHeight - p.offsetHeight)}`,
          invalidateOnRefresh: true,
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="grid-12 items-start gap-y-10">
      <div ref={galleryRef} className="col-span-12 min-w-0 md:col-span-7">
        {gallery}
      </div>
      <div className="col-span-12 md:col-span-5 md:col-start-8">
        <div ref={panelRef}>{panel}</div>
      </div>
    </div>
  );
}
