import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isFolioCallEventType } from "../cal/folioEventTypes";
import {
  buildCalendarDraft,
  buildGoogleCalendarUrl,
  buildIcs,
  buildOutlookCalendarUrl,
  escapeIcsText,
  foldIcsLine,
} from "./ics";
import {
  defaultCalendarOption,
  detectCalendarSurface,
  detectDesktopOs,
  orderedCalendarOptions,
} from "./platform";

const encoder = new TextEncoder();

describe("folio call event filter", () => {
  it("keeps 15 and 30 minute folio calls", () => {
    assert.equal(isFolioCallEventType({ slug: "15min", title: "15 min meeting", lengthInMinutes: 15 }), true);
    assert.equal(isFolioCallEventType({ slug: "30min", title: "30 min meeting", lengthInMinutes: 30 }), true);
  });

  it("drops the fullcourse.studio event, including the live cource slug", () => {
    assert.equal(
      isFolioCallEventType({
        slug: "full-cource-studio-online-meeting",
        title: "FULL COURCE STUDIO | ONLINE MEETING",
        lengthInMinutes: 30,
      }),
      false,
    );
    assert.equal(
      isFolioCallEventType({
        slug: "studio-intro",
        title: "Intro",
        description: "A call for fullcourse.studio clients",
        lengthInMinutes: 15,
      }),
      false,
    );
    assert.equal(
      isFolioCallEventType({
        slug: "full-course",
        title: "Full Course",
        bookingUrl: "https://cal.com/yansons/full-course",
        lengthInMinutes: 30,
      }),
      false,
    );
  });

  it("drops every duration other than 15 or 30", () => {
    assert.equal(isFolioCallEventType({ slug: "intro", title: "Intro", lengthInMinutes: 20 }), false);
    assert.equal(isFolioCallEventType({ slug: "45min", title: "45 min meeting", lengthInMinutes: 45 }), false);
    assert.equal(isFolioCallEventType({ slug: "15min", title: "15 min meeting", lengthInMinutes: 10 }), false);
  });
});

describe("ics", () => {
  const startIso = "2026-11-09T10:30:00+01:00";
  const meetingUrl = "https://meet.google.com/abc-defg-hij";

  it("uses the chosen duration in UTC and escapes, folds, and stamps a uid", () => {
    const draft = buildCalendarDraft({
      startIso,
      lengthInMinutes: 30,
      meetingUrl,
      uid: "book 123",
      now: new Date("2026-11-06T15:00:00.000Z"),
    });

    assert.ok(draft);
    assert.equal(draft.minutes, 30);
    assert.equal(draft.end.toISOString(), "2026-11-09T10:00:00.000Z");
    assert.equal(draft.uid, "book123@yansons.online");
    assert.equal(draft.location, meetingUrl);
    assert.match(draft.description, new RegExp(meetingUrl));

    const ics = buildIcs(draft);
    assert.match(ics, /DTSTART:20261109T093000Z/);
    assert.match(ics, /DTEND:20261109T100000Z/);
    assert.match(ics, /SUMMARY:Call with Alexander Yansons/);
    assert.match(ics, /LOCATION:https:\/\/meet\.google\.com\/abc-defg-hij/);
    assert.match(ics, /URL:https:\/\/meet\.google\.com\/abc-defg-hij/);
    assert.ok(ics.endsWith("\r\n"));

    for (const line of ics.split("\r\n").filter(Boolean)) {
      assert.ok(encoder.encode(line).length <= 75, line);
    }

    const fifteen = buildCalendarDraft({ startIso, lengthInMinutes: 15, meetingUrl, uid: "abc" });
    assert.equal(fifteen && buildIcs(fifteen).includes("DTEND:20261109T094500Z"), true);
  });

  it("escapes punctuation and folds long lines on octet boundaries", () => {
    assert.equal(escapeIcsText("a;b,c\\d\n e"), "a\\;b\\,c\\\\d\\n e");
    const long = `DESCRIPTION:${"é".repeat(40)}`;
    const folded = foldIcsLine(long);
    for (const line of folded.split("\r\n")) {
      assert.ok(encoder.encode(line).length <= 75, line);
      assert.equal(line.endsWith("é") || line.includes("é"), true);
    }
    assert.match(folded, /\r\n /);
  });

  it("builds Google and Outlook links from the same UTC interval", () => {
    const draft = buildCalendarDraft({
      startIso,
      lengthInMinutes: 15,
      meetingUrl,
      uid: "abc",
    });
    assert.ok(draft);

    const google = new URL(buildGoogleCalendarUrl(draft));
    assert.equal(google.searchParams.get("action"), "TEMPLATE");
    assert.equal(google.searchParams.get("dates"), "20261109T093000Z/20261109T094500Z");
    assert.equal(google.searchParams.get("text"), "Call with Alexander Yansons");
    assert.equal(google.searchParams.get("location"), meetingUrl);
    assert.match(google.searchParams.get("details") || "", new RegExp(meetingUrl));

    const live = new URL(buildOutlookCalendarUrl(draft, "live"));
    const office = new URL(buildOutlookCalendarUrl(draft, "office"));
    assert.equal(live.origin, "https://outlook.live.com");
    assert.equal(office.origin, "https://outlook.office.com");
    assert.equal(live.searchParams.get("startdt"), "2026-11-09T09:30:00.000Z");
    assert.equal(live.searchParams.get("enddt"), "2026-11-09T09:45:00.000Z");
    assert.equal(office.searchParams.get("rru"), "addevent");
  });
});

describe("calendar platform", () => {
  const iphone = {
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
  };
  const ipad = {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
    platform: "MacIntel",
    maxTouchPoints: 5,
  };
  const macSafari = {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
    platform: "MacIntel",
    maxTouchPoints: 0,
  };
  const macChrome = {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    platform: "MacIntel",
    maxTouchPoints: 0,
  };
  const windows = {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    platform: "Win32",
    maxTouchPoints: 0,
  };
  const android = {
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    platform: "Linux armv8l",
    maxTouchPoints: 5,
  };

  it("sends iOS and macOS Safari straight to an ics file", () => {
    assert.equal(detectCalendarSurface(iphone), "ios");
    assert.equal(detectCalendarSurface(ipad), "ios");
    assert.equal(detectCalendarSurface(macSafari), "macos-safari");
    assert.equal(defaultCalendarOption("ios", "mac"), "ics");
    assert.equal(defaultCalendarOption("macos-safari", "mac"), "ics");
  });

  it("sends Android to Google Calendar", () => {
    assert.equal(detectCalendarSurface(android), "android");
    assert.equal(defaultCalendarOption("android", "linux"), "google");
  });

  it("orders the desktop menu with the platform default first", () => {
    assert.equal(detectCalendarSurface(macChrome), "desktop");
    assert.equal(detectDesktopOs(macChrome), "mac");
    assert.equal(orderedCalendarOptions(defaultCalendarOption("desktop", "mac"))[0]?.id, "ics");

    assert.equal(detectCalendarSurface(windows), "desktop");
    assert.equal(detectDesktopOs(windows), "windows");
    const windowsMenu = orderedCalendarOptions(defaultCalendarOption("desktop", "windows")).map((option) => option.id);
    assert.deepEqual(windowsMenu, ["outlook-live", "google", "outlook-office", "ics"]);

    assert.equal(defaultCalendarOption("desktop", "linux"), "google");
    assert.equal(defaultCalendarOption("desktop", "chromeos"), "google");
  });
});
