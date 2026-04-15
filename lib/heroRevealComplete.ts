"use client";

import { useSyncExternalStore } from "react";

const HERO_REVEAL_ATTR = "data-hero-reveal";

function subscribe(callback: () => void) {
  const html = document.documentElement;
  const observer = new MutationObserver(callback);
  observer.observe(html, { attributes: true, attributeFilter: [HERO_REVEAL_ATTR] });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  return document.documentElement.getAttribute(HERO_REVEAL_ATTR) === "complete";
}

export function useHeroRevealComplete(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

