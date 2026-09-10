"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Subscription that never fires — for values that are fixed once known. */
const noopSubscribe = () => () => {};

/**
 * Media query hook built on useSyncExternalStore, which is the sanctioned way to
 * read a browser-only value without a hydration mismatch: the server snapshot is
 * always `false`, so server and first client render agree, and React switches to
 * the live value immediately afterwards.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True when the reader has asked for less motion. Every effect must honour it. */
export const useReducedMotion = () =>
  useMediaQuery("(prefers-reduced-motion: reduce)");

/** True only for real pointers — tilt and hover effects are pointless on touch. */
export const useFinePointer = () =>
  useMediaQuery("(hover: hover) and (pointer: fine)");

let webglSupport: boolean | null = null;

function detectWebgl() {
  if (webglSupport !== null) return webglSupport;
  try {
    const c = document.createElement("canvas");
    webglSupport = Boolean(
      c.getContext("webgl2") ??
        c.getContext("webgl") ??
        c.getContext("experimental-webgl"),
    );
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/** Whether a WebGL context can be created. Cached — the answer cannot change. */
export const useWebGL = () =>
  useSyncExternalStore(noopSubscribe, detectWebgl, () => false);

/**
 * Both conditions for a pointer-driven effect, evaluated as one hook so neither
 * underlying hook can be short-circuited away.
 */
export function usePointerEffects() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  return { enabled: fine && !reduced, reduced };
}

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** Frame-rate independent easing toward a target. */
export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
