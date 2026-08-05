const CAL_ORIGIN = "https://cal.com";

/** Shareable hash for the in-site schedule-call booking overlay (`/#schedule-call`). */
export const SCHEDULE_CALL_HASH = "schedule-call";

export function getScheduleCallHref() {
  return `#${SCHEDULE_CALL_HASH}`;
}

export function normalizeCalLink(calLink: string) {
  return calLink
    .trim()
    .replace(/^https?:\/\/(?:app\.)?cal\.com\//, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

export function getCalPageHref(calLink: string) {
  const normalizedCalLink = normalizeCalLink(calLink);
  return normalizedCalLink ? `${CAL_ORIGIN}/${normalizedCalLink}` : CAL_ORIGIN;
}

export function getCalEventSlug(calLink: string) {
  const normalizedCalLink = normalizeCalLink(calLink);
  const segments = normalizedCalLink.split("/").filter(Boolean);

  return segments.length >= 2 ? segments[segments.length - 1] : null;
}
