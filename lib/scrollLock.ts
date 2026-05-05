import { getLenis } from "@/lib/smoothScroll";

let lockCount = 0;
let savedScrollY = 0;
let shouldRestoreScroll = true;

export function skipNextScrollRestore() {
  shouldRestoreScroll = false;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Best-effort scroll Y while the page is still scrollable (before `position: fixed` on `body`). */
function readDocumentScrollY() {
  if (typeof window === "undefined") {
    return 0;
  }

  const lenis = getLenis();
  if (lenis && !prefersReducedMotion()) {
    return Math.round(lenis.actualScroll);
  }

  return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
}

export function lockBodyScroll() {
  if (lockCount === 0) {
    shouldRestoreScroll = true;
    savedScrollY = readDocumentScrollY();
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
  }
  lockCount++;
}

/**
 * Last unlock clears the fixed body and restores `savedScrollY`.
 * Call after removing `html` overflow-lock classes (`is-overlay-open`, `is-nav-open`, …) so the
 * document’s scroll height / Lenis `limit` is correct and restoration is not clamped to 0.
 */
export function unlockBodyScroll() {
  if (lockCount <= 0) {
    return;
  }
  lockCount--;
  if (lockCount === 0) {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    const scrollY = savedScrollY;
    savedScrollY = 0;
    const restoreScroll = shouldRestoreScroll;
    shouldRestoreScroll = true;

    if (!restoreScroll) {
      return;
    }

    const y = scrollY;
    const reducedMotion = prefersReducedMotion();
    const lenis = getLenis();

    /*
     * 1. Restore native scroll first (deterministic) after `overflow` + body styles are normal.
     * 2. `lenis.resize()` refreshes `limit` — without this, a stale limit of 0 makes `scrollTo(y)` clamp to top.
     * 3. Sync Lenis only if native and Lenis still disagree (immediate `scrollTo` runs `reset()` — avoid
     *    relying on it as the only restore).
     */
    window.scrollTo({ top: y, left: 0, behavior: "auto" });

    if (!lenis) {
      return;
    }

    if (reducedMotion) {
      lenis.resize();
      return;
    }

    lenis.resize();

    if (Math.abs(lenis.actualScroll - y) > 0.5) {
      lenis.scrollTo(y, { immediate: true, force: true });
    }
  }
}
