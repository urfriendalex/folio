import { isFolioCallDuration } from "@/lib/cal/folioEventTypes";
import { buildCalendarDraft, buildIcs, CALL_ICS_FILENAME, sanitizeMeetingUrl } from "@/lib/calendar/ics";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start")?.trim() || "";
  const minutes = Number(searchParams.get("minutes"));
  const uid = searchParams.get("uid")?.trim() || "";
  const download = searchParams.get("download") === "1";
  const meetingUrl = sanitizeMeetingUrl(searchParams.get("url"));

  if (!start || !isFolioCallDuration(minutes) || uid.length > 200) {
    return Response.json({ error: "Invalid calendar event." }, { status: 400 });
  }

  if (searchParams.get("url")?.trim() && !meetingUrl) {
    return Response.json({ error: "Invalid meeting link." }, { status: 400 });
  }

  const draft = buildCalendarDraft({
    startIso: start,
    lengthInMinutes: minutes,
    meetingUrl,
    uid: uid || null,
  });

  if (!draft) {
    return Response.json({ error: "Invalid calendar event." }, { status: 400 });
  }

  const ics = buildIcs(draft);
  const disposition = download ? "attachment" : "inline";

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `${disposition}; filename="${CALL_ICS_FILENAME}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
