/** Canonical site origin for metadata, sitemap, and JSON-LD. */
export const SITE_URL = "https://yansons.online";

/**
 * Editorial dates, not build timestamps. Update only the affected page when its
 * content, structured data, or substantive links change. Project dates live in
 * each ProjectEntry.lastModified so unrelated case studies keep their dates.
 */
export const PAGE_LAST_MODIFIED = {
  home: "2026-10-26",
  projects: "2026-10-26",
  archive: "2026-10-22",
  faq: "2026-10-22",
} as const;
