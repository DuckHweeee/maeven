"use client";

import { ScrollSmoother } from "@/lib/gsap";

/**
 * Scroll helpers that work the same with or without ScrollSmoother.
 *
 * The smoother only exists under `prefers-reduced-motion: no-preference`; with
 * reduced motion the page scrolls natively. Call these instead of touching
 * `window.scrollTo` / `document.body.style.overflow` directly, so both paths
 * stay correct.
 */

/** The live smoother, or undefined under reduced motion / before mount. */
export const getSmoother = (): ScrollSmoother | undefined => ScrollSmoother.get();

/** Height of the fixed SiteHeader in px (reads `--header-h`, set by SiteHeader). */
export function headerOffset(): number {
  if (typeof window === "undefined") return 0;
  const v = getComputedStyle(document.documentElement).getPropertyValue("--header-h");
  return parseFloat(v) || 0;
}

let locks = 0;
let prevOverflow = "";
/** Where the page stood when the first lock was taken, and on which route. */
let pausedAt = { y: 0, path: "" };

const SCROLL_KEYS = new Set(["PageDown", "PageUp", "Home", "End", "ArrowDown", "ArrowUp", " "]);

/** True if `el` or an ancestor below <body> can scroll vertically itself. */
function inScrollable(el: Element | null) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight) return true;
  }
  return false;
}

/**
 * Keyboard page-scrolling while locked. Left alone: typing in a field, Space on
 * a control (it activates it), and keys inside a scrollable panel such as the
 * cart's item list — those scroll the panel, not the page.
 */
function blockScrollKeys(e: KeyboardEvent) {
  if (e.defaultPrevented || !SCROLL_KEYS.has(e.key)) return;
  const t = e.target instanceof Element ? e.target : null;
  if (t?.closest("input, textarea, select, [contenteditable]")) return;
  if (e.key === " " && t?.closest("button, a[href], summary, [role=button]")) return;
  if (inScrollable(t)) return;
  e.preventDefault();
}

/**
 * Freezes page scroll while a modal layer (cart, welcome offer) is open.
 *
 * Reference-counted, so two overlays can each lock and unlock independently —
 * always pair a `pauseScroll(true)` with exactly one `pauseScroll(false)`.
 * With the smoother this is `smoother.paused()` (nested scroll inside the
 * overlay keeps working); without it, `overflow: hidden` on body.
 *
 * A PageDown / Space pressed while the cart was open started a native smooth
 * scroll that the paused smoother undid frame by frame; close the cart within
 * ~400ms and the rest of that scroll landed on the page. So while locked, page
 * scroll keys are swallowed (`blockScrollKeys`), and resuming puts the page
 * back where it was paused — skipped if the route changed meanwhile (a link
 * inside the drawer), so a new page is never dragged to the old position.
 */
export function pauseScroll(paused: boolean) {
  if (paused) {
    if (locks++ > 0) return;
  } else {
    if (locks === 0) return;
    if (--locks > 0) return;
  }

  const smoother = getSmoother();
  if (paused) {
    pausedAt = { y: smoother ? smoother.scrollTop() : window.scrollY, path: location.pathname };
    window.addEventListener("keydown", blockScrollKeys, true);
  } else {
    window.removeEventListener("keydown", blockScrollKeys, true);
  }
  const restore = !paused && pausedAt.path === location.pathname;

  if (smoother) {
    smoother.paused(paused);
    // Instant: also cancels any native smooth scroll still in flight.
    if (restore) smoother.scrollTop(pausedAt.y);
    return;
  }
  if (paused) {
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = prevOverflow;
    if (restore && window.scrollY !== pausedAt.y) {
      window.scrollTo({ top: pausedAt.y, behavior: "instant" });
    }
  }
}

/**
 * Scrolls an element (or a y position) into view below the fixed header.
 *
 * `smooth` defaults to true; it is ignored under reduced motion, where the jump
 * is always instant.
 */
export function scrollToTarget(
  target: Element | number,
  { smooth = true, offset = headerOffset() }: { smooth?: boolean; offset?: number } = {},
) {
  const smoother = getSmoother();
  if (smoother) {
    if (typeof target === "number") smoother.scrollTo(target, smooth);
    else smoother.scrollTo(target, smooth, `top ${offset}px`);
    return;
  }
  const y =
    typeof target === "number"
      ? target
      : target.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: y, behavior: "auto" });
}

/**
 * Lets a dark, full-bleed hero make the fixed header transparent with paper
 * type while it sits underneath. Pair it with a ScrollTrigger in the hero:
 * `onToggle: (st) => setHeaderOverHero(st.isActive)`, and call
 * `setHeaderOverHero(false)` on cleanup so other routes get the solid header.
 */
export function setHeaderOverHero(on: boolean) {
  document.getElementById("site-header")?.toggleAttribute("data-over-hero", on);
}
