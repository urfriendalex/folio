export const PRELOADER_REPLAY_EVENT = "folio:replay-preloader";

export function replayPreloader() {
  window.dispatchEvent(new Event(PRELOADER_REPLAY_EVENT));
}
