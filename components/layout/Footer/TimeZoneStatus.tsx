"use client";

import { useSyncExternalStore } from "react";

const SERVER_TICK = 0;
const PLACEHOLDER_TIME = "--:--:--";
const PLACEHOLDER_DATE_TIME = "-- --- ----, --:--:--";
const WARSAW_TIME_ZONE = "Europe/Warsaw";

export type TimeZoneStatusSnapshot = {
  warsawTime: string;
  warsawDateTime: string;
  visitorTime: string;
  visitorDateTime: string;
  /** `HH:mm:ss WAW` — same format as taskbar + mobile nav studio clock */
  warsawClockLine: string;
  /** `HH:mm:ss` + short zone (e.g. `EST`) — ticks in sync with studio clock */
  visitorClockLine: string;
  visitorTimeZone: string;
  offsetLabel: string;
  offsetMinutes: number;
};

function subscribeClock(onStoreChange: () => void) {
  const interval = window.setInterval(onStoreChange, 1000);
  return () => window.clearInterval(interval);
}

function getClockTick() {
  return Math.floor(Date.now() / 1000);
}

function getServerClockTick() {
  return SERVER_TICK;
}

function formatTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDateTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatWarsawClockLine(date: Date) {
  return `${formatTime(date, WARSAW_TIME_ZONE)} WAW`;
}

function formatVisitorClockLine(date: Date, visitorTimeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: visitorTimeZone,
    timeZoneName: "short",
  }).formatToParts(date);
  const tzShort = parts.find((part) => part.type === "timeZoneName")?.value?.trim() ?? "";
  const time = formatTime(date, visitorTimeZone);
  return tzShort ? `${time} ${tzShort}` : time;
}

function formatOffsetLabel(diffMinutes: number) {
  if (diffMinutes === 0) {
    return "Same time as Warsaw";
  }

  const sign = diffMinutes > 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  if (minutes === 0) {
    return `${sign}${hours}h from Warsaw`;
  }

  return `${sign}${hours}h ${minutes}m from Warsaw`;
}

function getPlaceholderSnapshot(): TimeZoneStatusSnapshot {
  return {
    warsawTime: PLACEHOLDER_TIME,
    warsawDateTime: PLACEHOLDER_DATE_TIME,
    visitorTime: PLACEHOLDER_TIME,
    visitorDateTime: PLACEHOLDER_DATE_TIME,
    warsawClockLine: `${PLACEHOLDER_TIME} WAW`,
    visitorClockLine: PLACEHOLDER_TIME,
    visitorTimeZone: "Resolving local timezone...",
    offsetLabel: "Comparing with Warsaw...",
    offsetMinutes: 0,
  };
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
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(date);

  const timeZoneName = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+0";
  return parseOffset(timeZoneName);
}

export function useTimeZoneStatus(): TimeZoneStatusSnapshot {
  const tick = useSyncExternalStore(subscribeClock, getClockTick, getServerClockTick);

  if (tick === SERVER_TICK) {
    return getPlaceholderSnapshot();
  }

  const now = new Date(tick * 1000);
  const visitorTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local timezone";
  const warsawOffset = getOffset(now, WARSAW_TIME_ZONE);
  const visitorOffset = getOffset(now, visitorTimeZone);
  const offsetMinutes = visitorOffset - warsawOffset;

  return {
    warsawTime: formatTime(now, WARSAW_TIME_ZONE),
    warsawDateTime: formatDateTime(now, WARSAW_TIME_ZONE),
    visitorTime: formatTime(now, visitorTimeZone),
    visitorDateTime: formatDateTime(now, visitorTimeZone),
    warsawClockLine: formatWarsawClockLine(now),
    visitorClockLine: formatVisitorClockLine(now, visitorTimeZone),
    visitorTimeZone,
    offsetLabel: formatOffsetLabel(offsetMinutes),
    offsetMinutes,
  };
}
