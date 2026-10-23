import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { registerLenisScrollTriggerBind } from "@/lib/lenisScrollTriggerBridge";

let registered = false;

export function registerGsapScrollTrigger() {
  if (registered || typeof window === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  registered = true;

  registerLenisScrollTriggerBind((lenis) => {
    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length && value != null) {
          lenis.scrollTo(value, { immediate: true });
        }

        return lenis.scroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
    });

    const unsubscribe = lenis.on("scroll", ScrollTrigger.update);

    return () => {
      unsubscribe?.();
    };
  });
}

let refreshFrame = 0;

/**
 * `ScrollTrigger.refresh()` re-measures every trigger and forces a full style + layout pass. Mount
 * effects that each asked for one (pins, list mode, toolbar fade) now share a single refresh on the
 * next frame instead of stacking several — one of them synchronously mid-mount.
 */
export function scheduleScrollTriggerRefresh() {
  if (refreshFrame || typeof window === "undefined") {
    return;
  }

  refreshFrame = window.requestAnimationFrame(() => {
    refreshFrame = 0;
    ScrollTrigger.refresh();
  });
}

export { gsap, ScrollTrigger };
