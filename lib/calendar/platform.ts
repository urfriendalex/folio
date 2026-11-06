export type CalendarSurface = "ios" | "macos-safari" | "android" | "desktop";

export type DesktopOs = "mac" | "windows" | "chromeos" | "linux" | "other";

export type CalendarOptionId = "google" | "outlook-live" | "outlook-office" | "ics";

export const CALENDAR_MENU_OPTIONS: ReadonlyArray<{ id: CalendarOptionId; label: string }> = [
  { id: "google", label: "Google Calendar" },
  { id: "outlook-live", label: "Outlook (live)" },
  { id: "outlook-office", label: "Outlook (office)" },
  { id: "ics", label: "Apple Calendar (.ics)" },
];

const IOS_DEVICE_RE = /iPad|iPhone|iPod/;
const SAFARI_EXCLUSION_RE = /Chrome|Chromium|CriOS|Edg|EdgiOS|OPR|OPiOS|Firefox|FxiOS|SamsungBrowser|Android/;

export function detectCalendarSurface(input: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}): CalendarSurface {
  const { userAgent, platform, maxTouchPoints } = input;
  const iPadOsDesktop = platform === "MacIntel" && maxTouchPoints > 1;

  if (IOS_DEVICE_RE.test(userAgent) || iPadOsDesktop) {
    return "ios";
  }

  if (/Android/i.test(userAgent)) {
    return "android";
  }

  const isMac = /Mac/i.test(platform) || /Macintosh|Mac OS X/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !SAFARI_EXCLUSION_RE.test(userAgent);

  if (isMac && isSafari) {
    return "macos-safari";
  }

  return "desktop";
}

export function detectDesktopOs(input: { userAgent: string; platform: string }): DesktopOs {
  const { userAgent, platform } = input;

  if (/CrOS/i.test(userAgent)) {
    return "chromeos";
  }

  if (/Win/i.test(platform) || /Windows/i.test(userAgent)) {
    return "windows";
  }

  if (/Mac/i.test(platform) || /Macintosh|Mac OS X/i.test(userAgent)) {
    return "mac";
  }

  if (/Linux/i.test(platform) || /Linux/i.test(userAgent)) {
    return "linux";
  }

  return "other";
}

/** Direct action on phones and macOS Safari. Other desktops get the menu. */
export function usesCalendarMenu(surface: CalendarSurface): boolean {
  return surface === "desktop";
}

/**
 * Best calendar for the device. Windows prefers Outlook.com (personal accounts
 * booking a freelance call); Microsoft 365 stays in the menu as Outlook (office).
 */
export function defaultCalendarOption(surface: CalendarSurface, os: DesktopOs): CalendarOptionId {
  if (surface === "ios" || surface === "macos-safari") {
    return "ics";
  }

  if (surface === "android") {
    return "google";
  }

  if (os === "mac") {
    return "ics";
  }

  if (os === "windows") {
    return "outlook-live";
  }

  return "google";
}

export function orderedCalendarOptions(preferred: CalendarOptionId) {
  const match = CALENDAR_MENU_OPTIONS.find((option) => option.id === preferred) ?? CALENDAR_MENU_OPTIONS[0];
  return [match, ...CALENDAR_MENU_OPTIONS.filter((option) => option.id !== match.id)];
}
