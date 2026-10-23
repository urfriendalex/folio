This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Typography

The shared type roles live in `styles/_typography.scss`. Read the
[typography system](docs/design/typography.md) before introducing a new size or font,
and the [23 October audit](docs/design/typography-audit-2026-10-23.md) for findings and remaining visual checks.
`pnpm check:typography` guards migrated surfaces and runs before each production build;
`pnpm audit:typography` inventories source declarations across the site.

## Home hero

The home-page copy lives in `content/hero.ts`. `HomeHero` supplies its service
and availability details, responsive layout, and red glyph CTA. Both hero contact
links scroll to the contact section; the form opens only from Send a message.

The complete hero exploration is preserved on
[`features/codex/hero-role-studies`](https://github.com/urfriendalex/folio/tree/features/codex/hero-role-studies).
On that branch, run `pnpm dev --port 3010` and open
`/hero-study/explore?option=2`. Study pages and comparison images are excluded
from the production branch.

## Project Asset Optimization

Run `pnpm optimize:projects` to losslessly optimize all checked-in project PNGs
and MP4 containers, including curated projects. Requires ffmpeg and ffprobe.
The project media generator also runs this pass after generating its outputs.

PNG replacements must preserve decoded pixels, dimensions, orientation, and ICC
profiles. Videos are stream-copied, never re-encoded; packet hashes, timestamps,
and codec/color metadata must match. Files are replaced only when smaller
(MP4 container savings must be at least 1 KiB). Resolution, frame rate, duration,
asset paths, and page layouts stay unchanged. Already optimized files are kept.

Curated captures remain curated: this command does not regenerate them from
sources, change their gallery ordering, or trim their clips.

## Search and content metadata

The FAQ at `/faq`, project notes, and archive index render their text on the
server. Keep visible FAQ answers and their JSON-LD in sync by editing the shared
FAQ content in `app/(site)/faq/content.ts`.

When a page's content, structured data, or substantive links change, update its
date in `lib/site.ts`. For a case study, update only that project's
`lastModified` in `content/projects`. Use `YYYY-MM-DD` dates. These dates feed the
sitemap and JSON-LD; do not replace them with build timestamps or update
unrelated projects just because the site is deployed.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
