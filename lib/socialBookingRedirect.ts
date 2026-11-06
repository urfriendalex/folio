import { SCHEDULE_CALL_HASH } from "../components/booking/calBooking";

const BOOKING_PATHS = new Set(["/book", "/schedule-call"]);

type RedirectSource = {
  href: string;
  pathname: string;
  searchParams: { get(name: string): string | null };
};

/**
 * Social apps percent-encode `#`, so a shared `/#schedule-call` link is
 * requested as the path `/%23schedule-call` and 404s. Map that (and `/book`,
 * `/schedule-call`, `?schedule=call`) back onto the hash the booking overlay
 * already opens.
 */
export function redirectForSocialBooking(
  input: RedirectSource,
  scheduleCallHash = SCHEDULE_CALL_HASH,
): URL | null {
  // Leave framework and API traffic alone, including odd queries on those paths.
  if (
    input.pathname.startsWith("/_next/") ||
    input.pathname === "/api" ||
    input.pathname.startsWith("/api/")
  ) {
    return null;
  }

  const next = new URL(input.href);
  const encodedHash = hashEncodedInPath(input.pathname);

  if (encodedHash) {
    next.pathname = encodedHash.pathname;
    next.hash = encodedHash.hash;
    next.searchParams.delete("schedule");
    return next;
  }

  if (BOOKING_PATHS.has(stripTrailingSlashes(input.pathname))) {
    next.pathname = "/";
    next.hash = scheduleCallHash;
    next.searchParams.delete("schedule");
    return next;
  }

  if (input.searchParams.get("schedule") === "call" && !hasFileExtension(input.pathname)) {
    next.hash = scheduleCallHash;
    next.searchParams.delete("schedule");
    return next;
  }

  return null;
}

function hashEncodedInPath(pathname: string): { pathname: string; hash: string } | null {
  let decoded = pathname;

  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Invalid percent-encoding cannot be an encoded hash fragment.
    return null;
  }

  const hashIndex = decoded.indexOf("#");

  if (hashIndex === -1) {
    return null;
  }

  const hash = decoded.slice(hashIndex + 1).replace(/\/+$/, "");

  if (!hash) {
    return null;
  }

  const barePath = decoded.slice(0, hashIndex) || "/";

  return {
    pathname: barePath.startsWith("/") ? barePath : `/${barePath}`,
    hash,
  };
}

function stripTrailingSlashes(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "") || "/";
  }

  return pathname;
}

function hasFileExtension(pathname: string): boolean {
  const lastSegment = pathname.split("/").pop() ?? "";
  return lastSegment.includes(".");
}
