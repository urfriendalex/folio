"use client";

import { useSyncExternalStore } from "react";
import {
  getPerfExperimentRevision,
  isAsciiPerfOff,
  isPerfOff,
  subscribePerfExperiments,
  type PerfExperimentFlag,
} from "@/lib/perfExperiments";

function usePerfExperimentRevision(): number {
  return useSyncExternalStore(
    subscribePerfExperiments,
    getPerfExperimentRevision,
    () => 0,
  );
}

/** Re-renders when perf flags change (for live debug panel toggles). */
export function usePerfOff(flag: PerfExperimentFlag): boolean {
  usePerfExperimentRevision();
  return isPerfOff(flag);
}

export function useAsciiPerfOff(
  scope: "preloader-ascii" | "footer-ascii" | "hero-walker" | "not-found-ascii",
): boolean {
  usePerfExperimentRevision();
  return isAsciiPerfOff(scope);
}
