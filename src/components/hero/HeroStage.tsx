"use client";

import Image from "next/image";
import { useRef } from "react";
import HeroVideo from "./HeroVideo";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap, useGSAP } from "@/lib/gsap";
import { useMounted, useReducedMotion } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

/**
 * The home hero. Three depth planes move at different rates as the page
 * scrolls: the cloth behind, a grain veil over it, and the type in front.
 *
 * The rearmost plane is a silent video loop of the cloth, over a still
 * photograph that is always rendered underneath. If the reader prefers reduced
 * motion the video is never mounted and that still frame is simply what you get
 * — nothing is hidden behind an effect that may not run.
 */
export default function HeroStage({
  src,
  alt,
  video,
  poster,
  children,
}: {
  src: string;
  alt: string;
  /** Optional moving plane. Omitted on routes that want the still hero. */
  video?: boolean;
  poster?: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const mounted = useMounted();
  const sectionRef = useRef<HTMLElement>(null);

  // Parallax: three depth planes driven straight off scroll position.
  //
  // Was a scroll listener throttled through its own requestAnimationFrame.
  // ScrollTrigger already runs one batched handler for every scrubbed animation
  // on the page, so this joins that instead of adding a second scroll reader —
  // and `invalidateOnRefresh` re-measures on resize, which the old version had
  // to wire up by hand.
  useGSAP(
    () => {
      const el = sectionRef.current;
      if (!el || reduced) return;

      gsap.fromTo(
        el,
        { "--p-veil": "0px", "--p-type": "0px", "--p-fade": 1 },
        {
          "--p-veil": "42px",
          "--p-type": "96px",
          "--p-fade": 0.25,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
    },
    { dependencies: [reduced] },
  );

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[min(88vh,760px)] flex-col justify-end overflow-hidden bg-ink-90 text-paper"
    >
      {/* plane 1 — the photograph, and the fallback */}
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-70"
      />

      {/* plane 1b — the cloth in motion, when the reader wants motion.

          Gated on `mounted` as well as `reduced`, because `useReducedMotion`
          reports false on the server: without it the prerendered HTML carries an
          autoplaying <video> that a reduced-motion reader starts decoding and
          React then unmounts, and a reader without JavaScript is left with a
          three-megabyte download behind an element that never fades in. After
          mount the preference is known and this is simply right. */}
      {video && mounted && !reduced && <HeroVideo poster={poster ?? src} />}

      {/* plane 2 — grain veil, drifts slowly */}
      <div
        aria-hidden
        className="weave pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay will-change-transform"
        style={{ transform: "translate3d(0, var(--p-veil, 0px), 0)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-90 via-ink-90/45 to-ink-90/10"
      />

      {/* plane 3 — type, travels furthest */}
      <div
        className="relative will-change-transform"
        style={{
          transform: "translate3d(0, calc(var(--p-type, 0px) * -1), 0)",
          opacity: "var(--p-fade, 1)",
        }}
      >
        {children}
      </div>
    </section>
  );
}
