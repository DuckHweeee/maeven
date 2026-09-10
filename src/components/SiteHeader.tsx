"use client";

import { useEffect, useState } from "react";
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

  return (
    <header
      className={`sticky top-0 z-20 border-b transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300 ${
        lifted
          ? "border-line/80 bg-[rgba(244,241,236,0.72)] shadow-[0_1px_24px_rgba(13,13,12,0.07)] backdrop-blur-[18px] backdrop-saturate-150"
          : "border-line bg-[rgba(244,241,236,0.94)] backdrop-blur-[8px]"
      }`}
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-3.5">
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
              className="flex flex-col items-center gap-[5px] px-[11px] py-2 font-sans text-xs uppercase tracking-[0.08em] text-ink transition-colors hover:text-forest"
            >
              <span>{tab.label}</span>
              <span
                aria-hidden
                className={`block h-0.5 w-full ${
                  isActive(pathname, tab.href) ? "bg-mint" : "bg-transparent"
                }`}
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Mở giỏ hàng, ${cartCount} món`}
            className="mono-label cursor-pointer px-2 py-2 text-[10.5px] tracking-[0.12em] text-ink transition-colors hover:text-forest"
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
          className="-mr-2 cursor-pointer px-2 py-1 font-mono text-xl leading-none md:hidden"
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
