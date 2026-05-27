"use client";

import { PerfDebugControls } from "./PerfDebugControls";

/** Root-level mount so the panel sits above footer chrome and all routes. */
export function PerfDebugMount() {
  return <PerfDebugControls />;
}
