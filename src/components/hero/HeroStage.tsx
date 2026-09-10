"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { useReducedMotion, useWebGL } from "@/lib/motion";

// Three.js is pulled in only once we know the scene will actually run, so it
// never lands in the shared bundle or on a reduced-motion reader's device.
const FabricCanvas = dynamic(() => import("./FabricCanvas"), { ssr: false });

/**
 * The home hero. Three depth planes move at different rates as the page
 * scrolls: the cloth behind, a grain veil over it, and the type in front.
 *
 * The photograph is always rendered underneath. If WebGL is missing or the
 * reader prefers reduced motion, that still frame is simply what you get —
 * nothing is hidden behind an effect that may not run.
 */
export default function HeroStage({
  src,
  alt,
  children,
}: {
  src: string;
  alt: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const hasWebGL = useWebGL();
  const canRender3d = hasWebGL && !reduced;
  const sectionRef = useRef<HTMLElement>(null);

  // Parallax: one scroll read per frame, written out as custom properties.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || reduced) return;

    let frame = 0;
    const apply = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
      el.style.setProperty("--p-veil", `${(progress * 42).toFixed(1)}px`);
      el.style.setProperty("--p-type", `${(progress * 96).toFixed(1)}px`);
      el.style.setProperty("--p-fade", (1 - progress * 0.75).toFixed(3));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced]);

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

      {/* plane 1b — the cloth, when it can run */}
      {canRender3d && <FabricCanvas src={src} />}

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
