import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";

let registered = false;

export function registerGsapScrollTrigger() {
  if (registered || typeof window === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export function bindLenisToScrollTrigger(lenis: Lenis) {
  registerGsapScrollTrigger();

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
}

export { gsap, ScrollTrigger };
