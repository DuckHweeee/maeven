"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { EASE_SNAP, Flip, MOTION_OK, ScrollTrigger, gsap, useGSAP } from "@/lib/gsap";
import { usePointerEffects } from "@/lib/motion";

/** The slice of a Product this view needs — kept small so the RSC payload is too. */
export type IndexItem = {
  no: string;
  sku: string;
  name: string;
  price: string;
  material: string;
  image: { src: string; alt: string };
  workshop: string;
  place: string;
};

type View = "grid" | "index";

const VIEWS: { id: View; label: string }[] = [
  { id: "grid", label: "Lưới" },
  { id: "index", label: "Danh mục" },
];

const CLOSED = "inset(0% 0% 100% 0%)";
const OPEN = "inset(0% 0% 0% 0%)";
/** Pointer-follow runs only here: a real mouse, and motion allowed. */
const FOLLOW_OK = `${MOTION_OK} and (hover: hover) and (pointer: fine)`;
/** Opacity of the other rows' ink type while one is hovered: ink at 0.6 on
 *  paper is 4.93:1, so the dimmed names and prices stay AA. 0.3 was 2.0:1. */
const DIM = 0.6;
/** CSS expo.out, matching EASE_OUT. */
const EASE_CSS = "ease-[cubic-bezier(0.16,1,0.3,1)]";

/** Picks the class list for the current view. */
const v = (view: View, grid: string, index: string) => (view === "grid" ? grid : index);

/**
 * The shop's catalogue with a Grid ↔ Index toggle — signature moment #3.
 *
 * One set of DOM nodes serves both views; only classes change, so GSAP Flip can
 * record the mono pieces (number, material, price) before React re-renders and
 * slide them into their new columns afterwards. Names do not Flip (a scaled
 * line of type distorts): they rise through a padded mask instead. Grid frames
 * open with a clip-path wipe; index rules draw with scaleX.
 *
 * Index mode on a fine pointer: the hovered row's photograph follows the
 * cursor (`gsap.quickTo`) and the other rows' ink type (name, price) dims to
 * 0.6 — 4.9:1 on paper, still readable; the grey mono labels are not dimmed.
 * Keyboard focus shows an inline thumbnail in the row instead; on touch
 * (`hover: none`) the thumbnail is always shown and one tap opens the product.
 *
 * Reduced motion: the view switches instantly, no follower, no reveals.
 */
export default function ProductIndex({ items }: { items: IndexItem[] }) {
  const [view, setView] = useState<View>("grid");
  // fine pointer && !reduced — the same condition as FOLLOW_OK, as React state
  // so the inline-thumbnail-on-hover fallback can be switched off by class.
  const { enabled: follow } = usePointerEffects();

  const root = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const flipTl = useRef<gsap.core.Timeline | null>(null);
  const mounted = useRef(false);

  const choose = (next: View) => {
    if (next === view) return;
    const el = root.current;
    if (el && window.matchMedia(MOTION_OK).matches) {
      // Record first (mid-flip positions included), then settle any running flip.
      flipState.current = Flip.getState(el.querySelectorAll("[data-flip]"));
      flipTl.current?.progress(1).kill();
    }
    setView(next);
  };

  /* ---------------------------------------------------- first grid reveal */
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const frames = gsap.utils.toArray<HTMLElement>("[data-frame]");
        gsap.set(frames, { clipPath: CLOSED });
        ScrollTrigger.batch(frames, {
          start: "top 92%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              clipPath: OPEN,
              duration: 0.9,
              ease: EASE_SNAP,
              stagger: 0.08,
              clearProps: "clipPath",
              overwrite: "auto",
            }),
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  /* ------------------------------------------------------- the view Flip */
  useGSAP(
    () => {
      if (!mounted.current) {
        mounted.current = true;
        return;
      }
      const el = root.current;
      const state = flipState.current;
      flipState.current = null;
      if (el && state) {
        const tl = Flip.from(state, {
          targets: el.querySelectorAll("[data-flip]"),
          duration: 0.8,
          ease: EASE_SNAP,
          // Mono pieces keep their size across views; never stretch type.
          scale: false,
          stagger: 0.012,
        });
        tl.fromTo(
          el.querySelectorAll("[data-name]"),
          { yPercent: 140 },
          { yPercent: 0, duration: 0.8, ease: EASE_SNAP, stagger: 0.04, clearProps: "transform" },
          0.06,
        );
        if (view === "grid") {
          tl.fromTo(
            el.querySelectorAll("[data-frame]"),
            { clipPath: CLOSED },
            { clipPath: OPEN, duration: 0.9, ease: EASE_SNAP, stagger: 0.05, clearProps: "clipPath" },
            0.1,
          );
        } else {
          tl.fromTo(
            el.querySelectorAll("[data-row-rule]"),
            { scaleX: 0 },
            { scaleX: 1, duration: 0.8, ease: EASE_SNAP, stagger: 0.04, clearProps: "transform" },
            0,
          );
        }
        flipTl.current = tl;
      }
      // The page changed height; the final layout is already in place (Flip
      // only adds transforms), so triggers below can be re-measured now.
      ScrollTrigger.refresh();
    },
    { scope: root, dependencies: [view] },
  );

  /* ------------------------------------- index mode: cursor-follow + dim */
  useGSAP(
    () => {
      const list = listRef.current;
      const fol = followerRef.current;
      if (view !== "index" || !list || !fol) return;

      const mm = gsap.matchMedia();
      mm.add(FOLLOW_OK, (_ctx, contextSafe) => {
        const safe = contextSafe!;
        const rows = gsap.utils.toArray<HTMLElement>("[data-row]", list);
        // What dims: each row's ink type, tagged with its row's index.
        const dims = gsap.utils.toArray<HTMLElement>("[data-dim]", list);
        const dimRow = dims.map((d) => rows.indexOf(d.closest("[data-row]") as HTMLElement));
        const imgs = gsap.utils.toArray<HTMLElement>("[data-follow-img]", fol);
        const xTo = gsap.quickTo(fol, "x", { duration: 0.6, ease: "power3.out" });
        const yTo = gsap.quickTo(fol, "y", { duration: 0.6, ease: "power3.out" });
        let shown = false;

        const place = (e: PointerEvent) => {
          const r = list.getBoundingClientRect();
          const cx = e.clientX - r.left;
          const cy = e.clientY - r.top;
          // Image sits beside the cursor, on whichever side has room.
          const x = cx > r.width / 2 ? cx - fol.offsetWidth - 32 : cx + 32;
          const y = cy - fol.offsetHeight / 2;
          return { x, y };
        };

        const onMove = (e: PointerEvent) => {
          const { x, y } = place(e);
          xTo(x);
          yTo(y);
        };

        const onEnterRow = safe((e: PointerEvent) => {
          const i = rows.indexOf(e.currentTarget as HTMLElement);
          imgs.forEach((im, j) => gsap.set(im, { autoAlpha: j === i ? 1 : 0 }));
          if (!shown) {
            shown = true;
            const { x, y } = place(e);
            gsap.set(fol, { x, y });
            xTo(x, x);
            yTo(y, y);
            gsap.to(fol, { clipPath: OPEN, duration: 0.6, ease: EASE_SNAP, overwrite: "auto" });
          }
          gsap.to(dims, {
            opacity: (k: number) => (dimRow[k] === i ? 1 : DIM),
            duration: 0.4,
            ease: "power2.out",
            overwrite: "auto",
          });
        }) as (e: PointerEvent) => void;

        const onLeaveList = safe(() => {
          shown = false;
          gsap.to(fol, { clipPath: CLOSED, duration: 0.4, ease: EASE_SNAP, overwrite: "auto" });
          gsap.to(dims, { opacity: 1, duration: 0.4, ease: "power2.out", overwrite: "auto" });
        }) as () => void;

        list.addEventListener("pointermove", onMove);
        list.addEventListener("pointerleave", onLeaveList);
        rows.forEach((r) => r.addEventListener("pointerenter", onEnterRow));
        return () => {
          list.removeEventListener("pointermove", onMove);
          list.removeEventListener("pointerleave", onLeaveList);
          rows.forEach((r) => r.removeEventListener("pointerenter", onEnterRow));
        };
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [view, follow], revertOnUpdate: true },
  );

  const isGrid = view === "grid";

  return (
    <div ref={root}>
      {/* ------------------------------------------------------- toolbar */}
      <div className="grid-12 items-end pb-4">
        <p className="col-span-6 m-0 font-mono text-label text-smoke uppercase md:col-span-3">
          02 / Danh sách
        </p>
        <div
          role="group"
          aria-label="Chế độ xem"
          className="col-span-6 flex justify-end gap-6 md:col-span-4 md:col-start-9"
        >
          {VIEWS.map((opt) => {
            const on = view === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={on}
                onClick={() => choose(opt.id)}
                className={`relative cursor-pointer py-1.5 font-mono text-label uppercase transition-colors ${
                  on ? "text-ink" : "text-smoke hover:text-ink"
                }`}
              >
                {opt.label}
                {on && (
                  <span
                    aria-hidden
                    data-flip
                    data-flip-id="view-mark"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-mint"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid-12">
        <div aria-hidden className="col-span-12 h-px bg-ink" />
      </div>

      {/* ---------------------------------------------------------- list */}
      <div className="relative overflow-x-clip">
        <ul
          ref={listRef}
          aria-label="Sản phẩm"
          className={`grid-12 m-0 list-none ${v(view, "gap-y-12 pt-8 md:gap-y-16", "pt-0")}`}
        >
          {items.map((p) => {
            return (
              <li
                key={p.sku}
                data-row
                className={`relative ${v(view, "col-span-6 lg:col-span-3", "col-span-12 grid grid-cols-subgrid")}`}
              >
                {/* A solid outline traces the link box only; the default
                    `auto` ring wrapped the name's overflowing mask and notched. */}
                <Link
                  href={`/product/${p.sku}`}
                  className={`group/row relative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${v(
                    view,
                    "grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3",
                    "col-span-12 grid grid-cols-subgrid items-baseline py-5 md:py-6",
                  )}`}
                >
                  {/* Photograph — grid only. */}
                  <div
                    data-frame
                    className={v(view, "relative col-span-3 col-start-1 row-start-1 mb-3 aspect-[4/5] overflow-hidden hatch", "hidden")}
                  >
                    <Image
                      src={p.image.src}
                      alt={p.image.alt}
                      fill
                      sizes="(max-width: 1024px) 50vw, 300px"
                      className={`object-cover transition-transform duration-700 ${EASE_CSS} motion-safe:group-hover/row:scale-[1.03] motion-safe:group-focus-visible/row:scale-[1.03]`}
                    />
                  </div>

                  {/* Caption rule + hover underline — grid only. */}
                  <span
                    aria-hidden
                    className={v(view, "col-span-3 col-start-1 row-start-2 h-px self-start bg-line", "hidden")}
                  />
                  <span
                    aria-hidden
                    className={v(
                      view,
                      `col-span-3 col-start-1 row-start-2 h-px origin-left scale-x-0 self-start bg-ink transition-transform duration-700 ${EASE_CSS} group-hover/row:scale-x-100 group-focus-visible/row:scale-x-100 motion-reduce:transition-none`,
                      "hidden",
                    )}
                  />

                  <span
                    data-flip
                    className={`block font-mono tabular-nums ${v(
                      view,
                      "col-start-1 row-start-2 pt-2.5 text-label tracking-normal text-smoke",
                      "col-span-2 row-start-1 text-label tracking-normal text-smoke md:col-span-1",
                    )}`}
                  >
                    {p.no}
                  </span>

                  {/* Name: padded mask so stacked diacritics are not clipped. */}
                  <span
                    data-dim
                    className={`block overflow-clip ${v(
                      view,
                      "col-start-2 col-end-4 row-start-2 pt-2.5 text-[15px] leading-snug sm:col-end-3",
                      "col-span-8 col-start-3 row-start-1 -mt-[0.36em] -mb-[0.14em] pt-[0.36em] pb-[0.14em] text-[clamp(2.25rem,1rem+4.6vw,5.5rem)] leading-[0.92] font-semibold tracking-[-0.03em] [font-stretch:75%] md:col-span-6 md:col-start-2",
                    )}`}
                  >
                    <span data-name className="block">
                      {p.name}
                    </span>
                  </span>

                  {/* Price: rolls on hover in grid mode. */}
                  <span
                    data-flip
                    data-dim
                    className={`relative block overflow-clip font-mono tabular-nums ${v(
                      view,
                      "col-start-2 col-end-4 row-start-3 mt-1 justify-self-start self-start text-[12.5px] leading-[1.4] sm:col-start-3 sm:col-end-4 sm:row-start-2 sm:mt-2.5 sm:justify-self-end sm:text-right",
                      "col-span-8 col-start-3 row-start-3 mt-1 text-[12.5px] leading-[1.4] md:col-span-2 md:col-start-10 md:row-start-1 md:mt-0 md:text-right",
                    )}`}
                  >
                    <span
                      className={`block transition-transform duration-700 ${EASE_CSS} motion-reduce:transition-none ${v(view, "group-hover/row:-translate-y-full group-focus-visible/row:-translate-y-full", "")}`}
                    >
                      {p.price}
                    </span>
                    <span
                      aria-hidden
                      className={`absolute inset-x-0 top-full block transition-transform duration-700 ${EASE_CSS} motion-reduce:transition-none ${v(view, "group-hover/row:-translate-y-full group-focus-visible/row:-translate-y-full", "")}`}
                    >
                      {p.price}
                    </span>
                  </span>

                  <span
                    data-flip
                    className={`block font-mono text-label tracking-normal text-smoke ${v(
                      view,
                      "col-span-3 col-start-1 row-start-4 mt-1 sm:row-start-3",
                      "col-span-8 col-start-3 row-start-2 mt-2 md:col-span-2 md:col-start-8 md:row-start-1 md:mt-0",
                    )}`}
                  >
                    {p.material}
                  </span>

                  {/* The maker, quietly — what the retired card back used to tell. */}
                  <span
                    className={v(
                      view,
                      "col-span-3 col-start-1 row-start-5 mt-0.5 block sm:row-start-4 font-mono text-label tracking-normal text-smoke",
                      "sr-only",
                    )}
                  >
                    Dệt tại {p.workshop}, {p.place}
                  </span>

                  {/* Inline thumbnail — index only; on focus, on hover without the
                      follower, and always on touch screens (no hover to reveal it). */}
                  <span
                    aria-hidden
                    className={v(
                      view,
                      "hidden",
                      "relative col-span-2 col-start-11 row-span-3 row-start-1 block self-stretch md:col-span-1 md:col-start-12 md:row-span-1",
                    )}
                  >
                    <span
                      className={`hatch absolute inset-y-0 right-0 block aspect-[4/5] max-w-full overflow-hidden [clip-path:inset(0_0_100%_0)] transition-[clip-path] duration-600 ${EASE_CSS} group-focus-visible/row:[clip-path:inset(0)] [@media(hover:none)]:[clip-path:inset(0)] motion-reduce:transition-none ${
                        follow ? "" : "group-hover/row:[clip-path:inset(0)]"
                      }`}
                    >
                      {!isGrid && (
                        <Image src={p.image.src} alt="" fill sizes="96px" className="object-cover" />
                      )}
                    </span>
                  </span>
                </Link>

                {/* Row rule — index only, drawn with scaleX on entry. */}
                <span
                  aria-hidden
                  data-row-rule
                  className={v(view, "hidden", "absolute inset-x-0 bottom-0 h-px origin-left bg-line")}
                />
              </li>
            );
          })}
        </ul>

        {/* Cursor follower — index mode, fine pointer, motion allowed. */}
        {!isGrid && follow && (
          <div
            ref={followerRef}
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 z-10 hidden aspect-[4/5] w-[clamp(180px,17vw,260px)] overflow-hidden md:block"
            style={{ clipPath: CLOSED }}
          >
            {items.map((p) => (
              <div key={p.sku} data-follow-img className="absolute inset-0" style={{ opacity: 0, visibility: "hidden" }}>
                <Image src={p.image.src} alt="" fill sizes="260px" className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
