/** Durations offered by the folio schedule-a-call flow. */
export const FOLIO_CALL_DURATIONS = [15, 30] as const;

export type FolioCallDuration = (typeof FOLIO_CALL_DURATIONS)[number];

/**
 * Full Course Studio has its own Cal.com event on the same account
 * (`full-cource-studio-online-meeting` — the live slug spells “course” as “cource”).
 * That option belongs on fullcourse.studio, not this folio flow.
 */
const FULLCOURSE_EVENT_RE = /full[\s-]*cou?r[cs]e(?:\.studio)?/i;

export function isFolioCallDuration(value: number): value is FolioCallDuration {
  return value === 15 || value === 30;
}

export function isFolioCallEventType(event: {
  slug?: string | null;
  title?: string | null;
  description?: string | null;
  bookingUrl?: string | null;
  lengthInMinutes?: number | null;
}): boolean {
  if (typeof event.lengthInMinutes !== "number" || !isFolioCallDuration(event.lengthInMinutes)) {
    return false;
  }

  const haystack = [event.slug, event.title, event.description, event.bookingUrl]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join("\n");

  return !FULLCOURSE_EVENT_RE.test(haystack);
}
