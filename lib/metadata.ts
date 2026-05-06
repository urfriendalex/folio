import type { ProjectEntry } from "@/content/projects/types";

const META_DESC_MAX = 160;

/** Shared Open Graph / Twitter Card image — file must exist at `public/og.png`. */
export const SITE_OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Alexander Yansons — portfolio link preview",
} as const;

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
