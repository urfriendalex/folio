"use client";

import Lenis from "lenis";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isReloadNavigation } from "@/lib/navigationType";
import { clearLocationHash, getLenis, scrollElementIntoView, scrollToTarget } from "@/lib/smoothScroll";

const HOME_SECTION_IDS = new Set(["work", "contact", "contact-form"]);

function scrollToTopImmediate() {
  const lenis = getLenis();

  if (lenis) {
    lenis.scrollTo(0, { immediate: true, force: true });
    return;
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function scrollToHomeSectionById(sectionId: string) {
  let attempts = 0;
  const maxAttempts = 90;

  const tryScroll = () => {
    const el = document.getElementById(sectionId);

    if (el) {
      scrollElementIntoView(el);
      return;
    }

    attempts += 1;

    if (attempts < maxAttempts) {
      requestAnimationFrame(tryScroll);
    }
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(tryScroll);
  });
}

type SmoothScrollProviderProps = {
  children: ReactNode;
};

const LOCKED_ROOT_CLASSES = [
  "is-loading",
  "is-nav-open",
  "is-overlay-open",
  "is-fullscreen-route",
  "is-archive-route",
];

function shouldPauseSmoothScroll(root: HTMLElement) {
  return LOCKED_ROOT_CLASSES.some((className) => root.classList.contains(className));
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const pathname = usePathname();
  const hasHandledInitialNavigation = useRef(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      return undefined;
    }

    const root = document.documentElement;
    const lenis = new Lenis({
      duration: 0.82,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1.12,
      anchors: false,
    });

    window.__lenis = lenis;

    let frameId = 0;
    const rootObserver = new MutationObserver(() => {
      if (shouldPauseSmoothScroll(root)) {
        lenis.stop();
        return;
      }

      lenis.start();
    });

    const frame = (time: number) => {
      lenis.raf(time);
      frameId = window.requestAnimationFrame(frame);
    };

    if (shouldPauseSmoothScroll(root)) {
      lenis.stop();
    }

    frameId = window.requestAnimationFrame(frame);
    rootObserver.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      rootObserver.disconnect();
      window.cancelAnimationFrame(frameId);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);

  /**
   * In-page section links (work / contact). Lenis `anchors` are off so we can center `#contact` while keeping
   * header clearance for `#work`. Runs in bubble phase so `preventDefault()` from handlers like the hero CTA still skips us.
   */
  useEffect(() => {
    const onSamePageSectionHashClick = (event: MouseEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      if (!(event.target instanceof Element)) {
        return;
      }

      const link = event.target.closest("a[href]");

      if (!link || !(link instanceof HTMLAnchorElement)) {
        return;
      }

      let url: URL;

      try {
        url = new URL(link.href);
      } catch {
        return;
      }

      const here = new URL(window.location.href);

      if (url.origin !== here.origin || url.pathname !== here.pathname) {
        return;
      }

      const hash = url.hash.slice(1);

      if (hash !== "work" && hash !== "contact" && hash !== "contact-form") {
        return;
      }

      event.preventDefault();
      window.history.pushState(window.history.state, "", `${url.pathname}${url.search}#${hash}`);

      const scrollToHash = () => scrollToTarget(`#${hash}`, {});

      // Mobile nav locks `body` (`position: fixed`). Scrolling in the same tick runs before React
      // unlocks scroll; `skipNextScrollRestore()` would leave scroll at 0 after unlock. Defer until
      // after `unlockBodyScroll` runs (next macrotask, after layout effects).
      if (document.documentElement.classList.contains("is-nav-open")) {
        window.setTimeout(scrollToHash, 0);
      } else {
        scrollToHash();
      }
    };

    document.addEventListener("click", onSamePageSectionHashClick);

    return () => {
      document.removeEventListener("click", onSamePageSectionHashClick);
    };
  }, []);

  useEffect(() => {
    const isInitialNavigation = !hasHandledInitialNavigation.current;
    hasHandledInitialNavigation.current = true;
    const shouldRespectInitialHash = isInitialNavigation && !isReloadNavigation();

    if (pathname !== "/") {
      if (isInitialNavigation) {
        return;
      }

      scrollToTopImmediate();
      return;
    }

    const id = window.location.hash.slice(1);

    if (id === "hero") {
      if (!shouldRespectInitialHash) {
        return;
      }

      clearLocationHash();
      scrollToTopImmediate();
      return;
    }

    if (id && HOME_SECTION_IDS.has(id)) {
      if (!shouldRespectInitialHash) {
        return;
      }

      scrollToHomeSectionById(id);
      return;
    }

    if (isInitialNavigation) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToTopImmediate();
      });
    });
  }, [pathname]);

  return children;
}
