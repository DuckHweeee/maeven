"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * The hero's moving plane: a silent loop of the cloth, shot close.
 *
 * It replaces the WebGL cloth simulation. The simulation was a cloth we drew;
 * this is the cloth itself — the same three-second read, with the weave, the
 * hand of the fabric and the label all actually in frame.
 *
 * Decorative by construction: `aria-hidden`, and the photograph underneath it in
 * HeroStage keeps the alt text. Nothing here carries meaning a reader would
 * miss if the file never loads.
 *
 * Three things this has to get right, in order of how badly they bite:
 *
 * 1. **Muted.** Not a preference — an unmuted video is refused autoplay by every
 *    browser, so the attribute is what makes it play at all. The source track
 *    does carry audio; `muted` is set as a property in `onCanPlay` as well as an
 *    attribute, because React has historically dropped the attribute on
 *    hydration and Safari then blocks the play() call.
 * 2. **Paused off-screen.** A looping video decodes frames whether or not it is
 *    on screen. The hero is the top of a long page, so without this it keeps a
 *    core warm for the entire read.
 * 3. **Never covers the fallback until it is actually playing.** It fades up on
 *    `playing`, so a failed load, a blocked autoplay or a slow connection all
 *    resolve to the still photograph rather than to a black rectangle.
 */
export default function HeroVideo({ poster }: { poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      // Pause while the hero is off screen. rootMargin gives it a screen of
      // warning so scrolling back up finds it already running.
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) void el.play().catch(() => {});
          else el.pause();
        },
        { rootMargin: "100% 0px" },
      );
      io.observe(el);

      return () => io.disconnect();
    },
    { scope: ref },
  );

  // Separate from the observer effect so it re-runs on the state change rather
  // than tearing down and rebuilding the observer.
  useGSAP(
    () => {
      if (!playing || !ref.current) return;
      gsap.to(ref.current, { opacity: 0.62, duration: 1.2, ease: "power2.out" });
    },
    { dependencies: [playing] },
  );

  return (
    <video
      ref={ref}
      aria-hidden
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      poster={poster}
      onCanPlay={(e) => {
        // Belt and braces: see note 1 above.
        e.currentTarget.muted = true;
        void e.currentTarget.play().catch(() => {});
      }}
      onPlaying={() => setPlaying(true)}
      className="absolute inset-0 h-full w-full object-cover opacity-0"
    >
      <source src="/img/home/hero.mp4" type="video/mp4" />
    </video>
  );
}
