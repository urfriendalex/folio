"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import {
  useRevealOnView,
  type UseRevealOnViewOptions,
} from "@/components/motion/shared/useRevealOnView";
import styles from "@/components/motion/shared/reveal.module.scss";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  visible?: boolean;
  /** Passed to IntersectionObserver (defaults in hook are tuned for in-flow text; use for looser triggers). */
  revealOptions?: UseRevealOnViewOptions;
  /** 0-based index for staggered entrance when `staggerStepMs` > 0. */
  staggerIndex?: number;
  /** Delay step between staggered items (default 0 = no stagger). */
  staggerStepMs?: number;
};

export function ScrollReveal({
  children,
  className,
  visible,
  revealOptions,
  staggerIndex = 0,
  staggerStepMs = 0,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const visibleOnView = useRevealOnView(ref, revealOptions);
  const resolvedVisible = visible ?? visibleOnView;

  const staggerStyle =
    staggerStepMs > 0
      ? ({
          "--reveal-stagger-index": staggerIndex,
          "--reveal-stagger-step": `${staggerStepMs}ms`,
        } as CSSProperties)
      : undefined;

  return (
    <div
      ref={ref}
      className={[styles.scrollReveal, className].filter(Boolean).join(" ")}
      data-visible={resolvedVisible}
      data-stagger={staggerStepMs > 0 ? "true" : undefined}
      style={staggerStyle}
    >
      {children}
    </div>
  );
}

export type { UseRevealOnViewOptions };
