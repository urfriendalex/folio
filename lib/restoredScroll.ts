"use client";

import { useSyncExternalStore } from "react";
import { isReloadNavigation } from "@/lib/navigationType";

const HOME_HISTORY_POP_REVEAL_KEY = "folio:history-pop-home";

const listeners = new Set<() => void>();
let documentPopListenerInstalled = false;

function installDocumentPopListener() {
  if (documentPopListenerInstalled || typeof window === "undefined") {
    return;
  }

  documentPopListenerInstalled = true;

  window.addEventListener("popstate", () => {
    if (window.location.pathname !== "/") {
      return;
    }

    try {
      sessionStorage.setItem(HOME_HISTORY_POP_REVEAL_KEY, "1");
    } catch {
      // ignore quota / private mode
    }

    listeners.forEach((listener) => {
      listener();
    });
  });
}

function subscribe(onStoreChange: () => void) {
  installDocumentPopListener();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function serverSnapshot(): boolean {
  return false;
}

/** Drop one-shot SPA “back to home” flag when leaving `/` or when intentionally scrolling to top. */
export function clearHomeHistoryPopReveal() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.removeItem(HOME_HISTORY_POP_REVEAL_KEY);
  } catch {
    // ignore
  }
}

export function peekHomeHistoryPopReveal(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return sessionStorage.getItem(HOME_HISTORY_POP_REVEAL_KEY) === "1";
  } catch {
    return false;
  }
}

function getSnapshot(): boolean {
  if (peekHomeHistoryPopReveal()) {
    return true;
  }

  if (!isReloadNavigation()) {
    return false;
  }

  return window.scrollY > window.innerHeight * 0.5;
}

/**
 * Bypass heavy entrance reveals when scroll was restored mid-page or when returning to `/` via history.
 */
export function useRestoredScrollBypass(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
}
