#!/usr/bin/env node
/**
 * Fetch stock photos from the Pexels API into public/img/.
 *
 * Usage:
 *   node scripts/fetch-images.mjs           # skip images that already exist
 *   node scripts/fetch-images.mjs --force   # re-download everything
 *   node scripts/fetch-images.mjs brand/hero.jpg article/  # only matching paths
 *
 * Requires PEXELS_API_KEY in the environment or in .env.local.
 * Writes attribution data to src/lib/photo-credits.json (required by the
 * Pexels license: photographer must be credited and linked).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Manifest — edit this to add/replace imagery, then re-run the script.
// ratio = desired width / height. The closest-matching search result wins.
// ---------------------------------------------------------------------------
const MANIFEST = [
  { path: 'brand/hero.jpg',                query: 'minimalist menswear portrait natural light', orientation: 'portrait',  ratio: 0.8 },
  { path: 'home/hero.jpg',                 query: 'linen fabric draped soft morning light',      orientation: 'landscape', ratio: 1.6 },

  { path: 'product/01-somi-lanh.jpg',      query: 'man linen shirt',                            orientation: 'portrait',  ratio: 0.75 },
  { path: 'product/02-quan-ong-suong.jpg', query: 'men trousers fashion minimal',               orientation: 'portrait',  ratio: 0.75 },
  { path: 'product/03-ao-khoac.jpg',       query: 'men unstructured jacket neutral',            orientation: 'portrait',  ratio: 0.75 },
  { path: 'product/04-ao-thun.jpg',        query: 'men plain t-shirt neutral',                  orientation: 'portrait',  ratio: 0.75 },
  { path: 'product/01-a.jpg',              query: 'linen fabric texture close up',              orientation: 'square',    ratio: 1.0 },
  { path: 'product/01-b.jpg',              query: 'shirt button detail close up',               orientation: 'square',    ratio: 1.0 },
  { path: 'product/01-c.jpg',              query: 'folded linen clothing stack',                orientation: 'square',    ratio: 1.0 },

  { path: 'product/02-a.jpg',              query: 'trousers fabric texture close up',           orientation: 'square',    ratio: 1.0 },
  { path: 'product/02-b.jpg',              query: 'trouser hem detail close up',                orientation: 'square',    ratio: 1.0 },
  { path: 'product/02-c.jpg',              query: 'folded trousers neutral',                    orientation: 'square',    ratio: 1.0 },
  { path: 'product/03-a.jpg',              query: 'hemp linen weave texture',                   orientation: 'square',    ratio: 1.0 },
  { path: 'product/03-b.jpg',              query: 'jacket pocket stitching detail',             orientation: 'square',    ratio: 1.0 },
  { path: 'product/03-c.jpg',              query: 'jacket on wooden hanger',                    orientation: 'square',    ratio: 1.0 },
  { path: 'product/04-a.jpg',              query: 'cotton jersey knit texture',                 orientation: 'square',    ratio: 1.0 },
  { path: 'product/04-b.jpg',              query: 'crew neck collar detail',                    orientation: 'square',    ratio: 1.0 },
  { path: 'product/04-c.jpg',              query: 'folded t-shirts stack neutral',              orientation: 'square',    ratio: 1.0 },

  // MAEVEN by you — customer photo wall. Queries deliberately favour garment
  // detail, crops and back views over identifiable portraits.
  { path: 'ugc/01.jpg',                    query: 'linen shirt rolled sleeve detail',           orientation: 'portrait',  ratio: 0.8 },
  { path: 'ugc/02.jpg',                    query: 'person walking away neutral clothing',       orientation: 'portrait',  ratio: 0.75 },
  { path: 'ugc/03.jpg',                    query: 'neutral outfit flat lay clothes',            orientation: 'square',    ratio: 1.0 },
  { path: 'ugc/04.jpg',                    query: 'shirt collar detail close up linen',         orientation: 'square',    ratio: 1.0 },
  { path: 'ugc/05.jpg',                    query: 'trouser hem shoes pavement',                 orientation: 'portrait',  ratio: 0.8 },
  { path: 'ugc/06.jpg',                    query: 'jacket pocket hands detail',                 orientation: 'portrait',  ratio: 0.75 },
  { path: 'ugc/07.jpg',                    query: 'clothes hanging rail home daylight',         orientation: 'square',    ratio: 1.0 },
  { path: 'ugc/08.jpg',                    query: 'linen sleeve coffee table cafe',             orientation: 'landscape', ratio: 1.33 },
  { path: 'ugc/09.jpg',                    query: 'white cotton t-shirt fabric detail',         orientation: 'portrait',  ratio: 0.8 },

  { path: 'article/hero.jpg',              query: 'textile weaving loom workshop',              orientation: 'landscape', ratio: 1.78 },
  { path: 'article/loom-close.jpg',        query: 'weaving loom threads close up',              orientation: 'landscape', ratio: 1.33 },
  { path: 'article/drying.jpg',            query: 'fabric drying outdoors textile',             orientation: 'landscape', ratio: 1.33 },

  { path: 'editorial/lanh-nam-dinh.jpg',   query: 'traditional textile weaving factory',        orientation: 'landscape', ratio: 1.5 },
  { path: 'editorial/so-mi-mot-tuan.jpg',  query: 'man linen shirt street style',               orientation: 'landscape', ratio: 1.5 },
  { path: 'editorial/hoi-an.jpg',          query: 'hoi an vietnam old town',                    orientation: 'landscape', ratio: 1.5 },
  { path: 'editorial/grooming.jpg',        query: 'minimal skincare products flat lay',         orientation: 'landscape', ratio: 1.5 },
  { path: 'editorial/dong-ho.jpg',         query: 'wristwatch close up leather strap',          orientation: 'landscape', ratio: 1.5 },
  { path: 'editorial/cotton.jpg',          query: 'cotton plant field',                         orientation: 'landscape', ratio: 1.5 },
  { path: 'editorial/bang-mau.jpg',        query: 'neutral beige clothing rack',                orientation: 'landscape', ratio: 1.5 },
  { path: 'editorial/tho-may.jpg',         query: 'tailor sewing machine workshop',             orientation: 'landscape', ratio: 1.5 },
];

const PER_PAGE = 5;
const THROTTLE_MS = 250;
const MAX_BYTES = 800 * 1024; // prefer a smaller Pexels size over blowing past this

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'public', 'img');
const CREDITS_FILE = path.join(ROOT, 'src', 'lib', 'photo-credits.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal .env.local reader so the script runs outside the Next.js runtime. */
function loadEnvLocal() {
  const file = path.join(ROOT, '.env.local');
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fmtBytes = (n) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${Math.round(n / 1024)} KB`;

/** Closest aspect ratio wins; ties resolve to the earlier (better-ranked) photo. */
function pickClosest(photos, targetRatio) {
  let best = null;
  let bestDelta = Infinity;
  for (const photo of photos) {
    if (!photo.width || !photo.height) continue;
    const delta = Math.abs(photo.width / photo.height - targetRatio);
    if (delta < bestDelta) {
      best = photo;
      bestDelta = delta;
    }
  }
  return best ? { photo: best, delta: bestDelta } : null;
}

async function searchPexels(apiKey, query, orientation) {
  const url =
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}` +
    `&orientation=${encodeURIComponent(orientation)}&per_page=${PER_PAGE}`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });
  if (!res.ok) {
    throw new Error(`Pexels search failed (${res.status} ${res.statusText}) for "${query}"`);
  }
  return res.json();
}

async function downloadToBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status} ${res.statusText}) for ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Download large2x, falling back to large — both when large2x is missing and
 * when it exceeds the size budget and a smaller variant is available.
 */
async function downloadPhoto(photo) {
  const primary = photo.src?.large2x || photo.src?.large;
  const fallback = photo.src?.large2x ? photo.src?.large : null;
  if (!primary) throw new Error(`Photo ${photo.id} exposes no large2x/large source`);

  let buffer = await downloadToBuffer(primary);
  let usedSize = photo.src?.large2x && primary === photo.src.large2x ? 'large2x' : 'large';

  if (buffer.length > MAX_BYTES && fallback) {
    const smaller = await downloadToBuffer(fallback);
    if (smaller.length < buffer.length) {
      buffer = smaller;
      usedSize = 'large';
    }
  }
  return { buffer, usedSize };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  loadEnvLocal();

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error('PEXELS_API_KEY is not set. Add it to .env.local or the environment.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const filters = args.filter((a) => !a.startsWith('--'));
  const entries = filters.length
    ? MANIFEST.filter((e) => filters.some((f) => e.path.startsWith(f)))
    : MANIFEST;

  if (!entries.length) {
    console.error('No manifest entries matched the given filters.');
    process.exit(1);
  }

  // Merge into existing credits so a partial run never drops attribution.
  let credits = {};
  if (fs.existsSync(CREDITS_FILE)) {
    try {
      credits = JSON.parse(fs.readFileSync(CREDITS_FILE, 'utf8'));
    } catch {
      console.warn('! photo-credits.json was unreadable; starting a fresh one.');
    }
  }

  const failures = [];
  const warnings = [];
  let downloaded = 0;
  let skipped = 0;
  let firstCall = true;

  for (const entry of entries) {
    const target = path.join(IMG_DIR, entry.path);
    const publicPath = `/img/${entry.path}`;

    if (!force && fs.existsSync(target)) {
      const { size } = fs.statSync(target);
      console.log(`skip     ${entry.path.padEnd(30)} exists (${fmtBytes(size)})`);
      skipped += 1;
      continue;
    }

    try {
      if (!firstCall) await sleep(THROTTLE_MS);
      firstCall = false;

      const data = await searchPexels(apiKey, entry.query, entry.orientation);
      const photos = data.photos ?? [];
      if (!photos.length) {
        throw new Error(`no results for "${entry.query}" (${entry.orientation})`);
      }

      const match = pickClosest(photos, entry.ratio);
      if (!match) throw new Error(`no usable result for "${entry.query}"`);

      const { photo, delta } = match;
      if (delta > 0.35) {
        warnings.push(
          `${entry.path}: best aspect ratio ${(photo.width / photo.height).toFixed(2)} vs requested ${entry.ratio} (query: "${entry.query}")`
        );
      }

      const { buffer, usedSize } = await downloadPhoto(photo);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buffer);

      credits[publicPath] = {
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        pexelsUrl: photo.url,
        alt: photo.alt || entry.query,
      };

      downloaded += 1;
      const ar = (photo.width / photo.height).toFixed(2);
      console.log(
        `ok       ${entry.path.padEnd(30)} ${fmtBytes(buffer.length).padStart(8)}  ` +
          `${usedSize.padEnd(7)} ar ${ar} (want ${entry.ratio})  © ${photo.photographer}`
      );
    } catch (err) {
      failures.push(`${entry.path}: ${err.message}`);
      console.error(`FAIL     ${entry.path.padEnd(30)} ${err.message}`);
    }
  }

  fs.mkdirSync(path.dirname(CREDITS_FILE), { recursive: true });
  const ordered = Object.fromEntries(Object.keys(credits).sort().map((k) => [k, credits[k]]));
  fs.writeFileSync(CREDITS_FILE, `${JSON.stringify(ordered, null, 2)}\n`);

  console.log(
    `\n${downloaded} downloaded, ${skipped} skipped, ${failures.length} failed. ` +
      `Credits: ${path.relative(ROOT, CREDITS_FILE)} (${Object.keys(ordered).length} entries).`
  );

  if (warnings.length) {
    console.log('\nLoose aspect-ratio matches (consider re-querying):');
    for (const w of warnings) console.log(`  - ${w}`);
  }

  if (failures.length) {
    console.error('\nFailures:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
