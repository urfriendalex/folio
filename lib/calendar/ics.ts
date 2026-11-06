import { isFolioCallDuration, type FolioCallDuration } from "@/lib/cal/folioEventTypes";

export const CALL_EVENT_TITLE = "Call with Alexander Yansons";
export const CALL_ICS_FILENAME = "call-with-alexander-yansons.ics";

const ICS_LINE_OCTETS = 75;
const HTTP_URL_RE = /^https?:\/\//i;

export type CalendarDraft = {
  start: Date;
  end: Date;
  minutes: FolioCallDuration;
  title: string;
  description: string;
  location: string | null;
  url: string | null;
  uid: string;
  stamp: Date;
};

export function parseEventInstant(iso: string): Date | null {
  const trimmed = iso.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatUtcIcs(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** TEXT values: escape `\`, `;`, `,`, and newlines. RFC 5545 §3.3.11. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/**
 * Fold a content line at 75 octets. Continuation lines begin with a single space
 * and the space counts toward that next line's 75 octets. RFC 5545 §3.1.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= ICS_LINE_OCTETS) {
    return line;
  }

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  let limit = ICS_LINE_OCTETS;

  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (current && currentBytes + bytes > limit) {
      parts.push(current);
      current = char;
      currentBytes = bytes;
      limit = ICS_LINE_OCTETS - 1;
    } else {
      current += char;
      currentBytes += bytes;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts
    .map((part, index) => (index === 0 ? part : ` ${part}`))
    .join("\r\n");
}

export function sanitizeMeetingUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000 || !HTTP_URL_RE.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function buildEventUid(bookingUid: string | null | undefined, start: Date): string {
  const raw = (bookingUid || `call-${formatUtcIcs(start)}`).replace(/[^A-Za-z0-9._-]/g, "");
  const base = raw || `call-${formatUtcIcs(start)}`;
  return `${base}@yansons.online`;
}

function resolveDuration(
  start: Date,
  lengthInMinutes: number | null | undefined,
  endIso: string | null | undefined,
): FolioCallDuration | null {
  if (typeof lengthInMinutes === "number" && isFolioCallDuration(lengthInMinutes)) {
    return lengthInMinutes;
  }

  if (endIso) {
    const end = parseEventInstant(endIso);
    if (end) {
      const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
      if (isFolioCallDuration(minutes)) {
        return minutes;
      }
    }
  }

  return null;
}

export function buildCalendarDraft(input: {
  startIso: string;
  lengthInMinutes?: number | null;
  endIso?: string | null;
  meetingUrl?: string | null;
  uid?: string | null;
  now?: Date;
}): CalendarDraft | null {
  const start = parseEventInstant(input.startIso);
  if (!start) {
    return null;
  }

  const minutes = resolveDuration(start, input.lengthInMinutes, input.endIso);
  if (!minutes) {
    return null;
  }

  const url = sanitizeMeetingUrl(input.meetingUrl);
  const description = url ? `Join the call: ${url}` : `${CALL_EVENT_TITLE}.`;

  return {
    start,
    end: new Date(start.getTime() + minutes * 60_000),
    minutes,
    title: CALL_EVENT_TITLE,
    description,
    location: url,
    url,
    uid: buildEventUid(input.uid, start),
    stamp: input.now ?? new Date(),
  };
}

export function buildIcs(draft: CalendarDraft): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//yansons.online//Schedule a call//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${draft.uid}`,
    `DTSTAMP:${formatUtcIcs(draft.stamp)}`,
    `DTSTART:${formatUtcIcs(draft.start)}`,
    `DTEND:${formatUtcIcs(draft.end)}`,
    `SUMMARY:${escapeIcsText(draft.title)}`,
  ];

  if (draft.location) {
    lines.push(`LOCATION:${escapeIcsText(draft.location)}`);
  }

  lines.push(`DESCRIPTION:${escapeIcsText(draft.description)}`);

  if (draft.url) {
    lines.push(`URL:${draft.url}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function buildGoogleCalendarUrl(draft: CalendarDraft): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: draft.title,
    dates: `${formatUtcIcs(draft.start)}/${formatUtcIcs(draft.end)}`,
    details: draft.description,
  });

  if (draft.location) {
    params.set("location", draft.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(draft: CalendarDraft, host: "live" | "office"): string {
  const origin = host === "live" ? "https://outlook.live.com" : "https://outlook.office.com";
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    startdt: draft.start.toISOString(),
    enddt: draft.end.toISOString(),
    subject: draft.title,
    body: draft.description,
  });

  if (draft.location) {
    params.set("location", draft.location);
  }

  return `${origin}/calendar/0/deeplink/compose?${params.toString()}`;
}

export function buildIcsRouteHref(input: {
  startIso: string;
  minutes: FolioCallDuration;
  meetingUrl: string | null;
  uid: string | null;
  download?: boolean;
}): string {
  const params = new URLSearchParams({
    start: input.startIso,
    minutes: String(input.minutes),
  });

  if (input.meetingUrl) {
    params.set("url", input.meetingUrl);
  }

  if (input.uid) {
    params.set("uid", input.uid);
  }

  if (input.download) {
    params.set("download", "1");
  }

  return `/api/cal/calendar?${params.toString()}`;
}
