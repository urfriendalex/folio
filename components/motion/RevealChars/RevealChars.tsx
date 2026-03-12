"use client";

import { useRef, type CSSProperties, type ElementType } from "react";
import { useRevealOnView } from "@/components/motion/shared/useRevealOnView";
import styles from "@/components/motion/shared/reveal.module.scss";

type RevealCharsProps = {
  as?: ElementType;
  className?: string;
  stepMs?: number;
  text: string;
};

export function RevealChars({
  as = "p",
  className,
  stepMs = 18,
  text,
}: RevealCharsProps) {
  const Component = as;
  const ref = useRef<HTMLElement | null>(null);
  const visible = useRevealOnView(ref);
  const tokens = Array.from(text).map((character) => (character === " " ? "\u00A0" : character));

  return (
    <Component
      ref={ref}
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-mode="chars"
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
