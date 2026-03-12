"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./Overlay.module.scss";

type OverlayProps = {
  children: ReactNode;
  onClose: () => void;
  title: string;
};

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function Overlay({ children, onClose, title }: OverlayProps) {
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
    html.classList.add("is-overlay-open");

    const panelNode = panelRef.current;
    const focusable = panelNode ? getFocusableElements(panelNode) : [];
    const firstFocusable = focusable[0];
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
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
      html.classList.remove("is-overlay-open");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, portalRoot]);

  if (!portalRoot) {
    return null;
  }

  return createPortal(
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <span className="section-label">{title}</span>
          <button type="button" className="pill-button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>,
    portalRoot,
  );
}
