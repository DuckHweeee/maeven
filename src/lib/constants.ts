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
