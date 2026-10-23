# SEO & GEO audit — yansons.online

- **Date:** 2026-10-22
- **Method:** [claude-seo](https://github.com/AgriciDaniel/claude-seo) `seo-audit` process (technical, content, schema, sitemap, GEO, agentic checks). Scripts `parse_html.py` and `agentic_check.py` ran against a local production build (`pnpm build && pnpm start`), because the live domain is not reachable from the audit sandbox.
- **Business type:** Personal portfolio / independent developer (service provider, Warsaw, PL; remote, international clients).
- **Search Console snapshot (16/10/2026):** 3 indexed, 4 not indexed: 3 × *Page with redirect*, 1 × *Crawled – currently not indexed*. Google knew only 7 URLs, while the sitemap lists 14.

## SEO health score

| Category | Weight | Before | After |
|---|---|---|---|
| Technical SEO | 22% | 78 | 92 |
| Content quality | 23% | 70 | 72 |
| On-page SEO | 20% | 68 | 88 |
| Schema / structured data | 10% | 62 | 92 |
| Performance (CWV) | 10% | n/a (no field data); not scored | n/a |
| AI search readiness (GEO) | 10% | 66 | 90 |
| Images | 5% | 85 | 92 |
| **Weighted (excluding CWV)** | | **~71** | **~85** |

Scores are estimates from the claude-seo rubric. They are not measured ranking data.

## Search Console issues

### Page with redirect (3)

No route in the app has ever issued a redirect (checked across git history). The only redirecting URLs are host and slash variants:

| URL Google can discover | Response | Source of discovery |
|---|---|---|
| `http://yansons.online/` | 308 → https (Vercel) | Typed or linked by third parties |
| `https://www.yansons.online/` | 307/308 → apex (Vercel domain setting) | Instagram / profile links, typed |
| `https://yansons.online/archive/` | 308 → `/archive` (Next.js trailing-slash rule) | **Our own `llms.txt`** linked `/archive/` twice |

URLs that redirect are never indexed themselves; Google indexes the target. This bucket is informational, not an error. To keep it from growing:

- `llms.txt` is now generated from site content and links only canonical URLs (no trailing slashes).
- `next.config.ts` 308-redirects `www.yansons.online/*` to the apex. A permanent signal consolidates on one host even if the Vercel domain redirect is set to 307.
- The sitemap, canonicals, Open Graph URLs and JSON-LD all use the same `https://yansons.online` form.

### Crawled – currently not indexed (1)

Google fetched the page but chose not to index it yet. This is a quality and priority decision, typical for new, thinly linked pages on a young domain. Changes that address it:

- Case-study Previous/Next controls were JS-only `<button>`s, so **no case study linked to another**. They are now real `<a href>` links with descriptive labels, with the same client-side navigation.
- Descriptive, unique titles replace "`LUMANO | Alexander Y.`": "`LUMANO — E-commerce Store Case Study · Alexander Yansons`".
- Richer, connected JSON-LD and refreshed `lastmod` dates give Google a recrawl signal.

## Findings

### Critical
None. The site is crawlable, server-rendered, canonicalized, and every 404 returns a real 404 status.

### High

| # | Finding | Status |
|---|---|---|
| H1 | Case studies had no crawlable links to other case studies (prev/next were buttons). | **Fixed** |
| H2 | `llms.txt` linked non-canonical `/archive/` (a redirect Google reports), and it had no Markdown links, which fails the Lighthouse llms.txt audit. | **Fixed**: generated route, passes |
| H3 | The sitemap was not fully processed: Google knew 7 URLs vs 14 in the sitemap. | **Manual**: submit the sitemap in GSC (see action plan) |
| H4 | Weak titles on case studies (`| Alexander Y.`) with no service or category keywords. | **Fixed** |

### Medium

| # | Finding | Status |
|---|---|---|
| M1 | JSON-LD entities disconnected: a Person without `@id`, plus an Organization duplicating the person's name. | **Fixed**: `@graph` with `#person`, `#website`, `#organization` (ProfessionalService, `founder` → person), and ProfilePage on the homepage |
| M2 | No BreadcrumbList on `/projects`, `/archive`, `/faq`. | **Fixed** |
| M3 | Only the FAQ escaped `<` in JSON-LD. | **Fixed**: shared `jsonLd()` helper |
| M4 | robots.txt missed the AI *search* crawlers that decide citations (OAI-SearchBot, Claude-SearchBot, Claude-User, Perplexity-User, Applebot) and listed deprecated agents (`Claude-Web`, `anthropic-ai`). It also used the non-standard `Host` directive. | **Fixed** |
| M5 | No `max-image-preview:large` directive, which limits image-rich results and Discover. | **Fixed** |
| M6 | Sitemap had no image entries for gallery assets. | **Fixed**: image sitemap |
| M7 | Missing security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`); `X-Powered-By` exposed. | **Fixed** |
| M8 | Home H1 "I build websites and other cool stuff." carries no entity or service terms. | **Recommendation**: the title and schema carry the terms now. A design-led change, left to the author |

### Low

| # | Finding | Status |
|---|---|---|
| L1 | Archive entry titles are generic ("Signal Draft 01"), so they add little topical signal. | Recommendation |
| L2 | `/projects` index has ~230 words and an H1 only. A one-paragraph visible intro would help it rank for "Shopify developer Warsaw"-type queries. | Recommendation |
| L3 | The preloader text ("0% A LEXANDER Y ANSONS") is the first body text in the HTML. | Recommendation: mark the preloader `aria-hidden` |

## GEO (AI search) assessment

| Signal | Before | After |
|---|---|---|
| Server-rendered primary content | Pass | Pass |
| AI *search* bots explicitly allowed (OAI-SearchBot, Claude-SearchBot, PerplexityBot) | Partial (`*` only) | Pass |
| llms.txt with Markdown links (Lighthouse rule) | Fail | Pass |
| Entity clarity (one Person `@id`, `sameAs` to GitHub, LinkedIn, Instagram, Threads, `knowsAbout`, location) | Partial | Pass |
| Question-shaped headings + FAQPage | Pass | Pass |
| Self-contained answer passages (FAQ, case-study overview) | Pass | Pass |
| Freshness dates in schema and sitemap | Pass | Pass (refreshed) |
| Off-site brand mentions (YouTube, Reddit, LinkedIn posts, directories) | Weak | Off-site: see action plan |

Google's position is that optimizing for AI surfaces "is still SEO", and llms.txt carries no ranking weight with Google. It is kept because ChatGPT, Claude and Perplexity agents read it, and it is now generated, so it never drifts from the pages.

## Agentic readiness (`agentic_check.py`)

Before: P0 3/3 pass, P1 1 fail (llms.txt). After: P0 3/3 pass, P1 3 pass, 0 fail.
