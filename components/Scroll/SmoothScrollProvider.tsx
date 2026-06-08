"use client";

import Lenis from "lenis";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isReloadNavigation } from "@/lib/navigationType";
import { clearHomeHistoryPopReveal } from "@/lib/restoredScroll";
import {
  clearLocationHash,
  getLenis,
  scrollElementIntoView,
  scrollToTarget,
  syncLenisToWindowScroll,
} from "@/lib/smoothScroll";

const HOME_SECTION_IDS = new Set(["work", "contact", "contact-form"]);
const HOME_SECTION_ARRIVAL_PENDING_CLASS = "home-section-arrival-pending";
const HOME_SECTION_ARRIVAL_REVEAL_CLASS = "home-section-arrival-reveal";
const HOME_SECTION_ARRIVAL_REVEAL_MS = 420;

function clearHomeSectionArrivalClasses() {
  document.documentElement.classList.remove(
    HOME_SECTION_ARRIVAL_PENDING_CLASS,
    HOME_SECTION_ARRIVAL_REVEAL_CLASS,
  );
}

function scrollToTopImmediate() {
  const lenis = getLenis();

  if (lenis) {
    lenis.scrollTo(0, { immediate: true, force: true });
    return;
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function scrollToHomeSectionById(
  sectionId: string,
  options?: { onComplete?: () => void; updateHash?: boolean },
) {
  let attempts = 0;
  const maxAttempts = 90;

  const tryScroll = () => {
    const el = document.getElementById(sectionId);

    if (el && !shouldPauseSmoothScroll(document.documentElement)) {
      if (options?.updateHash) {
        window.history.replaceState(window.history.state, "", `/#${sectionId}`);
      }

      scrollElementIntoView(el, { force: true, immediate: options?.updateHash ?? false });
      window.dispatchEvent(new CustomEvent("folio:home-section-arrive", { detail: { id: sectionId } }));

      options?.onComplete?.();
      return;
    }

    attempts += 1;

    if (attempts < maxAttempts) {
      requestAnimationFrame(tryScroll);
      return;
    }

    options?.onComplete?.();
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
  const router = useRouter();
  const hasHandledInitialNavigation = useRef(false);
  const pendingHomeSectionIdRef = useRef<string | null>(null);
  const arrivalRevealTimerRef = useRef<number | null>(null);
  /** True after `popstate` until the next `/` scroll policy runs (Next.js restores scroll on back/forward). */
  const historyScrollRestorePendingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (arrivalRevealTimerRef.current !== null) {
        window.clearTimeout(arrivalRevealTimerRef.current);
      }
      clearHomeSectionArrivalClasses();
    };
  }, []);

  useEffect(() => {
    const onPopState = () => {
      historyScrollRestorePendingRef.current = true;
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const cancelSupersededHomeSectionArrival = (event: MouseEvent) => {
      const pendingSectionId = pendingHomeSectionIdRef.current;

      if (!pendingSectionId || !(event.target instanceof Element)) {
        return;
      }

      const link = event.target.closest("a[href]");

      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }

      let url: URL;

      try {
        url = new URL(link.href);
      } catch {
        return;
      }

      const stillTargetsPendingSection =
        url.origin === window.location.origin &&
        url.pathname === "/" &&
        url.hash === `#${pendingSectionId}`;

      if (!stillTargetsPendingSection) {
        pendingHomeSectionIdRef.current = null;
        clearHomeSectionArrivalClasses();
      }
    };

    document.addEventListener("click", cancelSupersededHomeSectionArrival, true);

    return () => {
      document.removeEventListener("click", cancelSupersededHomeSectionArrival, true);
    };
  }, []);

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
   * Home section links (work / contact). Lenis `anchors` are off so every click, whether already
   * on `/` or coming from another route, resolves through the same scroll target helper.
   * Runs in bubble phase so `preventDefault()` from handlers like the hero CTA still skips us.
   */
  useEffect(() => {
    const onHomeSectionHashClick = (event: MouseEvent) => {
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

      if (url.origin !== here.origin || (url.pathname !== here.pathname && url.pathname !== "/")) {
        return;
      }

      const hash = url.hash.slice(1);

      if (hash !== "work" && hash !== "contact" && hash !== "contact-form") {
        return;
      }

      event.preventDefault();

      const scrollToHash = () => scrollToTarget(`#${hash}`, {});

      if (url.pathname !== here.pathname) {
        pendingHomeSectionIdRef.current = hash;
        document.documentElement.classList.add(HOME_SECTION_ARRIVAL_PENDING_CLASS);
        router.push("/", { scroll: false });
        return;
      }

      window.history.pushState(window.history.state, "", `${url.pathname}${url.search}#${hash}`);

      // Mobile nav locks `body` (`position: fixed`). Scrolling in the same tick runs before React
      // unlocks scroll; `skipNextScrollRestore()` would leave scroll at 0 after unlock. Defer until
      // after `unlockBodyScroll` runs (next macrotask, after layout effects).
      if (document.documentElement.classList.contains("is-nav-open")) {
        window.setTimeout(scrollToHash, 0);
      } else {
        scrollToHash();
      }
    };

    document.addEventListener("click", onHomeSectionHashClick);

    return () => {
      document.removeEventListener("click", onHomeSectionHashClick);
    };
  }, [router]);

  useEffect(() => {
    const isInitialNavigation = !hasHandledInitialNavigation.current;
    hasHandledInitialNavigation.current = true;
    const shouldRespectInitialHash = isInitialNavigation && !isReloadNavigation();

    if (pathname !== "/") {
      if (pendingHomeSectionIdRef.current !== null) {
        pendingHomeSectionIdRef.current = null;
        clearHomeSectionArrivalClasses();
      }
      historyScrollRestorePendingRef.current = false;
      clearHomeHistoryPopReveal();

      if (isInitialNavigation) {
        return;
      }

      scrollToTopImmediate();
      return;
    }

    const pendingHomeSectionId = pendingHomeSectionIdRef.current;
    const id = pendingHomeSectionId ?? window.location.hash.slice(1);

    const scheduleLenisSyncToRestoredScroll = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          syncLenisToWindowScroll();
        });
      });
    };

    if (id === "hero") {
      if (!shouldRespectInitialHash) {
        if (historyScrollRestorePendingRef.current) {
          historyScrollRestorePendingRef.current = false;
          scheduleLenisSyncToRestoredScroll();
        }

        return;
      }

      historyScrollRestorePendingRef.current = false;
      clearLocationHash();
      scrollToTopImmediate();
      return;
    }

    if (id && HOME_SECTION_IDS.has(id)) {
      if (pendingHomeSectionId) {
        pendingHomeSectionIdRef.current = null;
        historyScrollRestorePendingRef.current = false;
        scrollToHomeSectionById(id, {
          updateHash: true,
          onComplete: () => {
            const root = document.documentElement;
            root.classList.remove(HOME_SECTION_ARRIVAL_PENDING_CLASS);
            root.classList.add(HOME_SECTION_ARRIVAL_REVEAL_CLASS);

            if (arrivalRevealTimerRef.current !== null) {
              window.clearTimeout(arrivalRevealTimerRef.current);
            }

            arrivalRevealTimerRef.current = window.setTimeout(() => {
              root.classList.remove(HOME_SECTION_ARRIVAL_REVEAL_CLASS);
              arrivalRevealTimerRef.current = null;
            }, HOME_SECTION_ARRIVAL_REVEAL_MS);
          },
        });
        return;
      }

      if (!shouldRespectInitialHash) {
        if (historyScrollRestorePendingRef.current) {
          historyScrollRestorePendingRef.current = false;
          scheduleLenisSyncToRestoredScroll();
          return;
        }
      }

      historyScrollRestorePendingRef.current = false;
      scrollToHomeSectionById(id);
      return;
    }

    if (isInitialNavigation) {
      return;
    }

    if (historyScrollRestorePendingRef.current) {
      historyScrollRestorePendingRef.current = false;
      scheduleLenisSyncToRestoredScroll();
      return;
    }

    clearHomeHistoryPopReveal();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToTopImmediate();
      });
    });
  }, [pathname]);

  return children;
}
