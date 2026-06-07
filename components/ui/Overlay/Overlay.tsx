"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";
import styles from "./Overlay.module.scss";

const TOOLBAR_EXIT_ARM_MS = 40;
const TOOLBAR_RETURN_FALLBACK_MS = 700;
const TOOLBAR_SELECTOR = '[data-overlay-toolbar-slide="true"]';

let toolbarExitTimer: number | null = null;
let toolbarReleaseTimer: number | null = null;
let toolbarTransitionTarget: HTMLElement | null = null;
let toolbarTransitionEnd: ((event: TransitionEvent) => void) | null = null;

function clearToolbarExitTimer() {
  if (toolbarExitTimer === null) {
    return;
  }

  window.clearTimeout(toolbarExitTimer);
  toolbarExitTimer = null;
}

function clearToolbarRelease() {
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
  clearToolbarRelease();
  document.documentElement.classList.remove("is-overlay-toolbar-fixed");
}

function pinToolbar() {
  const html = document.documentElement;
  clearToolbarExitTimer();
  clearToolbarRelease();
  html.classList.add("is-overlay-toolbar-fixed");
  html.classList.remove("is-overlay-toolbar-out");
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
  contentVisible?: boolean;
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
  contentVisible = true,
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
    lockBodyScroll();
    html.classList.add("is-overlay-open");
    pinToolbar();

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
          className={`${styles.content} ${variant === "immersive" ? "page-shell" : ""}`}
          data-variant={variant}
          data-visible={visible}
          data-content-visible={contentVisible}
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
