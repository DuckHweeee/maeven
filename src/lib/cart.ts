"use client";

import { store } from "@/store";
import { cartActions } from "@/store/cartSlice";
import { useAppSelector } from "@/store/hooks";

export { priceToNumber } from "./constants";
export type { CartLine } from "@/store/cartSlice";

/* ------------------------------------------------------------------ actions */
// Plain functions rather than hooks so click handlers stay call-sites, not
// `useDispatch` boilerplate. Safe against the module-level store for the same
// reason the Provider is — the cart never renders on the server.

export const addToCart = (sku: string, size: string) =>
  store.dispatch(cartActions.addToCart({ sku, size }));

export const setQty = (sku: string, size: string, qty: number) =>
  store.dispatch(cartActions.setQty({ sku, size, qty }));

export const removeLine = (sku: string, size: string) => setQty(sku, size, 0);

export const setCartOpen = (next: boolean) =>
  store.dispatch(cartActions.setCartOpen(next));

/* -------------------------------------------------------------------- hooks */

export const useCart = () => useAppSelector((s) => s.cart.lines);
export const useCartOpen = () => useAppSelector((s) => s.cart.open);

/* ------------------------------------------------------------------- money */

/** Grouped manually rather than via toLocaleString, whose output depends on the
 *  runtime's locale data and can differ between server and browser. */
export const formatVnd = (n: number) =>
  `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}₫`;
