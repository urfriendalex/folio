/**
 * Reveal policy — when do entrances play?
 *
 *   Arrival  (first visit, in-site link)       content performs: hero cascade, then reveal-on-view.
 *   Restore  (reload, back/forward, mid-page)  content is already known: everything at or above where
 *                                              the visitor lands appears instantly; only content further
 *                                              down still reveals as it scrolls into view.
 *
 * A restore opens a short "restore window" (`html.reveal-restore`): the boot script in app/layout sets it
 * for reload / back_forward documents, and `popstate` sets it for client-side history navigations. While
 * it is open, reveal hooks treat in-or-above-viewport nodes as visible and globals.scss zeroes entrance
 * transitions. The window closes once the landing frame has settled, or on the first scroll input.
 */
export const REVEAL_RESTORE_CLASS = "reveal-restore";

export function isRevealRestoreWindow(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains(REVEAL_RESTORE_CLASS);
}

export function openRevealRestoreWindow() {
  document.documentElement.classList.add(REVEAL_RESTORE_CLASS);
}

export function closeRevealRestoreWindow() {
  document.documentElement.classList.remove(REVEAL_RESTORE_CLASS);
}

/** In a restore, a node the visitor has landed on or scrolled past counts as already seen. */
export function isAtOrAboveViewportBottom(node: Element): boolean {
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  return node.getBoundingClientRect().top < viewportHeight;
}
