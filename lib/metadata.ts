import type { ProjectEntry } from "@/content/projects/types";
import { SITE_URL } from "@/lib/site";

const META_DESC_MAX = 160;

/** Shared Open Graph / Twitter Card image — file must exist at `public/og.png`. */
export const SITE_OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Alexander Yansons — portfolio link preview",
} as const;

export type ShareOgImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
};

function absoluteSiteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

/** Default OG image with an absolute `url` for metadata APIs. */
export function siteShareOgImage(): ShareOgImage {
  return {
    url: absoluteSiteUrl(SITE_OG_IMAGE.url),
    width: SITE_OG_IMAGE.width,
    height: SITE_OG_IMAGE.height,
    alt: SITE_OG_IMAGE.alt,
  };
}

/**
 * Uses the first gallery asset (desktop) so shared links match the project hero.
 * Falls back to the site-wide OG image when a project has no media.
 */
export function projectShareOgImage(project: ProjectEntry): ShareOgImage {
  const first = project.media[0];
  if (!first) {
    return siteShareOgImage();
  }

  const asset = first.desktop;
  const src = first.kind === "video" ? (asset.poster ?? asset.src) : asset.src;

  return {
    url: absoluteSiteUrl(src),
    width: asset.width,
    height: asset.height,
    alt: `${project.title} — preview`,
  };
}

export function clampMetaDescription(text: string, max = META_DESC_MAX): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) {
    return normalized;
  }
  const slice = normalized.slice(0, max);
  const cut = slice.lastIndexOf(" ");
  const head = cut > max * 0.5 ? slice.slice(0, cut) : slice;
  return `${head.trim()}…`;
}

/** Meta description for project pages: short copy first, then overview, body, or descriptor. */
export function projectShareDescription(project: ProjectEntry): string {
  const raw =
    project.shortDescription?.trim()
    || project.overview?.trim()
    || project.description?.trim()
    || project.descriptor?.trim()
    || project.title;
  return clampMetaDescription(raw);
}
