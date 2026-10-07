"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { useGSAP } from "@gsap/react";

/**
 * One place to register GSAP, so no component has to remember to.
 *
 * Registering `useGSAP` as a plugin is what makes every tween created inside the
 * hook belong to a context that reverts on unmount — without it, a card that
 * scrolls out of a virtualised list leaves its tweens running.
 *
 * ScrollSmoother must be registered after ScrollTrigger (it is built on it).
 * Every route already loads ScrollSmoother through the root layout, so the
 * plugins below are one shared chunk rather than a per-route cost. Plugins used
 * by a single component (Observer in InfiniteSlider) stay registered there.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother, SplitText, Flip);

/**
 * House easings, kept here rather than typed per-component so the GSAP layer and
 * the CSS layer stay in step.
 *
 * `expo.out` is the closest GSAP curve to the `cubic-bezier(0.16, 1, 0.3, 1)`
 * that `.reveal` and the flip transition already use in globals.css — matching
 * it means a GSAP card and a CSS-revealed block decelerate the same way.
 */
export const EASE_OUT = "expo.out";
export const EASE_IN_OUT = "power3.inOut";
/** The mechanical "click": fast start, hard settle. Masks, counters, hairlines. */
export const EASE_SNAP = "power4.out";

/** Matches the 0.7s of the CSS motion layer. */
export const DUR = 0.7;
/** Short mechanical moves: counters, hairlines, line masks. */
export const DUR_FAST = 0.6;

/** The only query animations may run under. The reduce branch is "do nothing". */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

/**
 * Screen big enough to pin a section: a pin on a short viewport (1024×600, a
 * phone in landscape) clips its own content. Always combine with MOTION_OK.
 * Mirrors the `pinned:` / `md-still:` CSS variants in globals.css — the
 * non-pinned layout must switch at exactly the same edge.
 */
export const PIN_OK = "(min-width: 768px) and (min-height: 700px)";

export { gsap, useGSAP, ScrollTrigger, ScrollSmoother, SplitText, Flip };
