"use client";

import { useSyncExternalStore } from "react";

/** Added partway through the preloader's dissolve: reveals may start; the page is still `is-loading`. */
export const PRELOADER_HANDOFF_CLASS = "is-preloader-handoff";

/** Reveals may play: the preloader is gone, or far enough into its dissolve to hand off. */
export function isPreloaderComplete(root: HTMLElement = document.documentElement): boolean {
  return !root.classList.contains("is-loading") || root.classList.contains(PRELOADER_HANDOFF_CLASS);
}

function subscribe(callback: () => void) {
  const html = document.documentElement;
  const observer = new MutationObserver(callback);
  observer.observe(html, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  return isPreloaderComplete();
}

/**
 * True once the preloader hands off to the page: partway through its dissolve, or once it has fully
 * finished (`is-loading` removed from `<html>`).
 * Use to gate scroll/view reveals so they run after the shell is interactive.
 */
export function usePreloaderComplete(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
