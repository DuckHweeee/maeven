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
  pdp:      { path: "/product/mv-sm-01",                  full: true },
  magazine: { path: "/magazine",                          full: true },
  article:  { path: "/article/vietnamese-linen-returns",  full: true },
  about:    { path: "/gioi-thieu",                        full: true },
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

const errors = [];
context.on("weberror", (e) => errors.push(String(e.error())));

for (const name of targets) {
  const preset = PRESETS[name];
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[${name}] ${m.text()}`);
  });

  await page.goto(BASE + preset.path, { waitUntil: "networkidle" });

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
