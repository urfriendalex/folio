"use client";

import { useSyncExternalStore } from "react";

const HOME_REVEAL_BYPASS_KEY = "folio:home-reveal-bypass";
const REVEAL_POLICY_EVENT = "folio:reveal-policy";
const REPEAT_VISIT_REVEAL_DEADLINE_MS = 1200;

let revealMotionEnabled = false;

function notifyRevealPolicyChanged() {
  window.dispatchEvent(new CustomEvent(REVEAL_POLICY_EVENT));
}

export function applyImmediateRevealPolicy() {
  revealMotionEnabled = false;
  document.documentElement.classList.remove("reveals-enabled");
  document.documentElement.classList.add("reveals-bypassed");
  notifyRevealPolicyChanged();
}

export function markNextHomeNavigationForImmediateReveal(sectionId: string) {
  try {
    sessionStorage.setItem(HOME_REVEAL_BYPASS_KEY, sectionId);
  } catch {
    // Ignore storage failures; content still has the progressive-enhancement fallback.
  }

  applyImmediateRevealPolicy();
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
  const preloaderWillRun = document.documentElement.getAttribute("data-preloader") === "run";
  const initializedPromptly =
    preloaderWillRun || performance.now() <= REPEAT_VISIT_REVEAL_DEADLINE_MS;
  const degraded = shouldBypassRevealMotion() || !initializedPromptly;
  const bypassMotion =
    reduceMotion
    || degraded
    || consumeHomeNavigationRevealBypass();

  revealMotionEnabled = !bypassMotion;
  document.documentElement.setAttribute("data-reveal-policy-ready", "true");
  document.documentElement.classList.toggle("reveals-enabled", revealMotionEnabled);
  document.documentElement.classList.toggle("reveals-bypassed", bypassMotion);
  document.documentElement.classList.toggle("contact-degraded", degraded);
  notifyRevealPolicyChanged();

  return revealMotionEnabled;
}

export function clearRevealPolicy() {
  revealMotionEnabled = false;
  document.documentElement.removeAttribute("data-reveal-policy-ready");
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
