"use client";

import { useSyncExternalStore } from "react";
import { getActivePerfOffFlags } from "@/lib/perfExperiments";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getSnapshot(): string[] {
  return getActivePerfOffFlags();
}

function getServerSnapshot(): string[] {
  return [];
}

export function PerfExperimentIndicator() {
  const flags = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (flags.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "0.5rem",
        left: "0.5rem",
        zIndex: 99999,
        padding: "0.35rem 0.55rem",
        fontSize: "0.65rem",
        fontFamily: "ui-monospace, monospace",
        lineHeight: 1.35,
        color: "#f3f1ea",
        background: "rgb(16 16 16 / 0.88)",
        borderRadius: "0.35rem",
        pointerEvents: "none",
        maxWidth: "min(22rem, 92vw)",
      }}
      aria-live="polite"
    >
      perf-off: {flags.join(", ")}
    </div>
  );
}
