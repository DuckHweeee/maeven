"use client";

import Image from "next/image";
import { useRef } from "react";
import HeroVideo from "./HeroVideo";
import GridLines from "@/components/motion/GridLines";
import UnderlineLink from "@/components/home/UnderlineLink";
import Wordmark from "@/components/home/Wordmark";
import {
  DUR,
  EASE_OUT,
  EASE_SNAP,
  MOTION_OK,
  PIN_OK,
  ScrollTrigger,
  SplitText,
  gsap,
  useGSAP,
} from "@/lib/gsap";
import { setHeaderOverHero } from "@/lib/scroll";
import { useMounted, useReducedMotion } from "@/lib/motion";

const DESKTOP = "(min-width: 768px)";
/** Font loading never holds the intro for longer than this. */
const FONT_WAIT_MS = 900;
/** `wdth` samples for the wordmark's width curve (Archivo is piecewise linear). */
const WDTH_FROM = 125;
const WDTH_TO = 75;
const SAMPLES = Array.from({ length: 11 }, (_, i) => WDTH_TO + i * 5);

/** px insets that clip `outer` down to `cell`, as an `inset()` string. */
function insetTo(outer: Element, cell: Element) {
  const o = outer.getBoundingClientRect();
  const c = cell.getBoundingClientRect();
  return `inset(${c.top - o.top}px ${o.right - c.right}px ${o.bottom - c.bottom}px ${c.left - o.left}px)`;
}

/**
 * Home hero — "Khung đóng lại" (the frame closes).
 *
 * Load (~1.3s, one timeline): the picture wipes down from the top edge, the
 * title rises line by line behind a mask, the wordmark lifts, and the mono
 * labels type out character by character.
 *
 * Scroll, desktop only (PIN_OK: ≥768px wide, ≥700px tall): the section pins
 * for 70vh while the full-bleed picture clips down to the 8-column cell on the
 * right of the grid, the column hairlines draw in, and the wordmark's `wdth` axis compresses 125 → 75 — narrower and
 * taller, still exactly the width of the grid (a uniform scale, re-measured on
 * refresh, compensates the width change). Mobile keeps the full-bleed frame and
 * only scrubs the wordmark; nothing pins under 768px wide or 700px tall.
 *
 * Reduced motion: no timeline, no pin. On desktop the frame is set straight to
 * its closed, 8-column state; the wordmark renders at wdth 75 from CSS.
 *
 * The header sits transparent over the hero (`setHeaderOverHero`) while the
 * hero is at rest under it: through the pin on desktop, the first 24px of
 * scroll otherwise. It turns solid before the title can pass under the logo.
 */
export default function HeroStage({
  src,
  alt,
  video,
  poster,
  eyebrow,
  title,
  meta,
  cta,
}: {
  src: string;
  alt: string;
  /** Optional moving plane under the still photograph. */
  video?: boolean;
  poster?: string;
  /** Mono label above the title, e.g. "SS26 — Hoạ sắc chiều tà". */
  eyebrow: string;
  /** The h1. */
  title: string;
  /** Mono line under the title, e.g. "Làm tại …". */
  meta: string;
  cta: { href: string; label: string };
}) {
  const reduced = useReducedMotion();
  const mounted = useMounted();
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;
      const q = gsap.utils.selector(section);
      const frame = q("[data-frame]")[0] as HTMLElement;
      const media = q("[data-media]")[0] as HTMLElement;
      const veil = q("[data-veil]")[0] as HTMLElement;
      const cell = q("[data-cell]")[0] as HTMLElement;
      const h1 = q("h1")[0] as HTMLElement;
      const typed = q("[data-type]") as HTMLElement[];
      const ctaEl = q("[data-cta]")[0] as HTMLElement;
      const markLift = q("[data-mark-lift]")[0] as HTMLElement;
      const mark = q("[data-wordmark]")[0] as HTMLElement;
      const lines = q("[data-grid-line]");

      // ---- header over hero: every mode. Created first, refreshed after the
      // pin below (refreshPriority), so its end can read the pin's length.
      let pinST: ScrollTrigger | undefined;
      // Numeric start: a trigger on the pinned section itself would have its
      // start pushed by the pin. The hero is the first thing on the page.
      const headerST = ScrollTrigger.create({
        start: 0,
        // Over the hero only while its type is not under the bar: until the
        // pin releases on desktop, or the first 24px of scroll otherwise.
        // Past that the hero's title would pass under a transparent logo.
        end: () => (pinST ? pinST.end : 0) + 24,
        refreshPriority: -1,
        // Explicit edges rather than onToggle: at scroll 0 a trigger starting
        // at 0 is not "active", so a jump straight past the end would never
        // toggle. Scrolling back to the top re-enters (onLeaveBack).
        onEnter: () => setHeaderOverHero(true),
        onEnterBack: () => setHeaderOverHero(true),
        onLeaveBack: () => setHeaderOverHero(true),
        onLeave: () => setHeaderOverHero(false),
        onRefresh: (st) => setHeaderOverHero(st.scroll() < st.end),
      });
      setHeaderOverHero(window.scrollY < 24);

      const mm = gsap.matchMedia();

      // ---- wordmark width curve: measured, not assumed.
      let curve: number[] = [];
      const measure = () => {
        const prev = mark.style.cssText;
        mark.style.transform = "none";
        const box = mark.parentElement!.clientWidth;
        curve = SAMPLES.map((w) => {
          mark.style.fontStretch = `${w}%`;
          return box / mark.offsetWidth;
        });
        mark.style.cssText = prev;
      };
      /** Writes wdth + the scale that keeps the word at full container width. */
      const applyWdth = (w: number) => {
        const t = (w - WDTH_TO) / 5;
        const i = Math.min(SAMPLES.length - 2, Math.max(0, Math.floor(t)));
        const s = gsap.utils.interpolate(curve[i], curve[i + 1], t - i);
        mark.style.fontStretch = `${w}%`;
        mark.style.transform = `scale(${s})`;
      };

      // ---- desktop, reduced motion: show the closed frame, no movement.
      mm.add(`${DESKTOP} and (prefers-reduced-motion: reduce)`, () => {
        const close = () => gsap.set(frame, { clipPath: insetTo(frame, cell) });
        close();
        ScrollTrigger.addEventListener("refresh", close);
        return () => ScrollTrigger.removeEventListener("refresh", close);
      });

      // `pin`, not just width: on a short desktop window (under 700px tall) a
      // pinned hero clips its own wordmark, so it scrolls like mobile instead.
      mm.add({ ok: MOTION_OK, pin: PIN_OK }, (ctx) => {
        const { ok, pin } = ctx.conditions as { ok: boolean; pin: boolean };
        if (!ok) return;

        // ---- scroll: wordmark wdth on both layouts, frame + pin on desktop.
        const wdth = { w: WDTH_FROM };
        const draw = () => applyWdth(wdth.w);
        measure();
        draw();

        const scrub = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: pin ? "+=70%" : "bottom top",
            pin,
            scrub: true,
            invalidateOnRefresh: true,
            onRefresh: () => {
              measure();
              draw();
            },
          },
        });
        scrub.to(wdth, { w: WDTH_TO, duration: 1, onUpdate: draw }, 0);
        if (pin) {
          pinST = scrub.scrollTrigger;
          scrub
            .fromTo(
              frame,
              { clipPath: "inset(0px 0px 0px 0px)" },
              { clipPath: () => insetTo(frame, cell), duration: 1 },
              0,
            )
            .to(veil, { opacity: 0.35, duration: 1 }, 0)
            .fromTo(
              lines,
              { scaleY: 0 },
              { scaleY: 1, stagger: { each: 0.03, from: "end" }, duration: 0.5 },
              0.1,
            );
        }
        headerST.refresh();

        // ---- load: from-states set now, before the first paint after hydration.
        // The h1 and the CTA fade with opacity only, never autoAlpha: hidden
        // by `visibility` they would drop out of the accessibility tree and
        // the tab order for the length of the intro. The typed labels are
        // aria-hidden copies (the sr-only text beside them is what is read).
        gsap.set(media, { clipPath: "inset(0% 0% 100% 0%)" });
        gsap.set([h1, ctaEl], { opacity: 0 });
        gsap.set(typed, { autoAlpha: 0 });
        gsap.set(markLift, { yPercent: 105 });

        let cancelled = false;
        let introTl: gsap.core.Timeline | undefined;
        // Tabbing into the hero mid-intro lands on a link that is still
        // transparent: finish the intro at once instead.
        const finishIntro = () =>
          introTl ? introTl.progress(1) : gsap.set([h1, ctaEl], { opacity: 1 });
        section.addEventListener("focusin", finishIntro);
        const intro = () => {
          if (cancelled) return;
          ctx.add(() => {
            const titleSplit = SplitText.create(h1, {
              type: "lines",
              mask: "lines",
              linesClass: "sr-line",
              aria: "auto",
            });
            const typeSplit = SplitText.create(typed, { type: "words,chars", aria: "none" });
            gsap.set(h1, { opacity: 1 });

            introTl = gsap
              .timeline({
                defaults: { ease: EASE_SNAP },
                onComplete: () => {
                  // Plain text again, so the title reflows freely on resize.
                  titleSplit.revert();
                  typeSplit.revert();
                },
              })
              .to(media, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, clearProps: "clipPath" }, 0)
              .from(titleSplit.lines, { yPercent: 100, duration: 0.8, stagger: 0.09 }, 0.3)
              .to(markLift, { yPercent: 0, duration: 0.9, ease: EASE_OUT }, 0.45)
              .set(typed, { autoAlpha: 1 }, 0.6)
              .from(
                typeSplit.chars,
                { autoAlpha: 0, duration: 0.01, stagger: 0.014, ease: "none" },
                0.6,
              )
              .to(ctaEl, { opacity: 1, duration: DUR, ease: EASE_OUT }, 1.0);
          });
        };
        Promise.race([
          document.fonts?.ready ?? Promise.resolve(),
          new Promise((r) => setTimeout(r, FONT_WAIT_MS)),
        ]).then(intro);

        return () => {
          cancelled = true;
          section.removeEventListener("focusin", finishIntro);
          pinST = undefined;
          mark.style.fontStretch = "";
          mark.style.transform = "";
        };
      });

      return () => {
        mm.revert();
        headerST.kill();
        setHeaderOverHero(false);
      };
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      className="relative -mt-(--header-h) h-svh min-h-[560px] overflow-hidden bg-ink-90 text-paper md:min-h-[min(640px,100svh)]"
    >
      {/* The frame: full-bleed, clipped to the 8-column cell on scroll. */}
      <div data-frame className="absolute inset-0">
        {/* The picture: wiped in on load. */}
        <div data-media className="absolute inset-0">
          <Image src={src} alt={alt} fill priority sizes="100vw" className="object-cover opacity-70" />
          {/* Gated on `mounted` as well as `reduced`: the server cannot know the
              preference, and a reduced-motion reader must never start decoding
              the video. See HeroVideo for the rest. */}
          {video && mounted && !reduced && <HeroVideo poster={poster ?? src} />}
          <div
            data-veil
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-90/90 via-ink-90/35 to-ink-90/45"
          />
        </div>
      </div>

      <GridLines tone="image" />

      <div className="relative grid-12 h-full grid-rows-[minmax(0,1fr)_auto] pt-[calc(var(--header-h)+1.5rem)] pb-4 md:pb-6">
        {/* Target of the closing frame. Empty and invisible. */}
        <div data-cell aria-hidden className="col-span-12 col-start-1 row-start-1 mb-6 md:col-span-8 md:col-start-5" />

        <div className="col-span-12 col-start-1 row-start-1 flex flex-col justify-end gap-6 pb-6 md:col-span-4 md:justify-between">
          <p className="m-0 font-mono text-label text-chalk uppercase">
            <span className="sr-only">{eyebrow}</span>
            <span data-type aria-hidden>
              {eyebrow}
            </span>
          </p>

          <div>
            <h1
              id="hero-title"
              className="split-reveal m-0 text-[clamp(3.25rem,1rem+6.6vw,7.5rem)] leading-[0.92] font-bold tracking-[-0.035em] [font-stretch:75%] text-balance"
            >
              {title}
            </h1>
            <div className="mt-6 flex flex-col items-start gap-4 md:mt-8">
              <p className="m-0 font-mono text-label text-chalk uppercase">
                <span className="sr-only">{meta}</span>
                <span data-type aria-hidden>
                  {meta}
                </span>
              </p>
              <span data-cta>
                <UnderlineLink href={cta.href} className="text-paper">
                  {cta.label}
                </UnderlineLink>
              </span>
            </div>
          </div>
        </div>

        <div className="col-span-12 col-start-1 row-start-2 overflow-clip">
          <div data-mark-lift>
            <Wordmark stretch={75} />
          </div>
        </div>
      </div>
    </section>
  );
}
