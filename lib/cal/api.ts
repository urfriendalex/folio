import "server-only";

import { getCalEventSlug, getCalPageHref, normalizeCalLink } from "@/components/booking/calBooking";
import { contactContent } from "@/content/contact";

const CAL_API_BASE_URL = "https://api.cal.com/v2";
const CAL_API_TIMEOUT_MS = 10000;

const CAL_API_VERSIONS = {
  me: "2026-02-25",
  eventTypes: "2024-06-14",
  slots: "2024-09-04",
  bookings: "2026-02-25",
} as const;

type CalApiErrorPayload = {
  status?: string;
  error?: {
    message?: string;
    details?: {
      message?: string;
    };
  };
};

type CalApiSuccess<T> = {
  status: "success";
  data: T;
};

type RawCalProfile = {
  username?: string | null;
  timeZone?: string | null;
};

export type CalLocation = {
  type?: string;
  integration?: string;
  link?: string;
  address?: string;
  public?: boolean;
};

export type CalBookingField = {
  slug?: string;
  type?: string;
  required?: boolean;
  hidden?: boolean;
};

type RawCalEventType = {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  lengthInMinutes: number;
  hidden?: boolean;
  bookingRequiresAuthentication?: boolean;
  bookingUrl?: string;
  locations?: CalLocation[];
  bookingFields?: CalBookingField[];
  users?: Array<{
    username?: string | null;
  }>;
};

export type CalWidgetEventType = {
  id: number;
  title: string;
  slug: string;
  description: string;
  lengthInMinutes: number;
  bookingUrl: string;
  username: string | null;
  locations: CalLocation[];
  bookingFields: CalBookingField[];
};

export type CalWidgetOverview = {
  username: string | null;
  timeZone: string;
  profileUrl: string;
  eventTypes: CalWidgetEventType[];
  defaultEventTypeId: number | null;
};

export type CalSlotMap = Record<string, Array<{ start: string; end?: string }>>;

type CreateCalBookingInput = {
  eventTypeId: number;
  start: string;
  attendee: {
    name: string;
    email: string;
    timeZone: string;
  };
  bookingFieldsResponses?: Record<string, string>;
  location?: CalLocation;
};

type RawCalBooking = {
  uid?: string;
  title?: string;
  start?: string;
  end?: string;
  location?: unknown;
  meetingUrl?: string | null;
  attendees?: Array<{
    email?: string;
  }>;
};

export class CalApiError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "CalApiError";
    this.status = status;
  }
}

function getCalApiKey() {
  const apiKey = process.env.CAL_API_KEY?.trim();

  if (!apiKey) {
    throw new CalApiError("Cal.com booking is not configured on the server.", 503);
  }

  return apiKey;
}

function getCalErrorMessage(payload: CalApiErrorPayload | null) {
  return (
    payload?.error?.message ||
    payload?.error?.details?.message ||
    "Cal.com returned an unexpected response."
  );
}

async function fetchCal<T>({
  path,
  version,
  method = "GET",
  searchParams,
  body,
}: {
  path: string;
  version: string;
  method?: "GET" | "POST";
  searchParams?: Record<string, string | number | undefined>;
  body?: unknown;
}) {
  const url = new URL(`${CAL_API_BASE_URL}${path}`);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined) {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${getCalApiKey()}`,
        "cal-api-version": version,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
      signal: AbortSignal.timeout(CAL_API_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new CalApiError("Cal.com is taking too long to respond.", 504);
    }

    throw new CalApiError("Could not reach Cal.com.", 502);
  }

  let payload: CalApiSuccess<T> | CalApiErrorPayload | null = null;

  try {
    payload = (await response.json()) as CalApiSuccess<T> | CalApiErrorPayload;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.status === "error" || !payload || !("data" in payload)) {
    throw new CalApiError(getCalErrorMessage(payload), response.status || 502);
  }

  return payload.data;
}

function getFallbackUsernameFromLink() {
  const normalizedCalLink = normalizeCalLink(contactContent.calLink);

  if (!normalizedCalLink) {
    return null;
  }

  const [username] = normalizedCalLink.split("/");
  return username || null;
}

function selectDefaultEventType(eventTypes: CalWidgetEventType[]) {
  const preferredSlug = getCalEventSlug(contactContent.calLink);

  if (preferredSlug) {
    const preferredEvent = eventTypes.find((eventType) => eventType.slug === preferredSlug);
    if (preferredEvent) {
      return preferredEvent;
    }
  }

  return eventTypes[0] ?? null;
}

function mapEventType(eventType: RawCalEventType): CalWidgetEventType {
  return {
    id: eventType.id,
    title: eventType.title,
    slug: eventType.slug,
    description: eventType.description?.trim() || "",
    lengthInMinutes: eventType.lengthInMinutes,
    bookingUrl: eventType.bookingUrl || getCalPageHref(eventType.users?.[0]?.username ? `${eventType.users[0].username}/${eventType.slug}` : eventType.slug),
    username: eventType.users?.[0]?.username ?? null,
    locations: eventType.locations ?? [],
    bookingFields: eventType.bookingFields ?? [],
  };
}

export async function getCalWidgetOverview(): Promise<CalWidgetOverview> {
  const [profile, rawEventTypes] = await Promise.all([
    fetchCal<RawCalProfile>({
      path: "/me",
      version: CAL_API_VERSIONS.me,
    }),
    fetchCal<RawCalEventType[]>({
      path: "/event-types",
      version: CAL_API_VERSIONS.eventTypes,
    }),
  ]);

  const eventTypes = rawEventTypes
    .filter((eventType) => !eventType.hidden && !eventType.bookingRequiresAuthentication)
    .map(mapEventType);

  const defaultEventType = selectDefaultEventType(eventTypes);
  const username = profile.username ?? eventTypes[0]?.username ?? getFallbackUsernameFromLink();
  const normalizedCalLink = normalizeCalLink(contactContent.calLink);

  return {
    username,
    timeZone: profile.timeZone || "UTC",
    profileUrl: normalizedCalLink ? getCalPageHref(normalizedCalLink) : getCalPageHref(username || ""),
    eventTypes,
    defaultEventTypeId: defaultEventType?.id ?? null,
  };
}

export async function getCalSlots(input: {
  eventTypeId: number;
  start: string;
  end: string;
  timeZone: string;
}) {
  return fetchCal<CalSlotMap>({
    path: "/slots",
    version: CAL_API_VERSIONS.slots,
    searchParams: {
      eventTypeId: input.eventTypeId,
      start: input.start,
      end: input.end,
      timeZone: input.timeZone,
    },
  });
}

export async function createCalBooking(input: CreateCalBookingInput) {
  return fetchCal<RawCalBooking>({
    path: "/bookings",
    version: CAL_API_VERSIONS.bookings,
    method: "POST",
    body: {
      start: new Date(input.start).toISOString(),
      eventTypeId: input.eventTypeId,
      attendee: input.attendee,
      ...(input.bookingFieldsResponses ? { bookingFieldsResponses: input.bookingFieldsResponses } : {}),
      ...(input.location ? { location: input.location } : {}),
    },
  });
}

export function getBookingLocationLabel(location: unknown) {
  if (typeof location === "string") {
    return location;
  }

  if (!location || typeof location !== "object") {
    return null;
  }

  const maybeLocation = location as CalLocation;
  return maybeLocation.address || maybeLocation.link || maybeLocation.integration || maybeLocation.type || null;
}
