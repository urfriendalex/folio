"use client";

import { useSyncExternalStore } from "react";

const HOME_REVEAL_BYPASS_KEY = "folio:home-reveal-bypass";
const REVEAL_POLICY_EVENT = "folio:reveal-policy";

let revealMotionEnabled = false;

function notifyRevealPolicyChanged() {
  window.dispatchEvent(new CustomEvent(REVEAL_POLICY_EVENT));
}

export function markNextHomeNavigationForImmediateReveal(sectionId: string) {
  try {
    sessionStorage.setItem(HOME_REVEAL_BYPASS_KEY, sectionId);
  } catch {
    // Ignore storage failures; content still has the progressive-enhancement fallback.
  }

  revealMotionEnabled = false;
  document.documentElement.classList.remove("reveals-enabled");
  document.documentElement.classList.add("reveals-bypassed");
  notifyRevealPolicyChanged();
}

function consumeHomeNavigationRevealBypass(): boolean {
  try {
    const sectionId = sessionStorage.getItem(HOME_REVEAL_BYPASS_KEY);
    sessionStorage.removeItem(HOME_REVEAL_BYPASS_KEY);
    return sectionId === "work" || sectionId === "contact" || sectionId === "contact-form";
  } catch {
    return false;
  }
}

function hasConstrainedConnection(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        saveData?: boolean;
      };
    }
  ).connection;

  return Boolean(
    connection?.saveData
      || connection?.effectiveType === "slow-2g"
      || connection?.effectiveType === "2g",
  );
}

export function initializeRevealPolicy(): boolean {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bypassMotion =
    reduceMotion
    || hasConstrainedConnection()
    || consumeHomeNavigationRevealBypass();

  revealMotionEnabled = !bypassMotion;
  document.documentElement.classList.toggle("reveals-enabled", revealMotionEnabled);
  document.documentElement.classList.toggle("reveals-bypassed", bypassMotion);
  notifyRevealPolicyChanged();

  return revealMotionEnabled;
}

export function clearRevealPolicy() {
  revealMotionEnabled = false;
  document.documentElement.classList.remove("reveals-enabled", "reveals-bypassed");
  notifyRevealPolicyChanged();
}

function subscribeRevealPolicy(onStoreChange: () => void) {
  window.addEventListener(REVEAL_POLICY_EVENT, onStoreChange);
  return () => window.removeEventListener(REVEAL_POLICY_EVENT, onStoreChange);
}

function getRevealMotionSnapshot() {
  return revealMotionEnabled || document.documentElement.classList.contains("reveals-enabled");
}

function getRevealMotionServerSnapshot() {
  return false;
}

export function useRevealMotionEnabled(): boolean {
  return useSyncExternalStore(
    subscribeRevealPolicy,
    getRevealMotionSnapshot,
    getRevealMotionServerSnapshot,
  );
}
