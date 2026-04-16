"use client";

import Lenis from "lenis";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isReloadNavigation } from "@/lib/navigationType";
import { clearLocationHash, getAnchorScrollOffset, getLenis, scrollElementIntoView } from "@/lib/smoothScroll";

const HOME_SECTION_IDS = new Set(["work", "contact"]);

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
      anchors: {
        offset: getAnchorScrollOffset("#work"),
      },
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

    scrollToTopImmediate();
  }, [pathname]);

  return children;
}
