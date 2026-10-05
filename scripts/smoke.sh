#!/usr/bin/env bash
# Smoke-test a deployed MAEVEN site (infra/DESIGN.md section 8).
#
#   ./scripts/smoke.sh https://staging.maeven.vn
#   SMOKE_EXPECT_NOINDEX=1 ./scripts/smoke.sh https://staging.maeven.vn
#   SMOKE_EXPECT_WWW=1     ./scripts/smoke.sh https://maeven.vn
#
# Flags (environment):
#   SMOKE_EXPECT_NOINDEX=1  x-robots-tag must be present (staging). When unset it
#                           must be absent (prod).
#   SMOKE_EXPECT_WWW=1      https://www.<host> must 301 to the apex (prod).
#   SMOKE_404_MARKER        text that identifies out/404.html in the body
#                           (default: "This page could not be found").
#
# Needs only bash, curl, grep and sed, so it runs on a CI runner and on macOS.
# Prints PASS or FAIL per check, runs every check, and exits 1 if any failed.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ $# -ne 1 || "$1" != http*://* ]]; then
  echo "usage: $0 <base_url>   e.g. https://staging.maeven.vn" >&2
  exit 2
fi

BASE="${1%/}"
HOST="${BASE#*://}"      # host[:port], no scheme
HOST="${HOST%%/*}"
EXPECT_NOINDEX="${SMOKE_EXPECT_NOINDEX:-0}"
EXPECT_WWW="${SMOKE_EXPECT_WWW:-0}"
MARKER_404="${SMOKE_404_MARKER:-This page could not be found}"
CURL=(curl -sS --max-time 20 --retry 2 --retry-delay 2)

FAILURES=0
pass() { echo "PASS $1"; }
fail() {
  if [[ -n "${2:-}" ]]; then echo "FAIL $1 ($2)"; else echo "FAIL $1"; fi
  FAILURES=$((FAILURES + 1))
}

# status <url>  -> HTTP status code, 000 when the request itself failed.
status() {
  local code
  code="$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$1" 2>/dev/null || true)"
  echo "${code:0:3}"
}

# headers <url> -> response headers, CR stripped, empty when the request failed.
headers() { "${CURL[@]}" -o /dev/null -D - "$1" 2>/dev/null | tr -d '\r' || true; }

# header_value <headers> <name> -> value of the first matching header, if any.
header_value() {
  printf '%s\n' "$1" | grep -i "^$2:" | head -n 1 | sed 's/^[^:]*:[[:space:]]*//' || true
}

# first_in_out <dir> -> name (without .html) of the first page in out/<dir>/, if any.
first_in_out() {
  local f
  f="$(find "out/$1" -maxdepth 1 -name '*.html' 2>/dev/null | sort | head -n 1 || true)"
  [[ -n "$f" ]] || return 0
  f="${f##*/}"
  echo "${f%.html}"
}

# Pick one product SKU and one article slug: from out/ when a build is present
# (CI), otherwise from the typed content in src/lib/data.ts.
SKU="$(first_in_out product)"
if [[ -z "$SKU" ]]; then
  SKU="$(sed -nE 's/^[[:space:]]*sku: "([^"]+)".*/\1/p' src/lib/data.ts | head -n 1 || true)"
fi
SLUG="$(first_in_out article)"
if [[ -z "$SLUG" ]]; then
  SLUG="$(sed -nE 's/^[[:space:]]*slug: "([^"]+)".*/\1/p' src/lib/data.ts | head -n 1 || true)"
fi

echo "Smoke test: ${BASE}  (noindex=${EXPECT_NOINDEX} www=${EXPECT_WWW} sku=${SKU:-?} slug=${SLUG:-?})"

# 1. Pages that must return 200.
routes=(/ /magazine /product /about-us /credits)
if [[ -n "$SKU" ]]; then routes+=("/product/${SKU}"); else fail "1 200 /product/<sku>" "no SKU found"; fi
if [[ -n "$SLUG" ]]; then routes+=("/article/${SLUG}"); else fail "1 200 /article/<slug>" "no slug found"; fi
for path in "${routes[@]}"; do
  code="$(status "${BASE}${path}")"
  if [[ "$code" == "200" ]]; then pass "1 200 ${path}"; else fail "1 200 ${path}" "got ${code}"; fi
done

# 2. A missing page is a real 404 and serves 404.html.
missing="/khong-ton-tai-${RANDOM}${RANDOM}"
body404="$("${CURL[@]}" -w '\n%{http_code}' "${BASE}${missing}" 2>/dev/null || true)"
code404="${body404##*$'\n'}"
if [[ "$code404" != "404" ]]; then
  fail "2 404 ${missing}" "got ${code404:-no response}"
elif ! printf '%s' "$body404" | grep -q -F "$MARKER_404"; then
  fail "2 404 body" "missing '${MARKER_404}'"
else
  pass "2 404 ${missing} serves 404.html"
fi

# 3. Plain http redirects to https with a 301.
h3="$(headers "http://${HOST}/")"
code3="$(printf '%s\n' "$h3" | sed -nE '1s/^HTTP\/[0-9.]+ ([0-9]+).*/\1/p')"
loc3="$(header_value "$h3" location)"
if [[ "$code3" == "301" && "$loc3" == https://* ]]; then
  pass "3 http -> https 301"
else
  fail "3 http -> https 301" "got ${code3:-no response} location=${loc3:-none}"
fi

# 4. www redirects to the apex, keeping path and query string. The space is
#    percent-encoded on purpose: a redirect that decodes or re-encodes the query
#    string (q=a b, q=a+b, q=a%2520b) is a bug, so Location must carry q=a%20b
#    byte for byte. curl sends the URL as written, it does not decode it.
if [[ "$EXPECT_WWW" == "1" ]]; then
  h4="$(headers "https://www.${HOST}/magazine?q=a%20b")"
  code4="$(printf '%s\n' "$h4" | sed -nE '1s/^HTTP\/[0-9.]+ ([0-9]+).*/\1/p')"
  loc4="$(header_value "$h4" location)"
  if [[ "$code4" == "301" && "$loc4" == "https://${HOST}/magazine"* && "$loc4" == *"q=a%20b"* ]]; then
    pass "4 www -> apex 301 keeps q=a%20b"
  else
    fail "4 www -> apex 301 keeps q=a%20b" "got ${code4:-no response} location=${loc4:-none}"
  fi
else
  echo "SKIP 4 www -> apex 301 (SMOKE_EXPECT_WWW not set)"
fi

# Headers of the home page feed checks 5, 6 and 7.
hhome="$(headers "${BASE}/")"

# 5. HSTS.
if [[ -n "$(header_value "$hhome" strict-transport-security)" ]]; then
  pass "5 strict-transport-security present"
else
  fail "5 strict-transport-security present"
fi

# 6. x-robots-tag present on staging, absent elsewhere.
robots="$(header_value "$hhome" x-robots-tag)"
if [[ "$EXPECT_NOINDEX" == "1" ]]; then
  if [[ -n "$robots" ]]; then pass "6 x-robots-tag present"; else fail "6 x-robots-tag present" "header missing"; fi
else
  if [[ -z "$robots" ]]; then pass "6 x-robots-tag absent"; else fail "6 x-robots-tag absent" "got '${robots}'"; fi
fi

# 7. Cache-Control: hashed assets are immutable, HTML always revalidates.
homebody="$("${CURL[@]}" "${BASE}/" 2>/dev/null || true)"
asset="$(printf '%s' "$homebody" | grep -oE '/_next/static/[A-Za-z0-9_./~-]+\.(js|css)' | head -n 1 || true)"
if [[ -z "$asset" ]]; then
  fail "7 cache-control /_next/static" "no asset URL found in /"
else
  cc_asset="$(header_value "$(headers "${BASE}${asset}")" cache-control)"
  if [[ "$cc_asset" == *immutable* ]]; then
    pass "7 cache-control immutable on ${asset}"
  else
    fail "7 cache-control immutable on ${asset}" "got '${cc_asset:-none}'"
  fi
fi
cc_html="$(header_value "$hhome" cache-control)"
if [[ "$cc_html" == *max-age=0* ]]; then
  pass "7 cache-control max-age=0 on /"
else
  fail "7 cache-control max-age=0 on /" "got '${cc_html:-none}'"
fi

# 8. Canonical points at this site, proving NEXT_PUBLIC_SITE_URL reached the build.
canonical="$(printf '%s' "$homebody" | grep -oE '<link rel="canonical" href="[^"]*"' | head -n 1 | sed -E 's/.*href="([^"]*)"/\1/' || true)"
if [[ "$canonical" == "$BASE" || "$canonical" == "${BASE}/" ]]; then
  pass "8 canonical ${canonical}"
else
  fail "8 canonical ${BASE}" "got '${canonical:-none}'"
fi

if [[ "$FAILURES" -gt 0 ]]; then
  echo "${FAILURES} check(s) failed."
  exit 1
fi
echo "All checks passed."
