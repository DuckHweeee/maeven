"use client";

import { useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { store } from "./index";
import { cartActions, type CartLine } from "./cartSlice";

// v2: product codes changed (mv-sm-01 -> mv-01), so v1 lines would resolve to
// no product and strand the header count against an empty drawer.
const KEY = "maeven.cart.v2";

function readStoredLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        typeof l?.sku === "string" &&
        typeof l?.size === "string" &&
        Number.isFinite(l?.qty),
    );
  } catch {
    // Private mode, blocked storage, corrupt JSON — an empty cart is fine.
    return [];
  }
}

/**
 * Reads the persisted cart after mount and writes it back on every change.
 *
 * Hydration is deliberately an effect rather than a lazy `preloadedState`: the
 * store must produce the same empty cart on the server and on the first client
 * render, or React reports a mismatch. Reading storage one tick later costs a
 * single extra render and keeps the markup identical on both sides.
 */
function CartPersistence() {
  const primed = useRef(false);

  useEffect(() => {
    store.dispatch(cartActions.hydrate(readStoredLines()));
    primed.current = true;

    return store.subscribe(() => {
      // Never persist before hydration, or an empty initial store would
      // overwrite a real saved cart.
      if (!primed.current) return;
      try {
        localStorage.setItem(KEY, JSON.stringify(store.getState().cart.lines));
      } catch {
        // Never let a storage failure break adding to the cart.
      }
    });
  }, []);

  return null;
}

/**
 * A module-level store is safe here because the cart is client-only: it starts
 * empty, is never read during server rendering, and so cannot leak between
 * requests. Per-request state would need `makeStore()` inside this component.
 */
export default function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider store={store}>
      <CartPersistence />
      {children}
    </Provider>
  );
}
