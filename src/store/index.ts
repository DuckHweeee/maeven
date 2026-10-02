import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "./cartSlice";

export const makeStore = () =>
  configureStore({ reducer: { cart: cartReducer } });

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
