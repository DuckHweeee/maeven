#!/usr/bin/env node
/**
 * Fetch stock photos from Pexels or Unsplash into public/img/.
 *
 * Usage:
 *   node scripts/fetch-images.mjs                     # skip images that already exist
 *   node scripts/fetch-images.mjs --force             # re-download everything
 *   node scripts/fetch-images.mjs brand/ article/     # only matching path prefixes
 *   node scripts/fetch-images.mjs brand/hero.jpg --shortlist
 *   node scripts/fetch-images.mjs brand/hero.jpg --source=unsplash --force
 *
 * Requires PEXELS_API_KEY and/or UNSPLASH_ACCESS_KEY in the environment or in
 * .env.local — only the providers a run actually touches. Attribution is written
 * to src/lib/photo-credits.json; both licenses require the photographer be
 * credited and linked, so never hand-edit an entry to hide a source.
 *
 * Why --shortlist exists
 * ----------------------
 * Ratio-matching has no taste. Asking for "minimalist menswear portrait natural
 * light" and taking whatever sits closest to 0.8 returned a black-background
 * studio strobe portrait — for a brand that documents itself as natural-light.
 * The judging loop in .claude/agents/photo-scout.md was never able to run,
 * because the script committed before anyone could look.
 *
 * --shortlist fixes that. It downloads N candidates per slot into .image-review/
 * and writes an index, touching nothing in public/img. You (or photo-scout) open
 * the files, judge them, then pin the winner with `pick:` in the manifest. The
 * pin is what makes the choice reproducible — without it the next run drifts
 * with whatever the provider ranks highest that day.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Manifest — edit this to add/replace imagery, then re-run the script.
// ratio  = desired width / height. Without `pick`, the closest match wins.
// source = 'pexels' (default) | 'unsplash'.
// pick   = provider photo id. Set it and the search is skipped entirely — the
//          slot resolves to exactly that photo, run after run.
// ---------------------------------------------------------------------------
const MANIFEST = [
  { path: 'brand/hero.jpg',                query: 'linen shirt',                                orientation: 'portrait',  ratio: 0.8, source: 'unsplash', pick: 'lziP7ZPtghg' },
  { path: 'home/hero.jpg',                 query: 'linen fabric draped soft morning light',      orientation: 'landscape', ratio: 1.6 },

  { path: 'product/01-linen-shirt.jpg', query: 'beige linen shirt', orientation: 'portrait', ratio: 0.75, source: 'unsplash', pick: 'S4f4apZd-hA' },
  { path: 'product/02-straight-trousers.jpg', query: 'beige trousers', orientation: 'portrait', ratio: 0.75, source: 'unsplash', pick: 'MoWCAqcXZf0' },
  { path: 'product/03-collarless-jacket.jpg', query: 'linen jacket', orientation: 'portrait', ratio: 0.75, source: 'unsplash', pick: 'qX_i3s5QsXQ' },
  { path: 'product/04-crew-neck-tee.jpg', query: 'cotton t-shirt', orientation: 'portrait', ratio: 0.75, source: 'unsplash', pick: 'Az7co_KPQsE' },
  { path: 'product/01-a.jpg',              query: 'natural linen fabric weave undyed',          orientation: 'square',    ratio: 1.0, pick: '8967723' },
  { path: 'product/01-b.jpg',              query: 'white linen fabric soft folds',              orientation: 'square',    ratio: 1.0, pick: '36507130' },
  { path: 'product/01-c.jpg',              query: 'folded linen',                              orientation: 'square',    ratio: 1.0, source: 'unsplash', pick: 'porAZtNVkyk' },

  { path: 'product/02-a.jpg', query: 'grey linen', orientation: 'landscape', ratio: 1.0, source: 'unsplash', pick: 'FseXc3OsIic' },
  { path: 'product/02-b.jpg', query: 'trouser hem detail close up', orientation: 'square', ratio: 1.0 },
  { path: 'product/02-c.jpg', query: 'folded trousers neutral', orientation: 'square', ratio: 1.0 },
  { path: 'product/03-a.jpg', query: 'beige linen fabric', orientation: 'landscape', ratio: 1.0, source: 'unsplash', pick: 'xTaOPMa6wAE' },
  { path: 'product/03-b.jpg', query: 'linen detail', orientation: 'landscape', ratio: 1.0, source: 'unsplash', pick: 'BDJy8J3R4GY' },
  { path: 'product/03-c.jpg', query: 'jacket on wooden hanger', orientation: 'square', ratio: 1.0 },
  { path: 'product/04-a.jpg', query: 'cotton jersey knit texture', orientation: 'square', ratio: 1.0 },
  { path: 'product/04-b.jpg', query: 'white t-shirt', orientation: 'landscape', ratio: 1.0, source: 'unsplash', pick: '8ACmRoleM24' },

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

  { path: 'editorial/cap-saint-jacques.jpg', query: 'vung tau vietnam coast',                  orientation: 'landscape', ratio: 1.5, pick: '16775848' },
  { path: 'editorial/ao-den.jpg',          query: 'black shirt hanging hanger',                 orientation: 'landscape', ratio: 1.5, pick: '8532638' },
  { path: 'editorial/lanh-trong-nha.jpg',  query: 'air conditioner unit on wall indoors',       orientation: 'landscape', ratio: 1.5, pick: '27427771' },
];

const PER_PAGE = 5;            // candidates pulled per search
const THROTTLE_MS = 250;
const MAX_BYTES = 800 * 1024;  // prefer a smaller variant over blowing past this

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'public', 'img');
const CREDITS_FILE = path.join(ROOT, 'src', 'lib', 'photo-credits.json');
const REVIEW_DIR = path.join(ROOT, '.image-review');

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

async function downloadToBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status} ${res.statusText}) for ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Providers
//
// Each returns candidates in one normalised shape so the rest of the script
// never branches on provider:
//   { source, id, width, height, ratio, pageUrl, photographer, photographerUrl,
//     alt, previewUrl, download(budget) }
// ---------------------------------------------------------------------------

async function apiJson(url, headers, label) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`${label} failed (${res.status} ${res.statusText})`);
  }
  return res.json();
}

const pexels = {
  env: 'PEXELS_API_KEY',
  label: 'Pexels',

  headers: (key) => ({ Authorization: key }),

  async search(key, { query, orientation }, count) {
    const url =
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}` +
      `&orientation=${encodeURIComponent(orientation)}&per_page=${count}`;
    const data = await apiJson(url, this.headers(key), `Pexels search for "${query}"`);
    return (data.photos ?? []).map((p) => this.normalise(p));
  },

  async byId(key, id) {
    const data = await apiJson(
      `https://api.pexels.com/v1/photos/${encodeURIComponent(id)}`,
      this.headers(key),
      `Pexels lookup of photo ${id}`
    );
    return this.normalise(data);
  },

  normalise(p) {
    return {
      source: 'Pexels',
      id: String(p.id),
      width: p.width,
      height: p.height,
      ratio: p.width / p.height,
      pageUrl: p.url,
      photographer: p.photographer,
      photographerUrl: p.photographer_url,
      alt: p.alt || '',
      previewUrl: p.src?.medium || p.src?.large,
      async download() {
        const primary = p.src?.large2x || p.src?.large;
        const fallback = p.src?.large2x ? p.src?.large : null;
        if (!primary) throw new Error(`Photo ${p.id} exposes no large2x/large source`);

        let buffer = await downloadToBuffer(primary);
        let note = primary === p.src?.large2x ? 'large2x' : 'large';

        if (buffer.length > MAX_BYTES && fallback) {
          const smaller = await downloadToBuffer(fallback);
          if (smaller.length < buffer.length) {
            buffer = smaller;
            note = 'large';
          }
        }
        return { buffer, note };
      },
    };
  },
};

// Unsplash orientation vocabulary differs from Pexels: squarish, not square.
const UNSPLASH_ORIENTATION = { portrait: 'portrait', landscape: 'landscape', square: 'squarish' };

// raw URLs accept Imgix params, so we can ask for an exact width instead of
// taking whatever preset lands closest — which is how we stay under MAX_BYTES.
const unsplashSrc = (raw, w, q) =>
  `${raw}${raw.includes('?') ? '&' : '?'}fm=jpg&fit=max&w=${w}&q=${q}`;

const unsplash = {
  env: 'UNSPLASH_ACCESS_KEY',
  label: 'Unsplash',

  headers: (key) => ({ Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' }),

  async search(key, { query, orientation }, count) {
    const mapped = UNSPLASH_ORIENTATION[orientation];
    if (!mapped) throw new Error(`Unsupported orientation "${orientation}" for Unsplash`);
    const url =
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}` +
      `&orientation=${mapped}&per_page=${count}&content_filter=high`;
    const data = await apiJson(url, this.headers(key), `Unsplash search for "${query}"`);
    return (data.results ?? []).map((p) => this.normalise(p, key));
  },

  async byId(key, id) {
    const data = await apiJson(
      `https://api.unsplash.com/photos/${encodeURIComponent(id)}`,
      this.headers(key),
      `Unsplash lookup of photo ${id}`
    );
    return this.normalise(data, key);
  },

  normalise(p, key) {
    const raw = p.urls?.raw;
    const targetW = p.width >= p.height ? 1600 : 1200;
    return {
      source: 'Unsplash',
      id: p.id,
      width: p.width,
      height: p.height,
      ratio: p.width / p.height,
      pageUrl: p.links?.html,
      photographer: p.user?.name,
      photographerUrl: p.user?.links?.html,
      alt: p.alt_description || p.description || '',
      previewUrl: p.urls?.small,
      async download() {
        if (!raw) throw new Error(`Photo ${p.id} exposes no raw source`);

        let buffer = await downloadToBuffer(unsplashSrc(raw, targetW, 80));
        let note = `w${targetW} q80`;

        if (buffer.length > MAX_BYTES) {
          const smallerW = Math.round(targetW * 0.75);
          const smaller = await downloadToBuffer(unsplashSrc(raw, smallerW, 72));
          if (smaller.length < buffer.length) {
            buffer = smaller;
            note = `w${smallerW} q72`;
          }
        }

        // Unsplash API guideline: pings the photographer's download counter.
        // Best-effort — a failure here must not lose us the image.
        const loc = p.links?.download_location;
        if (loc) {
          try {
            await fetch(loc, { headers: unsplash.headers(key) });
          } catch {
            /* counter only */
          }
        }
        return { buffer, note };
      },
    };
  },
};

const PROVIDERS = { pexels, unsplash };

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/** Closest aspect ratio wins; ties resolve to the earlier (better-ranked) photo. */
function pickClosest(candidates, targetRatio) {
  let best = null;
  let bestDelta = Infinity;
  for (const c of candidates) {
    if (!c.width || !c.height) continue;
    const delta = Math.abs(c.ratio - targetRatio);
    if (delta < bestDelta) {
      best = c;
      bestDelta = delta;
    }
  }
  return best ? { candidate: best, delta: bestDelta } : null;
}

/** Resolve one manifest row to a single candidate, honouring `pick` when set. */
async function resolve(provider, key, entry, count) {
  if (entry.pick) {
    const candidate = await provider.byId(key, entry.pick);
    return { candidate, delta: Math.abs(candidate.ratio - entry.ratio), pinned: true };
  }
  const candidates = await provider.search(key, entry, count);
  if (!candidates.length) {
    throw new Error(`no results for "${entry.query}" (${entry.orientation})`);
  }
  const match = pickClosest(candidates, entry.ratio);
  if (!match) throw new Error(`no usable result for "${entry.query}"`);
  return { ...match, pinned: false };
}

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

/** Reads existing credits, migrating the old Pexels-only `pexelsUrl` shape. */
function loadCredits() {
  if (!fs.existsSync(CREDITS_FILE)) return {};
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(CREDITS_FILE, 'utf8'));
  } catch {
    console.warn('! photo-credits.json was unreadable; starting a fresh one.');
    return {};
  }
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    out[key] =
      value && value.pexelsUrl && !value.sourceUrl
        ? {
            photographer: value.photographer,
            photographerUrl: value.photographerUrl,
            source: 'Pexels',
            sourceUrl: value.pexelsUrl,
            alt: value.alt,
          }
        : value;
  }
  return out;
}

function writeCredits(credits) {
  fs.mkdirSync(path.dirname(CREDITS_FILE), { recursive: true });
  const ordered = Object.fromEntries(
    Object.keys(credits)
      .sort()
      .map((k) => [k, credits[k]])
  );
  fs.writeFileSync(CREDITS_FILE, `${JSON.stringify(ordered, null, 2)}\n`);
  return Object.keys(ordered).length;
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

/** Review directory name for a slot: 'product/01-x.jpg' -> 'product__01-x'. */
const slotDirName = (p) => p.replace(/\.[a-z0-9]+$/i, '').replace(/\//g, '__');

/**
 * Download candidates for review without touching public/img.
 *
 * The point is that someone looks at these before anything ships. Open the files
 * with an image viewer (or the Read tool, if photo-scout is driving), judge them
 * against the brand's light/colour/subject rules, then copy the printed manifest
 * line for the winner.
 */
async function runShortlist(entries, resolveProvider, count) {
  fs.mkdirSync(REVIEW_DIR, { recursive: true });

  // Clear only the slots this run refreshes. Wiping the whole directory would
  // throw away candidates from an earlier run you have not finished judging.
  for (const entry of entries) {
    fs.rmSync(path.join(REVIEW_DIR, slotDirName(entry.path)), { recursive: true, force: true });
  }

  const indexFile = path.join(REVIEW_DIR, 'index.json');
  let index = {};
  if (fs.existsSync(indexFile)) {
    try {
      index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    } catch {
      /* rebuild from scratch */
    }
  }
  const failures = [];
  let firstCall = true;

  for (const entry of entries) {
    const { provider, key, name } = resolveProvider(entry);
    const slotDir = path.join(REVIEW_DIR, slotDirName(entry.path));

    try {
      if (!firstCall) await sleep(THROTTLE_MS);
      firstCall = false;

      const candidates = await provider.search(key, entry, count);
      if (!candidates.length) {
        throw new Error(`no results for "${entry.query}" (${entry.orientation})`);
      }

      fs.mkdirSync(slotDir, { recursive: true });
      console.log(`\n${entry.path}  ·  ${name}  ·  "${entry.query}"  (want ${entry.ratio})`);

      const rows = [];
      for (const [i, c] of candidates.entries()) {
        const file = path.join(slotDir, `${String(i + 1).padStart(2, '0')}-${c.id}.jpg`);
        try {
          fs.writeFileSync(file, await downloadToBuffer(c.previewUrl));
        } catch (err) {
          console.error(`  preview ${c.id} failed: ${err.message}`);
          continue;
        }
        rows.push({
          id: c.id,
          ratio: Number(c.ratio.toFixed(2)),
          photographer: c.photographer,
          alt: c.alt,
          pageUrl: c.pageUrl,
          preview: path.relative(ROOT, file),
        });
        console.log(
          `  ${String(i + 1).padStart(2)}. ${c.id.padEnd(14)} ar ${c.ratio.toFixed(2).padStart(5)}  ` +
            `${(c.photographer || '?').padEnd(22)} ${(c.alt || '').slice(0, 52)}`
        );
        console.log(`      ${path.relative(ROOT, file)}`);
      }

      index[entry.path] = { source: name, query: entry.query, ratio: entry.ratio, candidates: rows };
      console.log(
        `  -> pin the winner:  { path: '${entry.path}', query: '${entry.query}', ` +
          `orientation: '${entry.orientation}', ratio: ${entry.ratio}, ` +
          `source: '${name.toLowerCase()}', pick: '<id>' },`
      );
    } catch (err) {
      failures.push(`${entry.path}: ${err.message}`);
      console.error(`FAIL     ${entry.path}: ${err.message}`);
    }
  }

  fs.writeFileSync(indexFile, `${JSON.stringify(index, null, 2)}\n`);

  console.log(
    `\nCandidates in ${path.relative(ROOT, REVIEW_DIR)}/ — nothing was written to public/img.` +
      `\nLook at them, then set \`pick:\` in the manifest and re-run with --force.`
  );

  if (failures.length) {
    console.error('\nFailures:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
}

async function runInstall(entries, resolveProvider, force, count) {
  const credits = loadCredits();
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
      const { provider, key, name } = resolveProvider(entry);

      if (!firstCall) await sleep(THROTTLE_MS);
      firstCall = false;

      const { candidate, delta, pinned } = await resolve(provider, key, entry, count);

      if (!pinned && delta > 0.35) {
        warnings.push(
          `${entry.path}: best aspect ratio ${candidate.ratio.toFixed(2)} vs requested ${entry.ratio} (query: "${entry.query}")`
        );
      }
      if (!pinned) {
        warnings.push(`${entry.path}: chosen by ratio alone — no \`pick\`, so nobody looked at it.`);
      }

      const { buffer, note } = await candidate.download();
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buffer);

      credits[publicPath] = {
        photographer: candidate.photographer,
        photographerUrl: candidate.photographerUrl,
        source: candidate.source,
        sourceUrl: candidate.pageUrl,
        alt: candidate.alt || entry.query,
      };

      downloaded += 1;
      console.log(
        `ok       ${entry.path.padEnd(30)} ${fmtBytes(buffer.length).padStart(8)}  ` +
          `${note.padEnd(9)} ar ${candidate.ratio.toFixed(2)} (want ${entry.ratio})  ` +
          `${pinned ? 'pinned' : 'by-ratio'}  ${name} © ${candidate.photographer}`
      );
    } catch (err) {
      failures.push(`${entry.path}: ${err.message}`);
      console.error(`FAIL     ${entry.path.padEnd(30)} ${err.message}`);
    }
  }

  const count2 = writeCredits(credits);
  console.log(
    `\n${downloaded} downloaded, ${skipped} skipped, ${failures.length} failed. ` +
      `Credits: ${path.relative(ROOT, CREDITS_FILE)} (${count2} entries).`
  );

  if (warnings.length) {
    console.log('\nWarnings:');
    for (const w of warnings) console.log(`  - ${w}`);
  }

  if (failures.length) {
    console.error('\nFailures:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  loadEnvLocal();

  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const shortlist = args.includes('--shortlist');

  const sourceArg = args.find((a) => a.startsWith('--source='))?.split('=')[1];
  if (sourceArg && !PROVIDERS[sourceArg]) {
    console.error(`Unknown --source "${sourceArg}". Use one of: ${Object.keys(PROVIDERS).join(', ')}.`);
    process.exit(1);
  }

  const countArg = args.find((a) => a.startsWith('--count='))?.split('=')[1];
  const count = Math.min(Math.max(Number(countArg) || PER_PAGE, 1), 30);

  const filters = args.filter((a) => !a.startsWith('--'));
  const entries = filters.length
    ? MANIFEST.filter((e) => filters.some((f) => e.path.startsWith(f)))
    : MANIFEST;

  if (!entries.length) {
    console.error('No manifest entries matched the given filters.');
    process.exit(1);
  }

  // Resolve provider + key per entry, and fail early with one clear message if a
  // key is missing, rather than midway through a run.
  const missing = new Set();
  const resolveProvider = (entry) => {
    const nameKey = sourceArg || entry.source || 'pexels';
    const provider = PROVIDERS[nameKey];
    const key = process.env[provider.env];
    if (!key) missing.add(provider.env);
    return { provider, key, name: provider.label };
  };
  for (const entry of entries) resolveProvider(entry);
  if (missing.size) {
    console.error(
      `Missing API key(s): ${[...missing].join(', ')}. Add them to .env.local or the environment.`
    );
    process.exit(1);
  }

  if (shortlist) {
    await runShortlist(entries, resolveProvider, count);
    return;
  }
  await runInstall(entries, resolveProvider, force, count);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
