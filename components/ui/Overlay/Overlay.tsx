"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { isBodyScrollLocked, lockBodyScroll, onBodyScrollLock, unlockBodyScroll } from "@/lib/scrollLock";
import styles from "./Overlay.module.scss";

const TOOLBAR_EXIT_ARM_MS = 40;
const TOOLBAR_RETURN_FALLBACK_MS = 700;
const TOOLBAR_SELECTOR = '[data-overlay-toolbar-slide="true"]';

let toolbarExitTimer: number | null = null;
let toolbarReleaseTimer: number | null = null;
let toolbarTransitionTarget: HTMLElement | null = null;
let toolbarTransitionEnd: ((event: TransitionEvent) => void) | null = null;
let toolbarPlaceholder: HTMLDivElement | null = null;
let toolbarUnlockCleanup: (() => void) | null = null;

function clearToolbarExitTimer() {
  if (toolbarExitTimer === null) {
    return;
  }

  window.clearTimeout(toolbarExitTimer);
  toolbarExitTimer = null;
}

function clearToolbarRelease() {
  toolbarUnlockCleanup?.();
  toolbarUnlockCleanup = null;
  if (toolbarReleaseTimer !== null) {
    window.clearTimeout(toolbarReleaseTimer);
    toolbarReleaseTimer = null;
  }

  if (toolbarTransitionTarget && toolbarTransitionEnd) {
    toolbarTransitionTarget.removeEventListener("transitionend", toolbarTransitionEnd);
  }

  toolbarTransitionTarget = null;
  toolbarTransitionEnd = null;
}

function releaseToolbar() {
  // A fixed body changes sticky's containing block. Return to flow only after scroll restoration.
  if (isBodyScrollLocked()) {
    clearToolbarRelease();
    toolbarUnlockCleanup = onBodyScrollLock({ afterUnlock: releaseToolbar });
    return;
  }
  clearToolbarRelease();
  const toolbar = document.querySelector<HTMLElement>(TOOLBAR_SELECTOR);
  if (toolbar) toolbar.style.transition = "none";
  document.documentElement.classList.remove("is-overlay-toolbar-fixed");
  toolbar?.style.removeProperty("--overlay-toolbar-rest-y");
  toolbar?.style.removeProperty("--overlay-toolbar-exit-y");
  toolbar?.removeAttribute("data-overlay-toolbar-detached");
  toolbarPlaceholder?.remove();
  toolbarPlaceholder = null;
  if (toolbar) {
    toolbar.getBoundingClientRect();
    toolbar.style.removeProperty("transition");
  }
}

function pinToolbar() {
  const html = document.documentElement;
  clearToolbarExitTimer();
  clearToolbarRelease();
  const toolbar = document.querySelector<HTMLElement>(TOOLBAR_SELECTOR);
  let originalRect: DOMRect | null = null;
  if (toolbar && toolbarPlaceholder?.parentElement !== toolbar.parentElement) {
    originalRect = toolbar.getBoundingClientRect();
    toolbar.style.transition = "none";
    toolbar.style.setProperty("--overlay-toolbar-rest-y", "0px");
    toolbarPlaceholder?.remove();
    toolbarPlaceholder = document.createElement("div");
    toolbarPlaceholder.setAttribute("aria-hidden", "true");
    toolbarPlaceholder.dataset.overlayToolbarPlaceholder = "true";
    // Preserve the page's geometry through the fixed pose and return animation.
    toolbarPlaceholder.style.height = `${originalRect.height}px`;
    toolbar.before(toolbarPlaceholder);
  }
  html.classList.add("is-overlay-toolbar-fixed");
  html.classList.remove("is-overlay-toolbar-out");
  if (originalRect && toolbar) {
    // Use the browser's actual fixed box, including fractional layout pixels.
    // A viewport-height calculation leaves a tiny transform at rest that snaps on release.
    const fixedRect = toolbar.getBoundingClientRect();
    const restOffset = originalRect.top - fixedRect.top;
    const detached = Math.abs(restOffset) >= 2;
    toolbar.dataset.overlayToolbarDetached = String(detached);
    toolbar.style.setProperty("--overlay-toolbar-rest-y", `${restOffset}px`);
    const distanceAbove = Math.max(16, originalRect.bottom + 32);
    const distanceBelow = Math.max(16, window.innerHeight - originalRect.top + 32);
    const exitOffset = detached
      ? (distanceAbove < distanceBelow ? -distanceAbove : distanceBelow)
      : window.innerHeight - originalRect.top + 32;
    toolbar.style.setProperty("--overlay-toolbar-exit-y", `${exitOffset}px`);
    // Establish the matching fixed pose before enabling interruptible transitions.
    toolbar.getBoundingClientRect();
    toolbar.style.removeProperty("transition");
  }
}

function slideToolbarOut() {
  pinToolbar();
  toolbarExitTimer = window.setTimeout(() => {
    document.documentElement.classList.add("is-overlay-toolbar-out");
    toolbarExitTimer = null;
  }, TOOLBAR_EXIT_ARM_MS);
}

function slideToolbarIn() {
  const html = document.documentElement;
  clearToolbarExitTimer();
  // The return already finished; keep its unlock handoff rather than restarting it on unmount.
  if (toolbarUnlockCleanup) return;
  clearToolbarRelease();

  if (!html.classList.contains("is-overlay-toolbar-fixed")) {
    html.classList.remove("is-overlay-toolbar-out");
    return;
  }

  const toolbar = document.querySelector<HTMLElement>(TOOLBAR_SELECTOR);
  html.classList.remove("is-overlay-toolbar-out");

  if (!toolbar) {
    releaseToolbar();
    return;
  }

  toolbarTransitionTarget = toolbar;
  toolbarTransitionEnd = (event) => {
    if (event.target === toolbar && event.propertyName === "transform") {
      releaseToolbar();
    }
  };
  toolbar.addEventListener("transitionend", toolbarTransitionEnd);
  toolbarReleaseTimer = window.setTimeout(releaseToolbar, TOOLBAR_RETURN_FALLBACK_MS);
}

type OverlayProps = {
  children: ReactNode;
  closeLabel?: string;
  /** Immersive only: disable inner `.content` scrolling (e.g. full-screen media; avoids scrollbar flash). */
  contentNonScrollable?: boolean;
  /** Immersive only: no page-shell side padding so children can span the viewport. */
  contentFlush?: boolean;
  contentVisible?: boolean;
  /** Immersive only: reserve a mobile top row for a child-provided header beside Close. */
  inlineMobileHeader?: boolean;
  onClose: () => void;
  title: string;
  variant?: "panel" | "immersive";
  showTitle?: boolean;
  visible?: boolean;
};

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function Overlay({
  children,
  closeLabel = "Close",
  contentNonScrollable = false,
  contentFlush = false,
  contentVisible = true,
  inlineMobileHeader = false,
  onClose,
  title,
  variant = "panel",
  showTitle = true,
  visible = true,
}: OverlayProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const portalRoot = useSyncExternalStore(
    () => () => undefined,
    () => document.body,
    () => null,
  );

  useLayoutEffect(() => {
    if (!portalRoot) {
      return;
    }

    const html = document.documentElement;
    // Capture the visible sticky pose before fixing body changes its containing block.
    pinToolbar();
    lockBodyScroll();
    html.classList.add("is-overlay-open");

    return () => {
      /* Drop overflow lock first: while `is-overlay-open` is on, `overflow: hidden` on `html` makes
         Lenis’s scroll `limit` ~0, so `scrollTo(savedY)` clamps to the top. Sync scroll + body in `unlock`. */
      html.classList.remove("is-overlay-open");
      slideToolbarIn();
      unlockBodyScroll();
    };
  }, [portalRoot]);

  useEffect(() => {
    if (visible) {
      slideToolbarOut();
      return;
    }

    slideToolbarIn();
  }, [visible]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const panelNode = panelRef.current;

      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelNode) {
        return;
      }

      const items = getFocusableElements(panelNode);

      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const html = document.documentElement;
    if (visible) {
      html.classList.add("is-overlay-blur");
      html.classList.remove("is-overlay-blur-pending");
    } else {
      html.classList.remove("is-overlay-blur");
    }
    return () => {
      html.classList.remove("is-overlay-blur");
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const panelNode = panelRef.current;
    const focusable = panelNode ? getFocusableElements(panelNode) : [];
    const firstFocusable = focusable[0];
    const frame = window.requestAnimationFrame(() => {
      firstFocusable?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [visible]);

  if (!portalRoot) {
    return null;
  }

  return createPortal(
    <div
      className={styles.backdrop}
      data-variant={variant}
      data-visible={visible}
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className={styles.surface}
        data-variant={variant}
        data-visible={visible}
        data-inline-mobile-header={inlineMobileHeader ? "true" : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        {variant === "panel" ? (
          <div className={styles.atmosphere} aria-hidden="true">
            <span className={styles.orbA} />
            <span className={styles.orbB} />
            <span className={styles.orbC} />
          </div>
        ) : null}

        <button
          type="button"
          className={styles.closeButton}
          data-variant={variant}
          aria-label={`Close ${title}`}
          onClick={onClose}
        >
          {closeLabel}
        </button>
        {/* Lenis: when stopped (overlay open), wheel/touch get preventDefault unless path includes data-lenis-prevent. */}
        <div
          className={`${styles.content} ${variant === "immersive" && !contentFlush ? "page-shell" : ""}`}
          data-variant={variant}
          data-visible={visible}
          data-content-visible={contentVisible}
          data-flush={contentFlush ? "true" : undefined}
          data-non-scrollable={contentNonScrollable ? "true" : undefined}
          data-lenis-prevent=""
        >
          {showTitle ? <span className={`${styles.panelTitle} section-label`}>{title}</span> : null}
          {children}
        </div>
      </div>
    </div>,
    portalRoot,
  );
}
