"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { clamp, usePointerEffects } from "@/lib/motion";

const MAX_DEG = 7;

/**
 * Pointer-tracked 3D tilt that surfaces the fabric grain underneath the photo.
 *
 * The weave layer sits *below* the image; as the card tilts, the image lightens
 * and a masked weave overlay rises on the leading edge, so the card reads as a
 * piece of cloth catching light rather than a rectangle rotating.
 *
 * Five values are eased toward the pointer with `gsap.quickTo`, which retargets
 * one long-lived tween per value instead of creating a new one on every
 * pointermove — that is the whole reason it exists, and it replaces the hand
 * written requestAnimationFrame lerp this used to run.
 *
 * Only the `x` tween carries `onUpdate`. All five share a duration and ease and
 * are retargeted together, so they advance in lockstep and one callback is
 * enough to write the whole set.
 *
 * `usePointerEffects` stays rather than `gsap.matchMedia`: it decides whether to
 * attach pointer listeners at all, which is a React concern, not an animation
 * one.
 */
export default function Tilt({
  children,
  className = "",
  fabric = true,
}: {
  children: React.ReactNode;
  className?: string;
  fabric?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { enabled } = usePointerEffects();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !enabled) return;

      const now = { x: 0, y: 0, px: 50, py: 50, mag: 0 };

      const write = () => {
        el.style.setProperty("--tx", `${now.x.toFixed(3)}deg`);
        el.style.setProperty("--ty", `${now.y.toFixed(3)}deg`);
        el.style.setProperty("--px", `${now.px.toFixed(2)}%`);
        el.style.setProperty("--py", `${now.py.toFixed(2)}%`);
        el.style.setProperty("--mag", now.mag.toFixed(3));
      };

      const opts = { duration: 0.5, ease: "power3.out" };
      const to = {
        x: gsap.quickTo(now, "x", { ...opts, onUpdate: write }),
        y: gsap.quickTo(now, "y", opts),
        px: gsap.quickTo(now, "px", opts),
        py: gsap.quickTo(now, "py", opts),
        mag: gsap.quickTo(now, "mag", opts),
      };

      // Rect is cached per interaction rather than read every frame, so the
      // pointer handler never forces a synchronous reflow.
      let rect: DOMRect | null = null;

      const onEnter = () => {
        rect = el.getBoundingClientRect();
        el.style.willChange = "transform";
      };

      const onMove = (e: PointerEvent) => {
        if (!rect) rect = el.getBoundingClientRect();
        const nx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        const ny = clamp((e.clientY - rect.top) / rect.height, 0, 1);

        to.y((nx - 0.5) * 2 * MAX_DEG);
        to.x(-(ny - 0.5) * 2 * MAX_DEG);
        to.px(nx * 100);
        to.py(ny * 100);
        to.mag(Math.min(1, Math.hypot(nx - 0.5, ny - 0.5) * 2.2));
      };

      const onLeave = () => {
        rect = null;
        to.x(0);
        to.y(0);
        to.px(50);
        to.py(50);
        to.mag(0);
        el.style.willChange = "";
      };

      el.addEventListener("pointerenter", onEnter);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);

      return () => {
        el.removeEventListener("pointerenter", onEnter);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
        el.style.willChange = "";
      };
    },
    { scope: ref, dependencies: [enabled] },
  );

  return (
    <div ref={ref} className={`[perspective:1000px] ${className}`}>
      <div
        className="relative transition-transform duration-300 ease-out [transform:rotateX(var(--tx,0deg))_rotateY(var(--ty,0deg))_translateZ(0)] [transform-style:preserve-3d]"
        // GSAP already eases these values; leaving the CSS transition on would
        // smooth an already-smoothed number and lag the pointer.
        style={{ transitionDuration: enabled ? "0ms" : undefined }}
      >
        {fabric && (
          <>
            {/* Weave sits beneath the photograph and shows through as it tilts. */}
            <span
              aria-hidden
              className="weave pointer-events-none absolute inset-0 z-1 opacity-[calc(var(--mag,0)*0.5)] mix-blend-multiply"
              style={{
                maskImage:
                  "radial-gradient(120% 120% at var(--px,50%) var(--py,50%), #000 0%, transparent 72%)",
                WebkitMaskImage:
                  "radial-gradient(120% 120% at var(--px,50%) var(--py,50%), #000 0%, transparent 72%)",
              }}
            />
            {/* Light catching the raised side of the cloth. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-2 opacity-[calc(var(--mag,0)*0.55)]"
              style={{
                background:
                  "radial-gradient(60% 60% at var(--px,50%) var(--py,50%), rgba(255,255,255,0.34), transparent 70%)",
              }}
            />
          </>
        )}
        {children}
      </div>
    </div>
  );
}
