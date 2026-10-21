"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePreloaderComplete } from "@/lib/preloaderComplete";
import { clearRevealPolicy, initializeRevealPolicy } from "@/lib/revealPolicy";
import {
  closeRevealRestoreWindow,
  isRevealRestoreWindow,
  openRevealRestoreWindow,
} from "@/lib/revealRestore";

/** After the landing frame settles, entrances resume for content the visitor scrolls to. */
const RESTORE_WINDOW_SETTLE_MS = 350;
/** Safety net in case the incoming route never reports a completed landing. */
const POPSTATE_WINDOW_FALLBACK_MS = 1200;
const SCROLL_INPUT_KEYS = new Set([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"]);

export function RevealPolicyController() {
  const pathname = usePathname();
  const preloaderComplete = usePreloaderComplete();

  useLayoutEffect(() => {
    initializeRevealPolicy();
    return clearRevealPolicy;
  }, [pathname]);

  const renderedPathRef = useRef(pathname);
  useEffect(() => {
    renderedPathRef.current = pathname;
  }, [pathname]);

  /* Client-side back/forward to another page is a restore too; mark it before that page paints.
     Same-page history steps (closing the overview / contact form) keep their own exit motion. */
  useEffect(() => {
    let fallbackTimer = 0;
    const onPopState = () => {
      if (window.location.pathname === renderedPathRef.current) {
        return;
      }
      openRevealRestoreWindow();
      window.clearTimeout(fallbackTimer);
      fallbackTimer = window.setTimeout(closeRevealRestoreWindow, POPSTATE_WINDOW_FALLBACK_MS);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  /* Close the restore window once reveals for the landing position have committed (after the preloader,
     scroll restoration and a couple of frames), or as soon as the visitor starts scrolling. */
  useEffect(() => {
    if (!preloaderComplete || !isRevealRestoreWindow()) {
      return undefined;
    }

    let settleTimer = 0;
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        settleTimer = window.setTimeout(close, RESTORE_WINDOW_SETTLE_MS);
        window.addEventListener("wheel", close, { passive: true });
        window.addEventListener("touchmove", close, { passive: true });
        window.addEventListener("keydown", onKeyDown);
      });
    });

    function onKeyDown(event: KeyboardEvent) {
      if (SCROLL_INPUT_KEYS.has(event.key)) {
        close();
      }
    }

    function detach() {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.removeEventListener("wheel", close);
      window.removeEventListener("touchmove", close);
      window.removeEventListener("keydown", onKeyDown);
    }

    function close() {
      detach();
      closeRevealRestoreWindow();
    }

    return detach;
  }, [preloaderComplete, pathname]);

  return null;
}
