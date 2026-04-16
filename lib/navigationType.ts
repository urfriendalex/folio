"use client";

export function isReloadNavigation() {
  const navigationEntry = performance.getEntriesByType("navigation")[0];

  if (navigationEntry && "type" in navigationEntry) {
    return navigationEntry.type === "reload";
  }

  return performance.navigation.type === performance.navigation.TYPE_RELOAD;
}
