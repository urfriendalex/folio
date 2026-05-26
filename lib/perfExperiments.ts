/**
 * Bisect scroll jank — URL `?perf-off=lenis`, localStorage, or the perf debug panel.
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

export type PerfExperimentOption = {
  flag: PerfExperimentFlag;
  label: string;
  hint: string;
  /** Full page reload recommended when toggling (e.g. Lenis init). */
  reloadRecommended?: boolean;
};

export const PERF_EXPERIMENT_OPTIONS: PerfExperimentOption[] = [
  {
    flag: "lenis",
    label: "Lenis",
    hint: "Smooth scroll RAF loop (reload after toggle)",
    reloadRecommended: true,
  },
  {
    flag: "navbar-blur",
    label: "Navbar blur",
    hint: "8-layer header backdrop-filter stack",
  },
  {
    flag: "reveals",
    label: "Reveals",
    hint: "Scroll / line reveal CSS transitions",
  },
  {
    flag: "ascii",
    label: "All ASCII",
    hint: "Every ASCIIAnimation instance",
  },
  {
    flag: "preloader-ascii",
    label: "Preloader ASCII",
    hint: "Loading screen walker",
  },
  {
    flag: "footer-ascii",
    label: "Footer ASCII",
    hint: "Taskbar hover color canvas",
  },
  {
    flag: "hero-walker",
    label: "Hero walker",
    hint: "Headline hover ASCII",
  },
  {
    flag: "not-found-ascii",
    label: "404 ASCII",
    hint: "Not-found window animation",
  },
];

const STORAGE_KEY = "folio-perf-off";
const PERF_DEBUG_STORAGE_KEY = "folio-perf-debug-open";

const PERF_EVENT = "folio:perf-experiments";

let revision = 0;
let disabledLive: Set<string> | null = null;

function parseFlags(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

function readDisabledFromSources(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }

  const urlRaw = new URLSearchParams(window.location.search).get("perf-off");
  if (urlRaw !== null && urlRaw.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, urlRaw);
    } catch {
      // ignore
    }
    return parseFlags(urlRaw);
  }

  if (urlRaw === "") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return new Set();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return parseFlags(stored);
    }
  } catch {
    // ignore
  }

  return new Set();
}

function getDisabled(): Set<string> {
  if (disabledLive === null) {
    disabledLive = readDisabledFromSources();
  }
  return disabledLive;
}

function flagsToQueryValue(flags: Set<string>): string {
  const order = PERF_EXPERIMENT_OPTIONS.map((option) => option.flag);
  return order.filter((flag) => flags.has(flag)).join(",");
}

function syncUrl(flags: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  const value = flagsToQueryValue(flags);

  if (value) {
    url.searchParams.set("perf-off", value);
  } else {
    url.searchParams.delete("perf-off");
  }

  window.history.replaceState(window.history.state, "", url.toString());
}

function persist(flags: Set<string>) {
  try {
    const value = flagsToQueryValue(flags);
    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function bumpRevision() {
  revision += 1;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PERF_EVENT));
  }
}

export function getPerfExperimentRevision(): number {
  return revision;
}

export function subscribePerfExperiments(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => onStoreChange();
  window.addEventListener(PERF_EVENT, handler);
  window.addEventListener("popstate", handler);

  return () => {
    window.removeEventListener(PERF_EVENT, handler);
    window.removeEventListener("popstate", handler);
  };
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
  return PERF_EXPERIMENT_OPTIONS.map((option) => option.flag).filter((flag) =>
    disabled.has(flag),
  );
}

export function setPerfFlagEnabled(flag: PerfExperimentFlag, enabled: boolean): boolean {
  const next = new Set(getDisabled());
  const changed = enabled ? !next.has(flag) : next.has(flag);

  if (enabled) {
    next.add(flag);
  } else {
    next.delete(flag);
  }

  disabledLive = next;
  persist(next);
  syncUrl(next);
  bumpRevision();

  return changed;
}

export function clearPerfFlags(): void {
  disabledLive = new Set();
  persist(disabledLive);
  syncUrl(disabledLive);
  bumpRevision();
}

export function buildPerfOffShareUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const flags = getActivePerfOffFlags();
  const url = new URL(window.location.href);

  if (flags.length) {
    url.searchParams.set("perf-off", flags.join(","));
  } else {
    url.searchParams.delete("perf-off");
  }

  url.searchParams.set("perf-debug", "1");
  return url.toString();
}

export function isPerfDebugPanelEnabled(): boolean {
  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "development";
  }

  if (process.env.NODE_ENV === "development") {
    return true;
  }

  if (new URLSearchParams(window.location.search).get("perf-debug") === "1") {
    return true;
  }

  try {
    return localStorage.getItem(PERF_DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPerfDebugPanelOpen(open: boolean): void {
  try {
    if (open) {
      localStorage.setItem(PERF_DEBUG_STORAGE_KEY, "1");
    } else {
      localStorage.removeItem(PERF_DEBUG_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function getPerfDebugPanelOpenPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return localStorage.getItem(PERF_DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
