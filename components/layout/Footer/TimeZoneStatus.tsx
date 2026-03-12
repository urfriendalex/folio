"use client";

import { useSyncExternalStore } from "react";

const SERVER_LABEL = "Loading timezone...";

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

export function TimeZoneStatus() {
  const label = useSyncExternalStore(
    () => () => {},
    () => {
      const now = new Date();
      const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const warsawOffset = getOffset(now, "Europe/Warsaw");
      const localOffset = getOffset(now, localTimeZone);
      const diffHours = (localOffset - warsawOffset) / 60;

      if (diffHours === 0) {
        return `${localTimeZone} / same as Warsaw`;
      }

      const prefix = diffHours > 0 ? "+" : "";
      return `${localTimeZone} / ${prefix}${diffHours}h from Warsaw`;
    },
    () => SERVER_LABEL,
  );

  return <span>{label}</span>;
}
