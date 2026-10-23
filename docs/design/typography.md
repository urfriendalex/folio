# Typography system

The direction is restrained editorial text with a deliberate pixel accent. Preserve the quiet mobile composition, clear invitation to contact, and Selected projects peek. Consistency means the same role behaves consistently; it does not mean every heading or every button must have the same size.

## Source of truth

- `styles/_typography.scss` owns semantic sizes, common leading, weights, tracking, and reading measure. It is loaded once by `styles/globals.scss`.
- Existing `--font-*-stack` tokens in `styles/globals.scss` own font families.
- Components choose roles. Layout, margins, reveal timing, and illustration metrics remain component responsibilities.
- `pnpm check:typography` validates the nine migrated stylesheets on every production build. It rejects literal font sizes, undefined type tokens, unapproved font families, fixed-unit leading, and font shorthands that bypass role declarations. The visit glyph's `1em` is a documented inheritance exception.
- `pnpm audit:typography` inventories SCSS source declarations. `node scripts/typography-inventory.mjs --json` produces their locations. These are source values, including breakpoint overrides, not computed styles or counts of simultaneously visible sizes.

## Families

| Family | Responsibility | Boundary |
| --- | --- | --- |
| Geist Sans / `--font-body-stack` | Headings, body, names, navigation, metadata | Default for readable content |
| Geist Pixel Grid / `--font-pixel-stack` | Utility labels, contact actions, FAQ eyebrow | Short strings; never paragraphs |
| Geist Pixel Square / `--font-pixel-square-stack` | Hero invitation, Archive identity, email morph endpoints | Deliberate accent variant, not an alternate body font |
| Geist Mono / `--font-mono-stack` | ASCII / canvas text, technical and loading displays | Illustration metrics are separate from reading typography |
| Tahoma / `--font-system-95-stack` | Optional Windows-style footer chrome and tooltips | Keep inside that themed interface |

Four web font families are loaded; the retro system stack does not add a web-font download. Grid and Square are purposeful variants, not two competing editorial voices. Do not introduce another family to differentiate a heading. Use hierarchy, space, color, or weight first.

## Reading and hierarchy

Values below assume a 16px root. All actual sizes use `rem`; user settings remain authoritative.

| Role | Size | Leading | Use |
| --- | --- | --- | --- |
| Caption | 11px | 1.25–1.35 | Short labels, years, status; never explanatory paragraphs |
| Compact metadata | 12px | 1.35–1.5 | Hero facts and short support copy |
| Compact control | 13px | 1.25–1.5 | Navigation, mobile hero invitation, compact project names |
| Secondary UI | 14px | 1.25–1.5 | Desktop project names, secondary links, short notes |
| Reading text | 16px | 1.65 | FAQ answers and case-study prose |
| Introductory copy | 18px | 1.5 | Desktop hero supporting sentence |
| Section heading | Fluid 16–18px | 1.25 | Selected projects and mobile Contact Me, using the same class/token |
| Hero statement | Mobile 26–28px; desktop 34–46px | 1.15 | Main proposition, highest editorial priority on Home |

The 13px control / 14px UI split is intentionally compact, not a rigid mathematical modular scale. Consistency here comes from named roles and repeated rhythm. Do not derive another 12.4px or 13.1px label because one component feels slightly different.

### Hero

Mobile uses **11px labels → 12px details → 13px pixel invitation → 26–28px statement**. The subtitle shares the 12px detail tier. The section heading below is 16–18px: larger than metadata, smaller than the main statement. This is intentional section hierarchy, not a mismatch.

The desktop role line remains fluid 21–27px and the invitation remains 15px. These contextual roles preserve the approved composition. Do not force the mobile role line to match the much larger desktop role.

Keep the two deliberate mobile statement phrases. At large text settings, additional wrapping is acceptable; clipping or shrinking type to keep one line is not. The supporting sentence is designed to fit a typical phone at default settings, not forced with `nowrap`.

### Reading surfaces

Use the 16px body role for FAQ answers and case-study notes, with `--type-leading-reading` and a maximum `65ch` measure. Body copy should not inherit a caption or navigation token merely because it lives in an overlay. Pixel text is an accent, not the reading face.

### Weights, leading, and tracking

- 400 is the editorial default; 500 identifies sections, questions, and project names; 600 is reserved for dialog/form titles. Heavy logo and footer wordmark weights belong to the brand mark, not the reading scale.
- Use unitless leading. Standard presets are display 1.06, headline 1.15, compact title 1.25, label 1.35, body 1.5, reading 1.65.
- The About opening, email illustration, and wordmark have optical exceptions. Do not copy their tight leading into forms or body text.
- Large headings may use tight tracking. Short pixel actions use the action-tracking token. Do not apply wide uppercase tracking to sentences.
- Inline arrows and illustration glyphs inherit their surrounding size or use rendering-specific metrics. Never normalize a canvas cell size into the reading scale.

## Contrast and exceptions

The shared muted token has about **4.54:1** contrast on the light background and **6.18:1** on dark, calculated from the declared colors after alpha compositing. Light mode is therefore close to the normal-text threshold. FAQ reading copy uses a stronger dedicated reading color; do not add another layer of opacity to it.

The footer legal strip deliberately keeps its existing fluid optical token, also reused by About copyright on desktop. The About footer's mobile links/copyright now use the 11px caption tier. Compact labels are a presentation choice, not an accessibility guarantee.

WCAG's normal-text contrast requirement is [4.5:1](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). It also requires [text resizing to 200% without loss of content or functionality](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html). There is no claim that choosing `rem` or a minimum font size alone proves conformance.

## Changes and review

1. Choose an existing role before changing component CSS. Change a semantic token only when every consumer should change.
2. A new display or optical exception needs its purpose, allowed surfaces, and responsive behavior documented here. A named token is not justification by itself.
3. Run `pnpm check:typography` and `pnpm build`.
4. Visually review light/dark at 320, 393, 768, 1280, and 1440 CSS pixels; check 200% text enlargement, long names, form errors, and expanded About/project information. Check reveal completion, not just the first animated frame.
5. Verify hero CTA, project peek, ASCII alignment, modal scrolling, and field usability after type changes. Typography can alter all of their geometry.

Current governance covers Home hero, Work heading, contact, project cards/index, case-study prose, About, and FAQ. Full project overlays, Archive, the large footer chrome, preloader, and illustration primitives retain explicit local sizing pending their own visual review. Extend the guard's file list when migrating them; do not silently grandfather new values into governed surfaces.
