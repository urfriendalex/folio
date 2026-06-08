"use client";

import { useSyncExternalStore } from "react";

const HOME_SECTION_ARRIVAL_KEY = "folio:home-section-arrival";
const REVEAL_POLICY_EVENT = "folio:reveal-policy";
const HOME_SECTION_ARRIVAL_CLASS = "home-section-arrival-pending";

let revealMotionEnabled = false;
let arrivalFallbackTimer: number | null = null;

function notifyRevealPolicyChanged() {
  window.dispatchEvent(new CustomEvent(REVEAL_POLICY_EVENT));
}

export function markNextHomeSectionArrival(sectionId: string) {
  try {
    sessionStorage.setItem(HOME_SECTION_ARRIVAL_KEY, sectionId);
  } catch {
    // Ignore storage failures; content still has the progressive-enhancement fallback.
  }

  document.documentElement.classList.add(HOME_SECTION_ARRIVAL_CLASS);

  if (arrivalFallbackTimer !== null) {
    window.clearTimeout(arrivalFallbackTimer);
  }

  arrivalFallbackTimer = window.setTimeout(() => {
    completeHomeSectionArrival();
  }, 10_000);
}

export function getPendingHomeSectionArrival(): string | null {
  try {
    const sectionId = sessionStorage.getItem(HOME_SECTION_ARRIVAL_KEY);
    return sectionId === "work" || sectionId === "contact" || sectionId === "contact-form"
      ? sectionId
      : null;
  } catch {
    return null;
  }
}

export function completeHomeSectionArrival() {
  if (arrivalFallbackTimer !== null) {
    window.clearTimeout(arrivalFallbackTimer);
    arrivalFallbackTimer = null;
  }

  try {
    sessionStorage.removeItem(HOME_SECTION_ARRIVAL_KEY);
  } catch {
    // Ignore storage failures; removing the visual hold is the important part.
  }

  document.documentElement.classList.remove(HOME_SECTION_ARRIVAL_CLASS);
}

function shouldBypassRevealMotion(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: {
        saveData?: boolean;
      };
    }
  ).connection;

  return connection?.saveData === true;
}

export function initializeRevealPolicy(): boolean {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const degraded = shouldBypassRevealMotion();
  const bypassMotion = reduceMotion || degraded;

  revealMotionEnabled = !bypassMotion;
  document.documentElement.classList.toggle("reveals-enabled", revealMotionEnabled);
  document.documentElement.classList.toggle("reveals-bypassed", bypassMotion);
  document.documentElement.classList.toggle("contact-degraded", degraded);
  notifyRevealPolicyChanged();

  return revealMotionEnabled;
}

export function clearRevealPolicy() {
  revealMotionEnabled = false;
  document.documentElement.classList.remove(
    "reveals-enabled",
    "reveals-bypassed",
    "contact-degraded",
  );
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
