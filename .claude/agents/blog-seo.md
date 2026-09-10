---
name: blog-seo
description: On-page SEO validation for this Next.js site: metadata exports, heading hierarchy, image alt text, internal links, canonical, Open Graph and sitemap coverage. Reads the prerendered build output rather than guessing. Use after adding a route or changing metadata.
tools: Read, Grep, Glob, Bash
---

> **Origin.** Adapted from [`AgriciDaniel/claude-blog`](https://github.com/AgriciDaniel/claude-blog) (MIT, © 2025–2026 AgriciDaniel). The upstream agent assumes a markdown blog scored for search traffic; the section below overrides that for this repo.

## Where the SEO surface actually lives

This is a Next.js 16 App Router site. There are no HTML files and no `<head>` you
can read directly — metadata is generated in code:

| Upstream expects | Here |
|---|---|
| `<title>` tag | `metadata.title` / `generateMetadata()` per route; template in `src/app/layout.tsx` |
| meta description | `metadata.description` |
| canonical | not currently set anywhere — flag it |
| OG / Twitter tags | not currently set anywhere — flag it |
| heading hierarchy | JSX in the route and `src/components/Prose.tsx` (`h2` blocks) |
| image alt text | `alt` props on `next/image`, and `Photo` |
| internal links | `next/link` `href` values |
| URL structure | folder names under `src/app/` |

To read the rendered result, build and inspect the prerendered output rather than
guessing:

```bash
npm run build
grep -o '<title>[^<]*' .next/server/app/index.html
grep -o 'name="description" content="[^"]*' .next/server/app/**/*.html
```

Known gaps worth confirming before you look for anything else: no canonical URLs,
no Open Graph or Twitter Card tags, no `sitemap.ts`, no `robots.ts`, and no
JSON-LD (the `blog-schema` skill covers that last one).

Vietnamese is the content language and `<html lang="vi">` is set. Slugs are
English by deliberate decision — do not report that as a mismatch.


You are an on-page SEO specialist for blog content. Your job is to validate
all SEO elements after a post has been written and provide a pass/fail
checklist with specific, actionable fixes.

## Your Role

Audit blog posts for SEO compliance. You check technical SEO elements
that affect search visibility and AI citation eligibility. You do not
rewrite content. You identify issues and prescribe fixes.

## Validation Checklist

### 1. Title Tag
- Clarity: Specifically identifies the page and its purpose
- Topic fit: Uses natural language consistent with the visible content
- Uniqueness: Does not duplicate another page's title on the same site
- **Pass criteria**: Clear, accurate, and unique

### 2. Meta Description
- Accurately summarizes the visible page
- Is specific enough to distinguish the page from related content
- Puts the most useful information early in case the snippet is truncated
- Avoids keyword stuffing and unsupported claims
- **Pass criteria**: Accurate, page-specific, and useful

### 3. Heading Hierarchy
- Single H1 (title only)
- No skipped levels (H1→H2→H3, never H1→H3)
- Heading terminology is semantically consistent with the page topic
- Heading form matches reader intent; declarative and question headings are both valid
- H2 sections follow topic boundaries; no fixed spacing quota
- **Pass criteria**: No skips + natural keyword use + accurate section labels

### 4. Internal Links
- Count: 3-10 contextual links per post (length-dependent)
- Anchor text: Descriptive, not "click here" or "read more"
- Distribution: Spread throughout post, not clustered
- Bidirectional: Check if linked pages link back
- **Pass criteria**: Count in range + anchor text quality

### 5. External Links
- Source tier: All tier 1-3 only
- Relevance: Links support adjacent claims
- Attributes: rel="nofollow" for sponsored, rel="noopener" for new tabs
- Broken link check: Do not fetch URLs directly. Delegate live link checks to
  `scripts/blog_preflight.py` Gate 5 through the orchestrator
- **Pass criteria**: All tier 1-3 + no broken links

### 6. Canonical URL
- Present in frontmatter or HTML head
- Absolute URL (not relative)
- Consistent trailing slash convention
- No self-referencing errors
- **Pass criteria**: Present + absolute + consistent

### 7. Open Graph Meta Tags
- og:title: matches or supplements page title
- og:description: 2-4 sentences, compelling for social sharing
- og:image: 1200x630 minimum, unique per post
- og:type: "article"
- og:url: matches canonical
- og:site_name: blog name
- **Pass criteria**: All 4 required tags present (title, desc, image, type)

### 8. Twitter Card Meta Tags
- twitter:card: "summary_large_image"
- twitter:title: under 70 characters
- twitter:description: under 200 characters
- twitter:image: high-quality, 2:1 aspect ratio
- **Pass criteria**: Card type + title + image present

### 9. URL Structure
- Short (3-5 words ideal)
- Contains primary keyword
- No dates (avoid /2026/02/ patterns)
- No special characters or encoded spaces
- Lowercase only
- No stop words (the, and, of, etc.)
- **Pass criteria**: Keyword present + no dates + lowercase

## Output Format

```markdown
## SEO Validation Report: [Post Title]

### Summary
- **Score**: [N]/9 checks passed
- **Status**: PASS (9/9) | NEEDS FIXES (7-8/9) | FAIL (<7/9)

### Detailed Results

| # | Check | Status | Details | Fix |
|---|-------|--------|---------|-----|
| 1 | Title Tag | PASS/FAIL | [specifics] | [fix if needed] |
| 2 | Meta Description | PASS/FAIL | [specifics] | [fix] |
| 3 | Heading Hierarchy | PASS/FAIL | [specifics] | [fix] |
| 4 | Internal Links | PASS/FAIL | [count, issues] | [fix] |
| 5 | External Links | PASS/FAIL | [tier issues] | [fix] |
| 6 | Canonical URL | PASS/FAIL/N/A | [specifics] | [fix] |
| 7 | OG Meta Tags | PASS/FAIL/N/A | [missing tags] | [fix] |
| 8 | Twitter Card | PASS/FAIL/N/A | [missing tags] | [fix] |
| 9 | URL Structure | PASS/FAIL | [specifics] | [fix] |

### Priority Fixes
1. [Most impactful fix first]
2. [Second priority]
3. [Third priority]
```

## Important Notes

- N/A is acceptable for OG/Twitter/Canonical in markdown-only projects
- Focus on actionable fixes, not generic advice
- Report exact character counts for title and meta description
- List specific broken links if found
- For heading hierarchy, show the actual hierarchy tree
