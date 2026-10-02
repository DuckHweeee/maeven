import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type CartLine = { sku: string; size: string; qty: number };

export const MAX_QTY = 9;

export type CartState = {
  lines: CartLine[];
  open: boolean;
  /** False until the persisted cart has been read on the client. Server and
   *  first client render both see `false` with an empty `lines`, which is what
   *  keeps hydration free of mismatches. */
  hydrated: boolean;
};

const initialState: CartState = { lines: [], open: false, hydrated: false };

const sameLine = (l: CartLine, sku: string, size: string) =>
  l.sku === sku && l.size === size;

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    /** Replaces the cart with what was found in storage. Dispatched once, from
     *  an effect, so it never runs during server rendering. */
    hydrate(state, action: PayloadAction<CartLine[]>) {
      state.lines = action.payload;
      state.hydrated = true;
    },
    addToCart(state, action: PayloadAction<{ sku: string; size: string }>) {
      const { sku, size } = action.payload;
      const existing = state.lines.find((l) => sameLine(l, sku, size));
      if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + 1);
      else state.lines.push({ sku, size, qty: 1 });
      state.open = true;
    },
    setQty(
      state,
      action: PayloadAction<{ sku: string; size: string; qty: number }>,
    ) {
      const { sku, size, qty } = action.payload;
      if (qty <= 0) {
        state.lines = state.lines.filter((l) => !sameLine(l, sku, size));
        return;
      }
      const line = state.lines.find((l) => sameLine(l, sku, size));
      if (line) line.qty = Math.min(MAX_QTY, qty);
    },
    setCartOpen(state, action: PayloadAction<boolean>) {
      state.open = action.payload;
    },
  },
});

export const cartActions = cartSlice.actions;
export default cartSlice.reducer;
