"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const html = document.documentElement;
  const observer = new MutationObserver(callback);
  observer.observe(html, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  return !document.documentElement.classList.contains("is-loading");
}

/**
 * True once the preloader has fully finished (`is-loading` removed from `<html>`).
 * Use to gate scroll/view reveals so they run after the shell is interactive.
 */
export function usePreloaderComplete(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
