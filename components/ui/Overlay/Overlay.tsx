"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";
import styles from "./Overlay.module.scss";

type OverlayProps = {
  children: ReactNode;
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

  useEffect(() => {
    if (!portalRoot) {
      return;
    }

    const html = document.documentElement;
    lockBodyScroll();
    html.classList.add("is-overlay-open");

    return () => {
      html.classList.remove("is-overlay-open");
      unlockBodyScroll();
    };
  }, [portalRoot]);

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
          Close
        </button>
        {/* Lenis: when stopped (overlay open), wheel/touch get preventDefault unless path includes data-lenis-prevent. */}
        <div
          className={`${styles.content} ${variant === "immersive" ? "page-shell" : ""}`}
          data-variant={variant}
          data-visible={visible}
          data-content-visible={contentVisible}
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
