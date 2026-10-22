# SEO & GEO action plan — yansons.online

## Done in this change

- Crawlable Previous/Next links between case studies.
- Keyword-bearing titles via a layout title template; case-study titles name the project type.
- Connected JSON-LD graph: ProfilePage, Person, WebSite, ProfessionalService, CollectionPage + ItemList, FAQPage, CreativeWork, BreadcrumbList.
- robots.txt names the current AI search and training agents and disallows `/api/`.
- `llms.txt` is generated from content, with canonical Markdown links.
- Image sitemap, refreshed `lastmod`, and `max-image-preview:large`.
- Permanent www → apex redirect; security headers; `X-Powered-By` removed.

## Week 1: after this deploys (manual, ~20 min)

1. **Vercel → Project → Settings → Domains**: make sure `www.yansons.online` redirects to `yansons.online` with **308 Permanent** (not 307).
2. **Search Console → Sitemaps**: submit `https://yansons.online/sitemap.xml`. Google currently knows only 7 of 14 URLs.
3. **Search Console → Pages → Crawled – currently not indexed**: open the row and note the URL. Run **URL inspection → Request indexing** on it, and on `/`, `/projects`, `/faq` and the three newest case studies.
4. **Page with redirect**: open the row and confirm the examples are `http://`, `www.` or `/archive/` variants. They are expected to stay in this bucket, and no fix validation is needed. If any *other* URL appears, report it.
5. **Bing Webmaster Tools**: import the site from Search Console and submit the sitemap. Bing's index feeds ChatGPT search and Copilot.

## Weeks 2–3: content

- Add a 2–3 sentence visible intro on `/projects`, e.g. "Case studies in Shopify e-commerce, Next.js sites and product UI…".
- Give each case study one concrete, quotable outcome (a number, a timeline, a client quote). AI answers favour specific facts.
- Rename archive entries from placeholders to descriptive titles.

## Month 2: authority (off-site)

- Link `https://yansons.online` from the GitHub profile README, LinkedIn "Featured", Instagram and Threads bios.
- Ask clients whose sites are featured (Lumano, Studio Iskra, Mon Nom Bakery, OhGotMi…) for a "Site by Alexander Yansons" footer credit linking to the case study.
- List on Awwwards/Behance/Dribbble/Clutch with the same name, location and description (entity consistency).

## Ongoing

- Update `lib/site.ts` / project `lastModified` only when content actually changes (see README).
- Re-check GSC Pages and Performance monthly. Re-run the claude-seo audit each quarter.
