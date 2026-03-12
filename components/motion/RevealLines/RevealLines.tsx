"use client";

import { useRef, type CSSProperties, type ElementType } from "react";
import { useRevealOnView } from "@/components/motion/shared/useRevealOnView";
import styles from "@/components/motion/shared/reveal.module.scss";

type RevealLinesProps = {
  as?: ElementType;
  className?: string;
  stepMs?: number;
  text: string;
};

export function RevealLines({
  as = "p",
  className,
  stepMs = 70,
  text,
}: RevealLinesProps) {
  const Component = as;
  const ref = useRef<HTMLElement | null>(null);
  const visible = useRevealOnView(ref);
  const tokens = text.split("\n");

  return (
    <Component
      ref={ref}
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-mode="lines"
      data-visible={visible}
      style={{ "--reveal-step": `${stepMs}ms` } as CSSProperties}
    >
      {tokens.map((token, index) => (
        <span
          key={`${token}-${index}`}
          className={styles.token}
          style={{ "--token-index": index } as CSSProperties}
        >
          {token}
        </span>
      ))}
    </Component>
  );
}
