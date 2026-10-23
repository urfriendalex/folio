"use client";

import { useSyncExternalStore } from "react";

const SERVER_TICK = 0;
const PLACEHOLDER_TIME = "--:--:--";
const PLACEHOLDER_DATE_TIME = "-- --- ----, --:--:--";
const PLACEHOLDER_DAY = "--- -- ---";
const WARSAW_TIME_ZONE = "Europe/Warsaw";

/**
 * Shared tick stores. Ticks land on the wall-clock boundary (no drift / no up-to-1s lag) and stop
 * while the tab is hidden; one timer per unit no matter how many clocks are mounted.
 */
function createTickStore(unitMs: number) {
  const listeners = new Set<() => void>();
  let timer = 0;

  const notify = () => listeners.forEach((listener) => listener());
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      notify();
      schedule();
    }, unitMs - (Date.now() % unitMs) + 4);
  };
  const onVisibilityChange = () => {
    if (document.hidden) {
      window.clearTimeout(timer);
      return;
    }
    notify();
    schedule();
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        schedule();
        document.addEventListener("visibilitychange", onVisibilityChange);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.clearTimeout(timer);
          document.removeEventListener("visibilitychange", onVisibilityChange);
        }
      };
    },
    getSnapshot: () => Math.floor(Date.now() / unitMs),
  };
}

const secondTicks = createTickStore(1000);
const minuteTicks = createTickStore(60_000);

function getServerClockTick() {
  return SERVER_TICK;
}

/** `Intl.DateTimeFormat` construction is the expensive part — build each shape once per zone. */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function cachedFormatter(key: string, timeZone: string, options: Intl.DateTimeFormatOptions, locale = "en-GB") {
  const cacheKey = `${key}|${timeZone}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { timeZone, ...options });
    formatterCache.set(cacheKey, formatter);
  }
  return formatter;
}

function formatTime(date: Date, timeZone: string) {
  return cachedFormatter("time", timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDateTime(date: Date, timeZone: string) {
  return cachedFormatter("dateTime", timeZone, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/** `Fri 23 Oct` — short enough to sit beside a time without wrapping. */
function formatDay(date: Date, timeZone: string) {
  return cachedFormatter("day", timeZone, { weekday: "short", day: "numeric", month: "short" }).format(date);
}

/** Calendar date as a sortable `YYYY-MM-DD` key (`en-CA` formats ISO-style). */
function dateKey(date: Date, timeZone: string) {
  return cachedFormatter("dateKey", timeZone, { year: "numeric", month: "2-digit", day: "2-digit" }, "en-CA").format(date);
}

/** Visitor's calendar day relative to Warsaw's: -1 (yesterday), 0, or 1 (tomorrow). */
function getDayShift(date: Date, visitorTimeZone: string) {
  const visitor = dateKey(date, visitorTimeZone);
  const warsaw = dateKey(date, WARSAW_TIME_ZONE);
  return visitor === warsaw ? 0 : visitor > warsaw ? 1 : -1;
}

function getVisitorTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || WARSAW_TIME_ZONE;
}

/** `America/New_York` → `New York`, `America/Argentina/Buenos_Aires` → `Buenos Aires`. */
export function formatTimeZonePlace(timeZone: string) {
  const place = timeZone.split("/").pop() ?? timeZone;
  return place.replace(/_/g, " ");
}

function formatWarsawClockLine(date: Date) {
  return `${formatTime(date, WARSAW_TIME_ZONE)} WAW`;
}

function formatVisitorClockLine(date: Date, visitorTimeZone: string) {
  const parts = cachedFormatter("zoneName", visitorTimeZone, { timeZoneName: "short" }).formatToParts(date);
  const tzShort = parts.find((part) => part.type === "timeZoneName")?.value?.trim() ?? "";
  const time = formatTime(date, visitorTimeZone);
  return tzShort ? `${time} ${tzShort}` : time;
}

function formatOffsetLabel(diffMinutes: number) {
  if (diffMinutes === 0) {
    return "";
  }

  const relation = diffMinutes > 0 ? "ahead of Warsaw" : "behind Warsaw";
  const absoluteMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  const hourLabel = hours === 1 ? "hour" : "hours";
  const minuteLabel = minutes === 1 ? "minute" : "minutes";

  if (hours === 0) {
    return `${minutes} ${minuteLabel} ${relation}`;
  }

  if (minutes === 0) {
    return `${hours} ${hourLabel} ${relation}`;
  }

  return `${hours} ${hourLabel} ${minutes} ${minuteLabel} ${relation}`;
}

function parseOffset(value: string) {
  const match = value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);

  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2] ?? "0", 10);
  const minutes = Number.parseInt(match[3] ?? "0", 10);

  return sign * (hours * 60 + minutes);
}

function getOffset(date: Date, timeZone: string) {
  const parts = cachedFormatter("offset", timeZone, { timeZoneName: "shortOffset" }, "en-US").formatToParts(date);

  const timeZoneName = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+0";
  return parseOffset(timeZoneName);
}


export type TimeZoneInfo = {
  /** `null` until hydrated (server render can't know the visitor's zone). */
  visitorTimeZone: string | null;
  offsetMinutes: number;
  /** `6 hours behind Warsaw`; empty when the offsets match. */
  offsetLabel: string;
};

/**
 * Zone + offset only — re-renders once a minute (offset can change at DST), never per second.
 * Pair with `<LiveClock>` so only the ticking text re-renders, not the whole footer/navbar.
 */
export function useTimeZoneInfo(): TimeZoneInfo {
  const tick = useSyncExternalStore(minuteTicks.subscribe, minuteTicks.getSnapshot, getServerClockTick);

  if (tick === SERVER_TICK) {
    return { visitorTimeZone: null, offsetMinutes: 0, offsetLabel: "" };
  }

  const now = new Date(tick * 60_000);
  const visitorTimeZone = getVisitorTimeZone();
  const offsetMinutes = getOffset(now, visitorTimeZone) - getOffset(now, WARSAW_TIME_ZONE);
  return { visitorTimeZone, offsetMinutes, offsetLabel: formatOffsetLabel(offsetMinutes) };
}

type LiveClockFormat =
  /** `HH:mm:ss` */
  | "time"
  /** `HH:mm:ss WAW` (warsaw) / `HH:mm:ss CEST` (visitor) */
  | "line"
  /** `15 Oct 2026, 14:03:09` */
  | "dateTime"
  /** `Thu 15 Oct` */
  | "day";

/** A single ticking text node: the only thing that re-renders every second. */
export function LiveClock({
  zone,
  format = "line",
  className,
}: {
  zone: "warsaw" | "visitor";
  format?: LiveClockFormat;
  className?: string;
}) {
  const tick = useSyncExternalStore(secondTicks.subscribe, secondTicks.getSnapshot, getServerClockTick);
  let text: string;

  if (tick === SERVER_TICK) {
    text =
      format === "dateTime"
        ? PLACEHOLDER_DATE_TIME
        : format === "day"
          ? PLACEHOLDER_DAY
        : format === "line" && zone === "warsaw"
          ? `${PLACEHOLDER_TIME} WAW`
          : PLACEHOLDER_TIME;
  } else {
    const now = new Date(tick * 1000);
    const timeZone = zone === "warsaw" ? WARSAW_TIME_ZONE : getVisitorTimeZone();
    if (format === "dateTime") {
      text = formatDateTime(now, timeZone);
    } else if (format === "day") {
      text = formatDay(now, timeZone);
    } else if (format === "time") {
      text = formatTime(now, timeZone);
    } else {
      text = zone === "warsaw" ? formatWarsawClockLine(now) : formatVisitorClockLine(now, timeZone);
    }
  }

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}

/**
 * `+1 day` / `−1 day` beside the visitor's clock when their calendar date differs from Warsaw's.
 * Minute ticks land on the minute boundary, so it still flips exactly at midnight without
 * re-rendering every second; renders nothing on the server or on the same day.
 */
export function DayShift({ className }: { className?: string }) {
  const tick = useSyncExternalStore(minuteTicks.subscribe, minuteTicks.getSnapshot, getServerClockTick);

  if (tick === SERVER_TICK) {
    return null;
  }

  const shift = getDayShift(new Date(tick * 60_000), getVisitorTimeZone());

  if (shift === 0) {
    return null;
  }

  return (
    <span className={className}>
      {shift > 0 ? "+1 day" : "\u22121 day"}
    </span>
  );
}
