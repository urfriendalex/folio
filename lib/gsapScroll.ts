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

  /* ScrollTrigger asks the proxy for this rect many times per refresh; reading innerWidth/innerHeight
     there can force a style + layout pass each time (expensive while a new route mounts). Cache the
     viewport and update it on resize — ScrollTrigger's own resize refresh runs after this listener. */
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  window.addEventListener(
    "resize",
    () => {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
    },
    { passive: true },
  );

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
          width: viewportWidth,
          height: viewportHeight,
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
