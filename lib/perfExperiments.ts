/**
 * Bisect scroll jank via URL: `?perf-off=lenis` or `?perf-off=lenis,footer-ascii`
 *
 * Flags:
 * - lenis — smooth scroll RAF loop
 * - navbar-blur — header gradient blur stack
 * - reveals — scroll / line reveal animations
 * - ascii — all ASCIIAnimation instances
 * - preloader-ascii | footer-ascii | hero-walker | not-found-ascii — per instance
 */

export type PerfExperimentFlag =
  | "lenis"
  | "navbar-blur"
  | "reveals"
  | "ascii"
  | "preloader-ascii"
  | "footer-ascii"
  | "hero-walker"
  | "not-found-ascii";

let disabledCache: Set<string> | null = null;

function getDisabled(): Set<string> {
  if (disabledCache !== null) {
    return disabledCache;
  }

  if (typeof window === "undefined") {
    disabledCache = new Set();
    return disabledCache;
  }

  const raw = new URLSearchParams(window.location.search).get("perf-off");
  if (!raw) {
    disabledCache = new Set();
    return disabledCache;
  }

  disabledCache = new Set(
    raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
  return disabledCache;
}

export function isPerfOff(flag: PerfExperimentFlag): boolean {
  return getDisabled().has(flag);
}

export function isAsciiPerfOff(
  scope: "preloader-ascii" | "footer-ascii" | "hero-walker" | "not-found-ascii",
): boolean {
  const disabled = getDisabled();
  return disabled.has("ascii") || disabled.has(scope);
}

export function getActivePerfOffFlags(): PerfExperimentFlag[] {
  const disabled = getDisabled();
  const order: PerfExperimentFlag[] = [
    "lenis",
    "navbar-blur",
    "reveals",
    "ascii",
    "preloader-ascii",
    "footer-ascii",
    "hero-walker",
    "not-found-ascii",
  ];
  return order.filter((flag) => disabled.has(flag));
}
