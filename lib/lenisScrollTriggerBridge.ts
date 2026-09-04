import type Lenis from "lenis";

type BindFn = (lenis: Lenis) => () => void;

let activeLenis: Lenis | null = null;
let bindFn: BindFn | null = null;
let unbind: (() => void) | null = null;

function syncBridge() {
  unbind?.();
  unbind = null;

  if (activeLenis && bindFn) {
    unbind = bindFn(activeLenis);
  }
}

/** Called from the scroll shell. Must not import GSAP ScrollTrigger. */
export function setActiveLenis(lenis: Lenis | null) {
  activeLenis = lenis;
  syncBridge();
}

/** Called when a route actually uses ScrollTrigger (today: `/projects` list pin). */
export function registerLenisScrollTriggerBind(bind: BindFn) {
  bindFn = bind;
  syncBridge();

  return () => {
    if (bindFn !== bind) {
      return;
    }

    unbind?.();
    unbind = null;
    bindFn = null;
  };
}
