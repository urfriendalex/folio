"use client";

import { useSyncExternalStore } from "react";

function subscribeClientMounted() {
  return () => {};
}

function clientMountedSnapshot() {
  return true;
}

function clientMountedServerSnapshot() {
  return false;
}

/** False during SSR + hydration; true after the client commits. */
export function useClientMounted(): boolean {
  return useSyncExternalStore(
    subscribeClientMounted,
    clientMountedSnapshot,
    clientMountedServerSnapshot,
  );
}
