# Agents & skills

Project capabilities for MAEVEN. Invoke an agent by name ("use frontend-doctor on
the product pages"); invoke a skill as a slash command (`/blog-schema`).

## Agents

| Agent | Writes? | Use it when |
|---|---|---|
| **frontend-doctor** | ✅ fixes | After any UI change, before shipping. Finds and fixes real defects — mobile overflow, `next/image` misuse, hydration mismatches, broken a11y semantics, focus traps, React state bugs — then verifies with tsc + eslint + build. |
| **motion-3d** | ✅ builds | Any 3D or motion work — Three.js scenes, GLSL, CSS 3D, scroll choreography, variable-font animation. Knows the perf budget, fallback rules and WebGL disposal discipline. |
| **photo-scout** | ✅ fetches | A page or article needs imagery, or a photo reads wrong. Searches Pexels, *looks at* the candidates before choosing, installs the winner and keeps attribution in sync. |
| **magazine-writer** | ✅ writes | The magazine needs a new piece. Writes it in Vietnamese in the brand voice and installs it into `data.ts` as a working route. |
| **blog-reviewer** | ❌ reports | Editorial quality gate before publishing. Scores a draft against `design.md`'s voice contract and blocks claims borrowing real-world authority. |
| **blog-seo** | ❌ reports | After adding a route or changing metadata. Validates the Next.js metadata surface against the prerendered build. |
| **responsive-auditor** | ❌ reports | Before a release. Walks 320 → 1440px and reports what breaks, with the arithmetic. |
| **a11y-auditor** | ❌ reports | After adding interactive UI. WCAG 2.2 AA: semantics, keyboard, focus, contrast, labels, language. |
| **design-system-guard** | ❌ reports | When the UI starts drifting. Hard-coded colors, duplicated components, type-scale sprawl, voice violations. |

## Skills

| Skill | What it does |
|---|---|
| `/blog-schema` | Generates JSON-LD (`BlogPosting`, `Person`, `Organization`, `BreadcrumbList`, `Product`) for the article and product routes. The site currently ships **none**. |
| `/blog-factcheck` | Inverted for a fictional brand: flags any claim a reader could mistake for a verifiable real-world fact, plus number contradictions across `data.ts`. |
| `/blog-translate` | Vietnamese → English into the `article.en` field, block for block. Six of seven articles are untranslated. |

## Workflows

- **Defects:** run an auditor → hand its findings to `frontend-doctor`. The
  auditors are read-only so a report can be reviewed before anything changes.
- **New article:** `magazine-writer` → `photo-scout` → `blog-reviewer` →
  `/blog-factcheck` → optionally `/blog-translate`.
- **Visual work:** `scripts/shoot.mjs` captures the running site to `shots/`, and
  the agent opens the PNG with Read. Never report visual work done without it.

## What was deliberately not adopted

`AgriciDaniel/claude-blog` ships 32 skills and 5 agents. Five were taken (see
`NOTICE.md`); the other 30 were rejected on three grounds:

1. **External services this project has no keys for** — SERP APIs, DataForSEO,
   Google Search Console, NotebookLM, Gemini/`GOOGLE_AI_API_KEY`. That rules out
   `blog-google`, `blog-decay`, `blog-audit`, `blog-cluster`, `blog-discourse`,
   `blog-notebooklm`, `blog-image`, `blog-audio`.
2. **Hard dependency on the upstream Python scripts** that were not vendored —
   `blog-style`, `blog-analyze`, `blog-write`, `blog-rewrite`, `blog-persona`,
   `blog-flow`, `blog-chart`, `blog-seo-check`, and the `blog` orchestrator.
3. **Wrong shape for this project.** `blog-taxonomy` syncs to WordPress/Shopify/
   Ghost (no CMS here). `blog-strategy`, `blog-calendar`, `blog-cannibalization`
   and `blog-brief` are search-traffic planning for content at scale — MAEVEN has
   seven articles and a brand voice that explicitly rejects promotional content.
   `blog-writer` and `blog-translator` duplicate `magazine-writer` and
   `/blog-translate`.

Adopting all 32 would have produced mostly non-functional slash commands, since
every upstream skill assumes markdown files with frontmatter and this repo stores
articles as typed objects in `src/lib/data.ts`.

Each agent is defined in `agents/*.md` and each skill in `skills/*/SKILL.md` —
YAML frontmatter plus the prompt. They are project-scoped and travel with the repo.
