"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND, NAV } from "@/lib/constants";
import { setCartOpen, useCart } from "@/lib/cart";

function isActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname.startsWith(href.split("/").slice(0, 2).join("/"));
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lifted, setLifted] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const lines = useCart();
  const cartCount = lines.reduce((n, l) => n + l.qty, 0);

  // Glass only once the page has moved, so the header sits flat at the top and
  // lifts off the content as you scroll. One boolean, so this re-renders twice
  // in a session rather than on every scroll frame.
  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The header is fixed (ScrollSmoother transforms the page, so sticky cannot
  // work), so content clears it with `--header-h`. Measure the bar itself, not
  // the mobile menu: the menu drops over the page rather than pushing it.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const ro = new ResizeObserver(() => {
      // +1 for the header's bottom border.
      root.style.setProperty("--header-h", `${Math.round(bar.offsetHeight + 1)}px`);
    });
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  return (
    <header
      id="site-header"
      // Open menu: keep the solid ground even over the hero (globals.css).
      data-open={open || undefined}
      // `data-[over-hero]:backdrop-filter-none`: the over-hero rule in
      // globals.css loses its unprefixed `backdrop-filter: none` in the CSS
      // build (only the -webkit- one survives), so the blur stays without this.
      className={`fixed inset-x-0 top-0 z-30 border-b transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300 data-[over-hero]:not-data-[open]:backdrop-filter-none ${
        lifted
          ? "border-line/80 bg-[rgba(244,241,236,0.72)] shadow-[0_1px_24px_rgba(13,13,12,0.07)] backdrop-blur-[18px] backdrop-saturate-150"
          : "border-line bg-[rgba(244,241,236,0.94)] backdrop-blur-[8px]"
      }`}
    >
      <div
        ref={barRef}
        className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-3.5"
      >
        <Link href="/" className="flex items-baseline gap-2.5">
          <span className="font-display text-[21px] font-extrabold lowercase tracking-[-0.035em] sm:text-[25px]">
            {BRAND.name}
          </span>
        </Link>

        {/* Desktop: the full tab row from the design. */}
        <nav className="hidden flex-wrap gap-0.5 md:flex">
          {NAV.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive(pathname, tab.href) ? "page" : undefined}
              // Hover draws the rule in the current colour — ink on the solid
              // bar, paper over the hero — rather than turning the label green,
              // which vanished against the photograph.
              className="group/tab flex flex-col items-center gap-[5px] px-[11px] py-2 font-sans text-xs uppercase tracking-[0.08em]"
            >
              <span>{tab.label}</span>
              <span
                aria-hidden
                className={`block h-0.5 w-full ${
                  isActive(pathname, tab.href) ? "bg-mint" : "bg-transparent group-hover/tab:bg-current"
                }`}
              />
            </Link>
          ))}
        </nav>

        {/* Cart and menu are 44×44 targets 8px apart. The negative block
            margin gives back the extra height, so the bar does not grow. */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Mở giỏ hàng, ${cartCount} món`}
            className="mono-label -my-1.5 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center px-2 text-[10.5px] tracking-[0.12em] underline-offset-4 hover:underline"
          >
            Giỏ<span className="ml-1 font-mono">({cartCount})</span>
          </button>

        {/* Mobile: hamburger, as drawn in the design's phone mockup. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Đóng menu" : "Mở menu"}
          className="-my-1.5 -mr-4 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center font-mono text-xl leading-none md:hidden"
        >
          {open ? "×" : "≡"}
        </button>
        </div>
      </div>

      <nav
        id="mobile-nav"
        hidden={!open}
        className="border-t border-line px-4 pb-3 md:!hidden"
      >
        {NAV.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={() => setOpen(false)}
            aria-current={isActive(pathname, tab.href) ? "page" : undefined}
            className="flex items-center justify-between border-b border-line py-3 font-sans text-xs uppercase tracking-[0.08em] last:border-b-0"
          >
            <span>{tab.label}</span>
            {isActive(pathname, tab.href) && (
              <span aria-hidden className="h-0.5 w-6 bg-mint" />
            )}
          </Link>
        ))}
      </nav>
    </header>
  );
}
