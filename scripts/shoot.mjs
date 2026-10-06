#!/usr/bin/env node
/**
 * Screenshot the running site so changes can actually be looked at.
 *
 * Usage:
 *   node scripts/shoot.mjs                          # every preset, desktop
 *   node scripts/shoot.mjs hero                     # one preset
 *   node scripts/shoot.mjs hero --mobile            # 390x844
 *   node scripts/shoot.mjs hero --wait 4000         # let the shader animate first
 *   node scripts/shoot.mjs hero --reduced           # prefers-reduced-motion path
 *   node scripts/shoot.mjs hero --hover ".group"    # park the pointer on a selector
 *
 * Writes PNGs to shots/. Assumes a server on $BASE (default http://localhost:3131).
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3131";
const OUT = "shots";

// SwiftShader gives headless Chromium a real WebGL context, so shaders render.
const ARGS = [
  "--use-gl=angle",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--enable-webgl",
  "--ignore-gpu-blocklist",
];

const PRESETS = {
  hero:     { path: "/",                                  clip: "viewport" },
  home:     { path: "/",                                  full: true },
  cards:    { path: "/",                                  scrollY: 2600 },
  moive:    { path: "/",                                  scrollY: 830 },
  product:  { path: "/product",                           full: true },
  pdp:      { path: "/product/mv-01",                     full: true },
  magazine: { path: "/magazine",                          full: true },
  article:  { path: "/article/vietnamese-linen-returns",  full: true },
  about:    { path: "/about-us",                          full: true },
};

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const val = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};
const names = argv.filter((a) => !a.startsWith("--") && PRESETS[a]);
const targets = names.length ? names : Object.keys(PRESETS);

const mobile = flag("mobile");
const reduced = flag("reduced");
const wait = Number(val("wait", 2500));
const hover = val("hover", null);
const suffix = `${mobile ? "-mobile" : ""}${reduced ? "-reduced" : ""}`;

fs.mkdirSync(OUT, { recursive: true });

// Playwright cannot download a browser on macOS 12, so drive the system Chrome.
// Override with CHROME_CHANNEL=chromium if a bundled build is available.
const browser = await chromium.launch({
  channel: process.env.CHROME_CHANNEL ?? "chrome",
  args: ARGS,
});
const context = await browser.newContext({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  reducedMotion: reduced ? "reduce" : "no-preference",
  hasTouch: mobile,
  isMobile: mobile,
});

// The welcome modal reveals 12s after load and covers the page with a
// pointer-eating overlay. Any shot that waits past that gets the modal instead
// of the page, and any --hover lands on the overlay rather than the target.
await context.addInitScript(() => {
  try {
    localStorage.setItem("maeven.welcome.v1", "dismissed");
  } catch {
    /* private mode — the modal is the least of our problems */
  }
});

const errors = [];
context.on("weberror", (e) => errors.push(String(e.error())));

for (const name of targets) {
  const preset = PRESETS[name];
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[${name}] ${m.text()}`);
  });

  await page.goto(BASE + preset.path, { waitUntil: "networkidle" });

  // ScrollSmoother keeps the page in a fixed wrapper and drives it from the
  // native window scroll, so window.scrollTo still works — the content then
  // eases to the new position over ~1s, which the wait below covers.
  //
  // Full-page shots first walk the whole page: scroll-triggered reveals are
  // `once`, so anything never scrolled past would be captured in its hidden
  // from-state. Then back to the top so the smoother's transform is 0 when
  // Playwright stretches the viewport for the capture.
  if (preset.full) {
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.6;
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((r) => setTimeout(r, 1200));
      window.scrollTo(0, 0);
    });
  }
  if (preset.scrollY) {
    await page.evaluate((y) => window.scrollTo(0, y), preset.scrollY);
  }
  if (hover) {
    await page.locator(hover).first().hover().catch(() => {});
  }

  await page.waitForTimeout(wait);

  // Probe after the wait: the scene is dynamically imported, so checking
  // earlier races the chunk load and reports a false negative.
  const gl = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    if (!c) return "no canvas";
    const ctx = c.getContext("webgl2") || c.getContext("webgl");
    return ctx ? `canvas ${c.width}x${c.height}` : "canvas, no context";
  });

  // With ScrollSmoother the page lives in a position:fixed, viewport-tall
  // wrapper, so a fullPage capture would show one screen and blank below.
  // At scroll 0 the content transform is identity, so un-fixing the wrapper
  // for the capture shows exactly what a reader scrolling down would see.
  if (preset.full) {
    await page.evaluate(() => {
      const w = document.getElementById("smooth-wrapper");
      if (!w || getComputedStyle(w).position !== "fixed") return;
      Object.assign(w.style, { position: "relative", overflow: "visible", height: "auto" });
      // The content's matrix3d makes it a composited layer, and Chrome only
      // rasterises the tiles of such a layer near the viewport — the rest of a
      // full-page capture comes out blank. Identity at scroll 0, so drop it.
      const c = document.getElementById("smooth-content");
      if (c) c.style.transform = "none";
    });
  }

  const file = `${OUT}/${name}${suffix}.png`;
  await page.screenshot({ path: file, fullPage: Boolean(preset.full) });
  console.log(`${file.padEnd(34)} ${gl}`);
  await page.close();
}

await browser.close();

if (errors.length) {
  console.log("\nconsole/page errors:");
  for (const e of [...new Set(errors)]) console.log("  " + e);
} else {
  console.log("\nno console errors");
}
