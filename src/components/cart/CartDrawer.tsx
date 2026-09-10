"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  formatVnd,
  priceToNumber,
  removeLine,
  setCartOpen,
  setQty,
  useCart,
  useCartOpen,
} from "@/lib/cart";
import { getProduct } from "@/lib/data";

export default function CartDrawer() {
  const lines = useCart();
  const open = useCartOpen();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  const items = lines.flatMap((line) => {
    const product = getProduct(line.sku);
    return product ? [{ line, product }] : [];
  });

  const subtotal = items.reduce(
    (sum, { line, product }) => sum + priceToNumber(product.price) * line.qty,
    0,
  );
  const count = lines.reduce((n, l) => n + l.qty, 0);

  // Escape to close, focus moved in and restored on the way out, and the page
  // behind locked so the drawer does not scroll the document with it.
  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCartOpen(false);
      if (e.key !== "Tab") return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      restoreTo.current?.focus?.();
    };
  }, [open]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div
        onClick={() => setCartOpen(false)}
        aria-hidden
        className={`absolute inset-0 bg-ink/40 transition-opacity duration-300 motion-reduce:transition-none ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Giỏ hàng"
        aria-hidden={!open}
        inert={!open}
        className={`absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-paper shadow-[0_0_60px_rgba(13,13,12,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <span className="mono-label text-[10.5px] text-smoke">
            Giỏ hàng · {count} món
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Đóng giỏ hàng"
            className="cursor-pointer font-mono text-xl leading-none transition-colors hover:text-forest"
          >
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-start justify-center gap-4 px-5 sm:px-6">
            <p className="m-0 text-[15px] leading-[1.7] text-graphite">
              Giỏ hàng đang trống.
            </p>
            <Link
              href="/product"
              onClick={() => setCartOpen(false)}
              className="mono-label border-b border-mint pb-1 text-[10.5px] tracking-[0.14em]"
            >
              Xem bộ sưu tập
            </Link>
          </div>
        ) : (
          <>
            <ul className="m-0 flex-1 list-none overflow-y-auto p-0">
              {items.map(({ line, product }) => (
                <li
                  key={`${line.sku}-${line.size}`}
                  className="flex gap-4 border-b border-line px-5 py-4 sm:px-6"
                >
                  <Image
                    src={product.gallery[0].src}
                    alt={product.gallery[0].alt}
                    width={72}
                    height={96}
                    sizes="72px"
                    className="hatch h-24 w-[72px] flex-none object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3 text-[14.5px]">
                      <Link
                        href={`/product/${product.sku}`}
                        onClick={() => setCartOpen(false)}
                        className="hover:text-forest"
                      >
                        {product.name}
                      </Link>
                      <span className="font-mono text-graphite">{product.price}</span>
                    </div>
                    <div className="mono-label mt-1 text-[10px] text-smoke">
                      Size {line.size}
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center border border-line-3">
                        <button
                          type="button"
                          onClick={() => setQty(line.sku, line.size, line.qty - 1)}
                          aria-label={`Giảm số lượng ${product.name}`}
                          className="cursor-pointer px-2.5 py-1 font-mono text-sm leading-none hover:text-forest"
                        >
                          −
                        </button>
                        <span className="min-w-[26px] text-center font-mono text-xs">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(line.sku, line.size, line.qty + 1)}
                          aria-label={`Tăng số lượng ${product.name}`}
                          className="cursor-pointer px-2.5 py-1 font-mono text-sm leading-none hover:text-forest"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.sku, line.size)}
                        className="mono-label cursor-pointer text-[10px] text-smoke transition-colors hover:text-ink"
                      >
                        Bỏ
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-line px-5 py-5 sm:px-6">
              <div className="flex justify-between text-[15px]">
                <span>Tạm tính</span>
                <span className="font-mono">{formatVnd(subtotal)}</span>
              </div>
              <p className="mono-label mt-2 mb-4 text-[10px] leading-[1.6] text-smoke">
                Phí giao tính ở bước sau · Giao 48 giờ toàn quốc
              </p>
              <button
                type="button"
                className="w-full cursor-pointer border border-ink bg-ink px-5 py-[15px] text-[12.5px] tracking-[0.14em] text-paper uppercase transition-colors hover:border-forest hover:bg-forest"
              >
                Thanh toán
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
