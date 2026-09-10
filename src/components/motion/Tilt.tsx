"use client";

import { useEffect, useRef } from "react";
import { clamp, lerp, usePointerEffects } from "@/lib/motion";

const MAX_DEG = 7;

/**
 * Pointer-tracked 3D tilt that surfaces the fabric grain underneath the photo.
 *
 * The weave layer sits *below* the image; as the card tilts, the image lightens
 * and a masked weave overlay rises on the leading edge, so the card reads as a
 * piece of cloth catching light rather than a rectangle rotating.
 *
 * All per-frame work writes CSS custom properties straight to the DOM inside one
 * rAF — never React state, which would re-render the tree on every pointer move.
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

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    // Target values written by pointer events; current values eased toward them.
    const target = { x: 0, y: 0, px: 50, py: 50, mag: 0 };
    const now = { x: 0, y: 0, px: 50, py: 50, mag: 0 };
    let frame = 0;
    let running = false;

    const tick = () => {
      now.x = lerp(now.x, target.x, 0.14);
      now.y = lerp(now.y, target.y, 0.14);
      now.px = lerp(now.px, target.px, 0.14);
      now.py = lerp(now.py, target.py, 0.14);
      now.mag = lerp(now.mag, target.mag, 0.14);

      el.style.setProperty("--tx", `${now.x.toFixed(3)}deg`);
      el.style.setProperty("--ty", `${now.y.toFixed(3)}deg`);
      el.style.setProperty("--px", `${now.px.toFixed(2)}%`);
      el.style.setProperty("--py", `${now.py.toFixed(2)}%`);
      el.style.setProperty("--mag", now.mag.toFixed(3));

      const settled =
        Math.abs(now.x - target.x) < 0.01 &&
        Math.abs(now.y - target.y) < 0.01 &&
        Math.abs(now.mag - target.mag) < 0.002;

      if (settled) {
        running = false;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
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

      target.y = (nx - 0.5) * 2 * MAX_DEG;
      target.x = -(ny - 0.5) * 2 * MAX_DEG;
      target.px = nx * 100;
      target.py = ny * 100;
      target.mag = Math.min(1, Math.hypot(nx - 0.5, ny - 0.5) * 2.2);
      start();
    };

    const onLeave = () => {
      rect = null;
      target.x = 0;
      target.y = 0;
      target.px = 50;
      target.py = 50;
      target.mag = 0;
      el.style.willChange = "";
      start();
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.style.willChange = "";
    };
  }, [enabled]);

  return (
    <div ref={ref} className={`[perspective:1000px] ${className}`}>
      <div
        className="relative transition-transform duration-300 ease-out [transform:rotateX(var(--tx,0deg))_rotateY(var(--ty,0deg))_translateZ(0)] [transform-style:preserve-3d]"
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
