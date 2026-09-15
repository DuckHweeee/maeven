"use client";

import { useSyncExternalStore } from "react";

export { priceToNumber } from "./constants";

export type CartLine = { sku: string; size: string; qty: number };

// v2: product codes changed (mv-sm-01 -> mv-01), so v1 lines would resolve
// to no product and strand the header count against an empty drawer.
const KEY = "maeven.cart.v2";
const MAX_QTY = 9;

/**
 * Cart as a tiny external store rather than React state.
 *
 * useSyncExternalStore is what makes this hydration-safe: the server snapshot is
 * a stable empty array, so server and first client render agree, and the stored
 * cart is read only once a subscriber attaches on the client.
 */
const EMPTY: CartLine[] = [];

let lines: CartLine[] = EMPTY;
let open = false;
let loaded = false;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      lines = parsed.filter(
        (l): l is CartLine =>
          typeof l?.sku === "string" &&
          typeof l?.size === "string" &&
          Number.isFinite(l?.qty),
      );
    }
  } catch {
    // Private mode, blocked storage, corrupt JSON — an empty cart is fine.
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // Never let a storage failure break adding to the cart.
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!loaded) {
    load();
    cb();
  }
  return () => {
    listeners.delete(cb);
  };
}

/* ------------------------------------------------------------------ actions */

export function addToCart(sku: string, size: string) {
  load();
  const found = lines.find((l) => l.sku === sku && l.size === size);
  lines = found
    ? lines.map((l) =>
        l === found ? { ...l, qty: Math.min(MAX_QTY, l.qty + 1) } : l,
      )
    : [...lines, { sku, size, qty: 1 }];
  persist();
  open = true;
  emit();
}

export function setQty(sku: string, size: string, qty: number) {
  load();
  lines =
    qty <= 0
      ? lines.filter((l) => !(l.sku === sku && l.size === size))
      : lines.map((l) =>
          l.sku === sku && l.size === size
            ? { ...l, qty: Math.min(MAX_QTY, qty) }
            : l,
        );
  persist();
  emit();
}

export function removeLine(sku: string, size: string) {
  setQty(sku, size, 0);
}

export function setCartOpen(next: boolean) {
  open = next;
  emit();
}

/* -------------------------------------------------------------------- hooks */

export const useCart = () =>
  useSyncExternalStore(
    subscribe,
    () => lines,
    () => EMPTY,
  );

export const useCartOpen = () =>
  useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );

/* ------------------------------------------------------------------- money */


/** Grouped manually rather than via toLocaleString, whose output depends on the
 *  runtime's locale data and can differ between server and browser. */
export const formatVnd = (n: number) =>
  `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}₫`;
