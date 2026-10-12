"use client";

import { useRef, useState } from "react";
import Counter from "@/components/motion/Counter";
import ImageReveal from "@/components/motion/ImageReveal";
import SplitReveal from "@/components/motion/SplitReveal";
import { MOTION_OK, PIN_OK, gsap, useGSAP } from "@/lib/gsap";
import { headerOffset } from "@/lib/scroll";
import { Folio } from "./SectionHead";
import UnderlineLink from "./UnderlineLink";

type LookLite = { id: string; src: string; alt: string; note: string };

const pad = (i: number) => String(i + 1).padStart(2, "0");

/**
 * Lookbook rail — the second of the site's three signature moments.
 *
 * Desktop + motion (PIN_OK: ≥768px wide and ≥700px tall): the section pins
 * under the header and the four looks slide
 * left on the grid, 1:1 with scroll, snapping to four evenly spaced stops. A mono
 * drum counter (`01 / 04`) rolls at each stop, and a
 * hairline under the heading fills with scaleX as the progress bar.
 *
 * Without the pin the same markup lays out three other ways, all in CSS:
 * - under 768px: stacked, alternating 10-column frames (left / right),
 * - desktop + reduced motion, or a screen under 700px tall (`md-still:`):
 *   four columns, all visible, no counter,
 * - desktop + motion but no JS (`pinned:`): a native horizontal scroller.
 *
 * Big and small looks alternate (0.8 and 0.56 of the band height), bottoms on
 * one baseline, so the row reads as a contact sheet cut with intent rather
 * than a carousel of equal tiles.
 */
export default function CampaignRail({
  n,
  season,
  title,
  looks,
  cta,
}: {
  n: number;
  season: string;
  title: string;
  looks: LookLite[];
  cta: { href: string; label: string };
}) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useGSAP(
    () => {
      const section = ref.current;
      if (!section) return;
      const q = gsap.utils.selector(section);
      const viewport = q("[data-viewport]")[0] as HTMLElement;
      const track = q("[data-track]")[0] as HTMLElement;
      const fill = q("[data-progress]")[0] as HTMLElement;
      const items = q("[data-look]") as HTMLElement[];
      const mm = gsap.matchMedia();

      mm.add(`${MOTION_OK} and ${PIN_OK}`, () => {
        gsap.set(viewport, { overflow: "hidden" });

        const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
        // One stop per look, evenly spaced along the travel: every number on
        // the counter is reachable, whatever the looks' widths.
        const step = 1 / Math.max(1, items.length - 1);
        const indexAt = (p: number) => Math.round(p / step);

        const tl = gsap.timeline({
          defaults: { ease: "none", duration: 1 },
          scrollTrigger: {
            trigger: section,
            start: () => `top ${headerOffset()}px`,
            end: () => `+=${distance()}`,
            pin: true,
            scrub: true,
            invalidateOnRefresh: true,
            snap: {
              snapTo: step,
              // Nearest stop, no velocity projection: one flick must not skip a
              // look, and a stop just passed must not send it to the next one.
              inertia: false,
              directional: false,
              duration: { min: 0.25, max: 0.6 },
              delay: 0.12,
              ease: "power3.inOut",
            },
            onUpdate: (st) => {
              const i = indexAt(st.progress);
              if (i !== activeRef.current) {
                activeRef.current = i;
                setActive(i);
              }
            },
          },
        });
        tl.to(track, { x: () => -distance() }, 0).fromTo(fill, { scaleX: 0 }, { scaleX: 1 }, 0);

        return () => {
          activeRef.current = 0;
          setActive(0);
        };
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      aria-labelledby="campaign-title"
      className="relative flex flex-col bg-paper py-14 [--look-h:max(14rem,calc(100svh-var(--header-h)-16rem))] md-still:py-20 pinned:h-[calc(100svh-var(--header-h))] pinned:py-0"
    >
      <header className="grid-12 gap-y-5 md:pt-8">
        <Folio n={n} className="col-span-12 text-smoke md:col-span-3">
          Sổ mẫu {season}
        </Folio>
        <SplitReveal
          as="h2"
          id="campaign-title"
          className="col-span-12 m-0 text-headline font-bold [font-stretch:75%] text-balance md:col-span-6"
        >
          {title}
        </SplitReveal>
        <div className="col-span-12 hidden justify-self-end md:col-span-3 pinned:block">
          <Counter
            value={active + 1}
            total={looks.length}
            className="text-[clamp(2.5rem,1rem+3vw,4.5rem)] tracking-[-0.04em]"
          />
        </div>
        <div className="col-span-12 md:col-span-6 md:col-start-4">
          <UnderlineLink href={cta.href} className="text-slate">
            {cta.label}
          </UnderlineLink>
        </div>
        {/* Progress: a hairline track, an ink fill scaled by the pin. */}
        <div aria-hidden className="relative col-span-12 mt-2 hidden h-px bg-line pinned:block">
          <div data-progress className="absolute inset-0 origin-left bg-ink" />
        </div>
      </header>

      <div data-viewport className="mt-10 pinned:mt-auto pinned:overflow-x-auto pinned:pb-8">
        <ol
          data-track
          className="mx-auto m-0 grid max-w-[1280px] list-none grid-cols-12 gap-x-(--grid-gutter) gap-y-12 px-4 sm:px-6 pinned:flex pinned:w-max pinned:max-w-none pinned:items-end pinned:gap-x-[8vw] pinned:px-[max(1.5rem,calc((100vw-1280px)/2+1.5rem))]"
        >
          {looks.map((look, i) => {
            const big = i % 2 === 0;
            return (
              <li
                key={look.id}
                data-look
                className={`col-span-10 md:col-span-3 md:col-start-auto pinned:flex-none ${
                  big
                    ? "pinned:w-[calc(var(--look-h)*0.8)]"
                    : "col-start-3 md-still:pt-20 pinned:w-[calc(var(--look-h)*0.56)]"
                }`}
              >
                <ImageReveal
                  src={look.src}
                  alt={look.alt}
                  ratio="4 / 5"
                  from="bottom"
                  sizes="(max-width: 767px) 84vw, 40vw"
                />
                <p className="m-0 mt-3 flex items-baseline gap-3 border-t border-line pt-2.5">
                  <span className="font-mono text-label text-smoke tabular-nums">{pad(i)}</span>
                  <span className="text-[0.875rem] leading-[1.5] text-slate">{look.note}</span>
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
