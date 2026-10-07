"use client";

import { scrollToTarget } from "@/lib/scroll";

/**
 * "Bỏ qua đến nội dung" — the first stop in the tab order, visible only while
 * focused. Every route's <main> carries `id="main" tabIndex={-1}`.
 *
 * Lives outside the smoother (it is fixed) and scrolls through
 * `scrollToTarget`, so it lands below the header with or without
 * ScrollSmoother; then focus moves to <main> so the next Tab continues from
 * the content, not from the header. SmoothScroll's same-page `#hash` handler
 * leaves this link alone (`data-skip-link`).
 */
export default function SkipLink() {
  return (
    <a
      href="#main"
      data-skip-link
      onClick={(e) => {
        const main = document.getElementById("main");
        if (!main) return;
        e.preventDefault();
        scrollToTarget(main, { smooth: false });
        main.focus({ preventScroll: true });
      }}
      className="fixed top-2 left-2 z-70 -translate-y-[200%] bg-ink px-4 py-3 font-mono text-label text-paper uppercase focus:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
    >
      Bỏ qua đến nội dung
    </a>
  );
}
