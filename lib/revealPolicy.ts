"use client";

import { useSyncExternalStore } from "react";

const REVEAL_POLICY_EVENT = "folio:reveal-policy";

let revealMotionEnabled = false;

function notifyRevealPolicyChanged() {
  window.dispatchEvent(new CustomEvent(REVEAL_POLICY_EVENT));
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
