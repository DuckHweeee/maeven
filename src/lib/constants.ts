/**
 * Small constants that client components need.
 *
 * Kept apart from `data.ts` on purpose: whatever module a `"use client"` file
 * imports is pulled into the browser bundle. Reading these few values from
 * `data.ts` dragged every article body and product record along with them.
 */

export const BRAND = {
  name: "MAEVEN",
  tagline: "Simply Distinct",
  season: "SS26",
  est: "EST. 2026",
} as const;

export const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/product", label: "Cửa hàng" },
  { href: "/magazine", label: "Tạp chí" },
  { href: "/about-us", label: "Giới thiệu" },
] as const;

export const SIZES = ["XS", "S", "M", "L", "XL"];

/**
 * "1.480.000₫" -> 1480000.
 *
 * Lives here rather than in cart.ts because cart.ts is a client module: a
 * server component that imports from it gets a client reference, not a callable
 * function, and the JSON-LD builder needs to run on the server.
 */
export const priceToNumber = (price: string) =>
  Number(price.replace(/[^\d]/g, "")) || 0;

/**
 * Absolute origin, needed because structured data and Open Graph both require
 * absolute URLs. Overridable so a preview deploy does not claim to be
 * production.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://maeven.vn"
).replace(/\/$/, "");
