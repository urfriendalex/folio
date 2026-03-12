"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType } from "react";
import styles from "./RevealText.module.scss";

type RevealMode = "lines" | "words" | "chars";

type RevealTextProps = {
  as?: ElementType;
  className?: string;
  mode?: RevealMode;
  stepMs?: number;
  text: string;
};

function buildTokens(text: string, mode: RevealMode) {
  if (mode === "lines") {
    return text.split("\n");
  }

  if (mode === "words") {
    return text.split(" ").map((token, index, array) => {
      if (index === array.length - 1) {
        return token;
      }

      return `${token}\u00A0`;
    });
  }

  return Array.from(text).map((token) => (token === " " ? "\u00A0" : token));
}

export function RevealText({
  as = "p",
  className,
  mode = "words",
  stepMs = 32,
  text,
}: RevealTextProps) {
  const Component = as;
  const nodeRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const tokens = buildTokens(text, mode);

  useEffect(() => {
    const node = nodeRef.current;

    if (!node) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        setVisible(true);
        observer.disconnect();
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -12% 0px",
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <Component
      ref={nodeRef}
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-mode={mode}
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
