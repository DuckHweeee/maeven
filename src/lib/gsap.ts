"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * One place to register GSAP, so no component has to remember to.
 *
 * Registering `useGSAP` as a plugin is what makes every tween created inside the
 * hook belong to a context that reverts on unmount — without it, a card that
 * scrolls out of a virtualised list leaves its tweens running.
 */
gsap.registerPlugin(useGSAP);

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

/** Matches the 0.7s of the CSS motion layer. */
export const DUR = 0.7;

export { gsap, useGSAP };
