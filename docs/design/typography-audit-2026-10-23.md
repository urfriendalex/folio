# Typography audit — 23 October 2026

## Verdict

The site has a coherent direction: quiet sans-serif editorial content, a pixel accent, generous space, and low visual weight. The font families themselves are defensible. The weakness is that sizing and rhythm have accumulated component by component, so equivalent information can look subtly different between screens.

**Keep the current design and information layout. Consolidate the typography behind it.** Four sizes in a hero are not inherently excessive: role, statement, support, and invitation carry different responsibilities. Five almost identical sizes for supporting information are much less useful.

## Scope and confidence

Source audit of the selected production design on MR #42, baseline commit `e500778`, including Home, Work, contact/form, navigation, project cards/index, case studies, project information, About, Archive, FAQ, and footer variants. The user's supplied mobile screenshots informed hierarchy and density judgments.

No live browser is connected during this audit. Consequently, this is **not a completed visual, font-rendering, or accessibility certification**. CSS values and contrast calculations are verified from source; live computed cascade, 200% enlargement, actual mobile font rendering, and post-change screenshots remain pending. In particular, the smallest-size changes below need an on-device pass before calling the result visually final.

The separate SEO checkout was left untouched. The audit and system implementation live with the selected hero branch.

## Baseline inventory

The reproducible snapshot is [typography-baseline.json](typography-baseline.json). Comments are excluded; repeated rules and breakpoints are included.

| Property | Declarations | Distinct source expressions | Files |
| --- | ---: | ---: | ---: |
| Font size | 221 | 130, of which 127 are literal expressions | 25 |
| Font family | 77 | 7 expressions | 21 |
| Font weight | 51 | 7 expressions | 16 |
| Line height | 141 | 33 expressions | 24 |
| Letter spacing | 105 | 30 expressions | 23 |

These are maintenance counts, not 130 sizes or seven families on one screen. Technical glyph sizes, inherited values, responsive formulas, animated text effects, and optional retro footer chrome all contribute.

### Font roles

The four loaded families are Geist Sans, Geist Mono, Geist Pixel Grid, and Geist Pixel Square. Tahoma is a separate system-font exception for the Windows-style chrome. The main visual language is therefore simpler than a raw family declaration count suggests.

Sans is appropriate for descriptions and names. Pixel actions and the morphing email are recognizable signature elements. Mono is justified for ASCII/canvas metrics. The FAQ eyebrow was a minor inconsistency: it used Mono for a job otherwise performed by the pixel utility face; it now uses that utility face.

## Findings

No P0 or P1 defect was verified from this source review. The findings below are hierarchy, readability, and maintainability issues; small font size alone is not asserted to violate WCAG.

### P2 — No shared scale for ordinary content

**Evidence:** `HomeHero.module.scss`, `WorkSection.module.scss`, `ProjectCard.module.scss`, `ProjectsIndex.module.scss`, `ContactLayout.module.scss`, and `OverlayProvider.module.scss` each declared independent sizes. Only families, tracking, and the footer legal size were shared globally.

**Impact:** component-level polishing slowly changes the brand's typography. A future edit cannot tell whether 0.78rem and 0.8125rem represent different roles or simply different iterations.

**Implemented:** semantic role tokens in `styles/_typography.scss`; nine core stylesheets now require semantic sizes at build time. This is a focused migration, not a claim that all local typography in the repository has disappeared.

### P2 — Mobile hero metadata has too many neighboring sizes

**Before:** role 11px, labels 10.5px, values 11.5px, support around 11–12.5px, CTA 13px, plus the 26–28px statement.

**Impact:** the differences create implementation complexity without reliably communicating additional hierarchy. Very small data values also make a clean design feel delicate rather than comfortably readable.

**Implemented:** labels/role 11px, values/support 12px, invitation 13px; the main statement keeps its approved scale. Facts remain compact label/value rows. No content is removed. The hero/project spatial design and bottom-anchored ASCII behavior remain the layout model, but text geometry still needs visual rechecking.

### P2 — Project identity varies by presentation

**Evidence:** card titles used 13.6px on desktop and roughly 10.88–12.48px on mobile; index names used 14px/13px. Card years dropped to 9.28px on mobile.

**Impact:** the same project can acquire a different visual importance simply by switching presentation; years are unnecessarily hard to read.

**Implemented:** shared project title role at 14px desktop / 13px mobile; years and auxiliary labels at 11px. Names and descriptors retain separate hierarchy. Dense cards still permit ellipsis with a full accessible link name; they need a long-name visual check.

### P2 — Reading prose inherits interface-sized decisions

**Evidence:** FAQ answers were 15.2px desktop / 14.4px mobile with 1.8 leading. Case-study notes were fluid from 15.2px to 16.8px with 1.65 leading. Compact project information overlays have their own still-smaller body rules.

**Impact:** prose does not feel like a stable reading surface. Reducing body size on a phone works against readability, even if it makes an isolated screen look quieter.

**Implemented:** FAQ answers and case-study notes use 16px / 1.65, with a 65ch maximum measure. FAQ short secondary notes use 14px. Compact full-information overlays are recorded as remaining work rather than resized without a fit check.

### P2 — Light muted text has very little contrast margin

**Evidence:** `--muted-color` is foreground at 58% alpha. Composited onto the declared theme backgrounds it produces approximately 4.54:1 in light mode and 6.18:1 in dark mode.

**Impact:** the light value is close to the 4.5:1 normal-text threshold; additional opacity, a different surface, or a fine pixel face can make it perceptually weaker. This is a concern, not a claim that all muted text fails.

**Implemented:** FAQ prose uses a stronger 72% reading-color token. Global muted chrome remains visually unchanged. Settled-state contrast in overlays and on unusual surfaces still requires a computed-style audit.

### P2 — About and compact metadata are undersized in places

**Evidence:** mobile About metadata was 11.2px, its section labels 9.28px, and footer links/copyright roughly 9.28–10.88px. Project full-information labels start below 10px; optional footer chrome contains similarly small labels.

**Implemented:** About values 12px, labels and mobile footer text 11px, desktop values/links 14px. Its opening statement retains its approved editorial scale. Legal text in the main footer retains its existing shared optical size. Full-information overlays and retro chrome remain explicitly deferred for their fit/accessibility pass.

### P3 — Line-height responsibilities are not explicit enough

**Evidence:** Selected projects set size/weight/tracking but no line height. The form title used 0.92 leading, a display-style choice alongside interactive fields. About and footer copyright used near-identical but separate leading rules.

**Implemented:** section headings and card names use a 1.25 title rhythm; form titles use 1.15; reading uses 1.65; About/footer metadata share the appropriate label/body presets. The About opening's optical display leading remains distinct from body text. Small header/nav single-line controls and illustration layers are documented exceptions, not templates for paragraphs.

### P3 — CTA tracking and duplicate contact rules can drift

**Evidence:** the hero action used 0.025em tracking while contact action selectors specified different tracking and nearby sizes in two modules.

**Implemented:** hero and contact actions use the action-tracking token. Both contact selector paths resolve to the same contact-action size, preventing their import order from choosing different typography. The hero invitation's mobile size remains 13px and the contact rows 14px for their different compositions.

## Intended hierarchy after consolidation

At default 16px root size:

| Surface | Primary | Supporting | Auxiliary |
| --- | --- | --- | --- |
| Mobile hero | Statement 26–28px | Invitation 13px; support/facts 12px | Role/labels 11px |
| Desktop hero | Statement 34–46px | Role 21–27px; support 18px | Invitation 15px; facts 14px; labels 12px |
| Section transition | Selected projects / Contact Me 16–18px | Project names 14px desktop / 13px mobile | Years 11px |
| Contact | Deliberately oversized email illustration | Action rows 13px desktop / 14px mobile | Status 11px |
| About | Existing fluid opening statement | Values/links 14px desktop / 12px mobile | Labels/mobile footer 11px |
| Reading pages | Existing question / case lead sizes | Prose 16px / 1.65 | Short secondary notes 14px |

Section titles are navigational markers, not hero-sized displays. Their larger size relative to facts is intentional: they announce a new section after the quieter supporting information.

## Positive findings to retain

- The approved mobile content structure is restrained, and the statement has a clear first/second phrase.
- Typeface personality is concentrated in short interactions and illustrations, not paragraphs.
- Most ordinary text already uses rem-based sizing; the viewport does not prohibit zoom.
- Family stacks and tracking tokens already exist; footer copyright already shared its size with About.
- Reveal/pretext primitives measure live typography rather than relying only on hardcoded line breaks.
- The code separates project names, descriptors, and years, allowing consistent roles without rewriting markup.

## Design-system work delivered

See [typography.md](typography.md) for the rules, sizes, exceptions, and review checklist. The build now runs `pnpm check:typography`. The font-size inventory has fewer independent literal expressions after the migration, but raw repository counts are not a visual quality score; the goal is ownership by role and consistent behavior.

No family download was added and no typeface was replaced globally. Core typography was consolidated across Home, Work, contact, project cards/index, case-study prose, About, and FAQ. Navigation's standard small text and footer legal leading also use shared roles. Legacy component primitives, Archive, full-information overlays, and retro UI retain local optical values.

Production build, TypeScript compilation, typography guard, and the existing 14 tests pass. A new policy regression test also passes: it copies the real styles into a temporary fixture and verifies the guard rejects an arbitrary new size, an undefined token, a font shorthand, an unapproved family, and fixed-pixel leading. Visual checks remain pending as described above.

## Remaining verification and follow-up

1. **Visual pass, before visual sign-off:** light/dark, 320/393/768/1280/1440px, actual iPhone, 200% text enlargement, long names, form errors, both project grids. Recheck hero wrapping, CTA fit, project peek, About scrolling, ASCII alignment and section transitions. The browser connection was unavailable for this pass.
2. **P2:** migrate project full-information prose after testing its scroll/fit behavior; assess tiny captions in Archive and optional retro footer chrome in their actual contexts.
3. **P3:** remove redundant legacy base overrides only after comparing all their consumers, including animation text. Preserve canvas and glyph units as illustration metrics.
4. Run the inventory again when expanding governance. A new token that just renames another arbitrary value does not count as consolidation.

## Standards references

The contrast threshold comes from [W3C Understanding Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). The enlargement check comes from [W3C Understanding Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html). The 16px reading target and this site's type roles are design-system choices, not claimed WCAG minimum-font-size rules.
