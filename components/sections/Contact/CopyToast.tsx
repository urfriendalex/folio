"use client";

import styles from "./ContactVariants.module.scss";

export type CopyToastState = { x: number; y: number; key: number } | null;

/**
 * Old-school copy feedback: a Win98 tooltip that pops at the pointer (same chrome tokens as the footer
 * taskbar), plus a polite live-region announcement for screen readers.
 */
export function CopyToast({ toast, label = "Copied to clipboard" }: { toast: CopyToastState; label?: string }) {
  return (
    <>
      {toast ? (
        <span
          key={toast.key}
          className={styles.copyToast}
          style={{ left: toast.x, top: toast.y }}
          aria-hidden="true"
        >
          {label}
        </span>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">
        {toast ? "Email address copied to clipboard" : ""}
      </span>
    </>
  );
}
