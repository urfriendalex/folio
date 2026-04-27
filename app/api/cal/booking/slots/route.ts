import { CalApiError, getCalSlots } from "@/lib/cal/api";

export const runtime = "nodejs";

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDateKey(date);
}

function toErrorResponse(error: unknown) {
  if (error instanceof CalApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  return Response.json({ error: "Could not load availability." }, { status: 500 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventTypeId = Number(searchParams.get("eventTypeId"));
  const start = searchParams.get("start")?.trim() || formatDateKey(new Date());
  const end = searchParams.get("end")?.trim() || addDays(start, 6);
  const timeZone = searchParams.get("timeZone")?.trim() || "UTC";

  if (!Number.isFinite(eventTypeId) || eventTypeId < 1) {
    return Response.json({ error: "Missing event type." }, { status: 400 });
  }

  if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
    return Response.json({ error: "Invalid date range." }, { status: 400 });
  }

  try {
    const slots = await getCalSlots({
      eventTypeId,
      start,
      end,
      timeZone,
    });

    return Response.json({
      ok: true,
      start,
      end,
      timeZone,
      slots,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
