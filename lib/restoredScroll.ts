"use client";

import { useSyncExternalStore } from "react";
import { isReloadNavigation } from "@/lib/navigationType";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  if (!isReloadNavigation()) {
    return false;
  }

  return window.scrollY > window.innerHeight * 0.5;
}

export function useRestoredScrollBypass(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
