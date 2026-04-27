import {
  CalApiError,
  createCalBooking,
  getBookingLocationLabel,
  getCalWidgetOverview,
  type CalLocation,
} from "@/lib/cal/api";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 160;
const MAX_NOTES = 2000;

type BookingPayload = {
  eventTypeId?: unknown;
  start?: unknown;
  name?: unknown;
  email?: unknown;
  notes?: unknown;
  timeZone?: unknown;
  location?: unknown;
};

function toErrorResponse(error: unknown) {
  if (error instanceof CalApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  return Response.json({ error: "Could not load booking data." }, { status: 500 });
}

function parseBookingPayload(body: BookingPayload) {
  const eventTypeId = typeof body.eventTypeId === "number" ? body.eventTypeId : Number(body.eventTypeId);
  const start = typeof body.start === "string" ? body.start.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const timeZone = typeof body.timeZone === "string" && body.timeZone.trim() ? body.timeZone.trim() : "UTC";
  const location =
    body.location && typeof body.location === "object" && !Array.isArray(body.location)
      ? (body.location as CalLocation)
      : undefined;

  if (!Number.isFinite(eventTypeId) || eventTypeId < 1) {
    return { ok: false as const, error: "Pick an event type first." };
  }

  if (!start || Number.isNaN(Date.parse(start))) {
    return { ok: false as const, error: "Pick a valid time slot." };
  }

  if (name.length > MAX_NAME) {
    return { ok: false as const, error: "Keep your name a little shorter." };
  }

  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return { ok: false as const, error: "Enter a valid email address." };
  }

  if (notes.length > MAX_NOTES) {
    return { ok: false as const, error: "Keep the note a little shorter." };
  }

  return {
    ok: true as const,
    eventTypeId,
    start,
    name: name || email.split("@")[0] || "Guest",
    email,
    notes,
    timeZone,
    location,
  };
}

export async function GET() {
  try {
    return Response.json(await getCalWidgetOverview());
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  let body: BookingPayload;

  try {
    body = (await request.json()) as BookingPayload;
  } catch {
    return Response.json({ error: "Invalid booking request." }, { status: 400 });
  }

  const parsed = parseBookingPayload(body);

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const booking = await createCalBooking({
      eventTypeId: parsed.eventTypeId,
      start: parsed.start,
      attendee: {
        name: parsed.name,
        email: parsed.email,
        timeZone: parsed.timeZone,
      },
      ...(parsed.notes ? { bookingFieldsResponses: { notes: parsed.notes } } : {}),
      ...(parsed.location ? { location: parsed.location } : {}),
    });

    return Response.json({
      ok: true,
      booking: {
        uid: booking.uid ?? null,
        title: booking.title ?? null,
        start: booking.start ?? parsed.start,
        end: booking.end ?? null,
        attendeeEmail: booking.attendees?.[0]?.email ?? parsed.email,
        location: getBookingLocationLabel(booking.location),
        meetingUrl: booking.meetingUrl ?? null,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
