"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { MOTION_OK, ScrollSmoother, ScrollTrigger, gsap, useGSAP } from "@/lib/gsap";
import { getSmoother, headerOffset, scrollToTarget } from "@/lib/scroll";

/** Breathing room left between a focused element and the screen edge. */
const FOCUS_MARGIN = 16;

/** Same-document `#hash` target of a click, if any. */
function hashTarget(e: MouseEvent): HTMLElement | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    return null;
  }
  const a = (e.target as Element | null)?.closest?.("a[href]");
  if (
    !(a instanceof HTMLAnchorElement) ||
    a.target === "_blank" ||
    a.hasAttribute("download") ||
    a.hasAttribute("data-skip-link") // scrolls and moves focus itself
  ) {
    return null;
  }
  const url = new URL(a.href, location.href);
  if (!url.hash || url.origin !== location.origin || url.pathname !== location.pathname) {
    return null;
  }
  return document.getElementById(decodeURIComponent(url.hash.slice(1)));
}

/**
 * Puts the page back at the top on a route change BEFORE the new page sets up
 * its ScrollTriggers.
 *
 * Rendered as the first child of #smooth-content, ahead of the route: React
 * runs layout effects child-first and in sibling order, so this one runs
 * before any `useGSAP` (a layout effect) inside the new page. Without it the
 * new page created its triggers while the window was still scrolled to where
 * the old page was, and every `once` reveal above that point fired — and
 * killed itself — off-screen. SmoothScroll's own effect then refreshes.
 */
function ScrollReset() {
  const pathname = usePathname();
  const lastPath = useRef(pathname);

  useLayoutEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    // Anything that scrolled the clipped wrapper skews every measurement.
    const wrapper = document.getElementById("smooth-wrapper");
    if (wrapper) wrapper.scrollTop = 0;
    scrollToTarget(0, { smooth: false });
    // Record the jump now. The window's `scroll` event only arrives a frame
    // later; until then ScrollSmoother still holds the old page's progress,
    // and the refresh() below would re-apply it to the new page's height —
    // momentarily "scrolling" it past its reveals, which then fire.
    ScrollTrigger.update();
    // refresh() restores the scroll position it last recorded, which is still
    // the previous page's; forget it so the new page stays at the top.
    ScrollTrigger.clearScrollMemory();
  }, [pathname]);

  return null;
}

/**
 * Keyboard focus that lands under the fixed header or past the bottom edge is
 * scrolled into view — including an element only partly off-screen, which
 * ScrollSmoother's own handler (it only acts on elements fully outside the
 * viewport, and then centres them) leaves where it is.
 *
 * Only for `:focus-visible` focus inside the page content: a mouse click that
 * focuses something (or <main tabIndex=-1>) never scrolls, and the fixed
 * header / drawers are never "off-screen". Nearest edge, instant: Tab must not
 * set off a smooth glide, and reduced motion gets the same jump.
 */
function revealFocus(el: Element, content: HTMLElement | null) {
  if (!(el instanceof HTMLElement) || !content?.contains(el)) return;
  if (!el.matches(":focus-visible")) return;
  const top = headerOffset();
  const bottom = window.innerHeight;
  const r = el.getBoundingClientRect();
  if (r.bottom <= bottom && r.top >= top) return; // fully visible
  const fits = r.height <= bottom - top - FOCUS_MARGIN * 2;
  if (r.top < top || !fits) {
    // Under the header, or taller than the screen: its top edge below the header.
    if (!fits && r.top >= top && r.top < bottom / 2) return; // tall, top already in view
    scrollToTarget(el, { smooth: false, offset: top + FOCUS_MARGIN });
  } else {
    // Past the bottom edge: the least scroll that brings it fully in.
    const smoother = getSmoother();
    const y = smoother ? smoother.scrollTop() : window.scrollY;
    scrollToTarget(y + r.bottom - bottom + FOCUS_MARGIN, { smooth: false });
  }
}

/**
 * Wraps the page (route content + footer) in ScrollSmoother's
 * `#smooth-wrapper > #smooth-content`.
 *
 * - Only under `prefers-reduced-motion: no-preference`. With reduced motion the
 *   two divs are plain blocks and the page scrolls natively — no transforms.
 * - `effects: true`, so `data-speed` / `data-lag` work on anything inside.
 * - Fixed UI (SiteHeader, CartDrawer, WelcomeOffer) must live OUTSIDE this
 *   component: `position: fixed` inside a transformed parent scrolls away.
 * - Route change: ScrollReset jumps to the top before the new page's triggers
 *   are created; once they exist, refresh every ScrollTrigger and go to the
 *   `#hash`, if any.
 * - Tab focus partly or wholly off-screen: `revealFocus` (both paths).
 *   ScrollSmoother's own focus handling is switched off (`onFocusIn`).
 * - Same-page `#hash` links are routed through the smoother; the browser's
 *   default would scroll the clipped wrapper instead of the page.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const lastPath = useRef(pathname);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add(MOTION_OK, () => {
      // Registered with this matchMedia context, so mm.revert() kills it and
      // restores body height / wrapper styles when the preference flips.
      const smoother = ScrollSmoother.create({
        wrapper: wrapperRef.current!,
        content: contentRef.current!,
        smooth: 1,
        effects: true,
        smoothTouch: false,
        // revealFocus below does it for both paths, partly hidden elements too.
        onFocusIn: () => false,
      });

      const onClick = (e: MouseEvent) => {
        const el = hashTarget(e);
        if (!el) return;
        // Capture phase on window runs before React's listeners, so Next's
        // <Link> never sees the click and does not call scrollIntoView().
        e.preventDefault();
        e.stopPropagation();
        history.pushState(history.state, "", `#${el.id}`);
        // Anything that scrolled the clipped wrapper (focus, automation) skews
        // the offset measurement; the page only ever scrolls on window.
        wrapperRef.current!.scrollTop = 0;
        smoother.scrollTo(el, true, `top ${headerOffset()}px`);
      };
      window.addEventListener("click", onClick, true);

      // Deep link on first load: the browser scrolled the clipped wrapper, so
      // redo it on the page once the smoother has measured.
      const initial = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      const raf = initial
        ? requestAnimationFrame(() => {
            wrapperRef.current!.scrollTop = 0;
            smoother.scrollTo(initial, false, `top ${headerOffset()}px`);
          })
        : 0;

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("click", onClick, true);
      };
    });

    return () => mm.revert();
  });

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => revealFocus(e.target as Element, contentRef.current);
    window.addEventListener("focusin", onFocusIn);
    return () => window.removeEventListener("focusin", onFocusIn);
  }, []);

  // Not an animation, so a plain effect: it only re-measures. ScrollReset has
  // already put the page at the top; parent effects run after the new page's
  // own useGSAP setups, so every new ScrollTrigger exists by now.
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    const hashEl = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    ScrollTrigger.clearScrollMemory();
    ScrollTrigger.refresh();
    scrollToTarget(hashEl || 0, { smooth: false });
  }, [pathname]);

  return (
    <div id="smooth-wrapper" ref={wrapperRef}>
      <div id="smooth-content" ref={contentRef} className="flex min-h-svh flex-col">
        <ScrollReset />
        {children}
      </div>
    </div>
  );
}
