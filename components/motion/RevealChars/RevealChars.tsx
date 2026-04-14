"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useRevealOnView } from "@/components/motion/shared/useRevealOnView";
import styles from "@/components/motion/shared/reveal.module.scss";

type RevealCharsTag = "p" | "span" | "h1" | "h2" | "li";

type TextSegment = { word: string } | { space: string };

function segmentWordsAndSpaces(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const chars = Array.from(text);
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i]!;
    if (/\s/u.test(ch)) {
      let run = "";
      while (i < chars.length && /\s/u.test(chars[i]!)) {
        run += chars[i];
        i++;
      }
      segments.push({ space: run });
    } else {
      let word = "";
      while (i < chars.length && !/\s/u.test(chars[i]!)) {
        word += chars[i];
        i++;
      }
      segments.push({ word });
    }
  }
  return segments;
}

function renderCharToken(
  rawChar: string,
  tokenIndex: number,
): ReactNode {
  const display = rawChar === " " ? "\u00A0" : rawChar;
  return (
    <span key={`c-${tokenIndex}`} className={styles.tokenClip}>
      <span
        className={styles.token}
        style={{ "--token-index": tokenIndex } as CSSProperties}
      >
        {display}
      </span>
    </span>
  );
}

type RevealCharsProps = {
  as?: RevealCharsTag;
  className?: string;
  offset?: number;
  /** Extra delay before the visible (reveal-in) stagger begins — e.g. wait for layout animation. */
  delayMs?: number;
  stepMs?: number;
  text: string;
  total?: number;
  visible?: boolean;
};

export function RevealChars({
  as = "p",
  className,
  offset = 0,
  delayMs = 0,
  stepMs = 18,
  text,
  total,
  visible,
}: RevealCharsProps) {
  const ref = useRef<HTMLElement | null>(null);
  const visibleOnView = useRevealOnView(ref);
  const resolvedVisible = visible ?? visibleOnView;
  const charCount = Array.from(text).length;
  const setRef = (node: HTMLElement | null) => {
    ref.current = node;
  };
  const classNames = [styles.root, className].filter(Boolean).join(" ");
  const style = {
    "--reveal-step": `${stepMs}ms`,
    "--reveal-delay": `${delayMs}ms`,
    "--reveal-total": total ?? charCount + offset,
  } as CSSProperties;

  const segments = segmentWordsAndSpaces(text);
  const children: ReactNode[] = [];
  let tokenIndex = offset;
  let segKey = 0;
  for (const seg of segments) {
    if ("word" in seg) {
      const wordNodes: ReactNode[] = [];
      for (const ch of Array.from(seg.word)) {
        wordNodes.push(renderCharToken(ch, tokenIndex));
        tokenIndex++;
      }
      children.push(
        <span key={`w-${segKey++}`} className={styles.charWordRun}>
          {wordNodes}
        </span>,
      );
    } else {
      for (const ch of Array.from(seg.space)) {
        children.push(renderCharToken(ch, tokenIndex));
        tokenIndex++;
      }
    }
  }

  switch (as) {
    case "span":
      return <span ref={setRef} className={classNames} data-mode="chars" data-visible={resolvedVisible} style={style}>{children}</span>;
    case "h1":
      return <h1 ref={setRef} className={classNames} data-mode="chars" data-visible={resolvedVisible} style={style}>{children}</h1>;
    case "h2":
      return <h2 ref={setRef} className={classNames} data-mode="chars" data-visible={resolvedVisible} style={style}>{children}</h2>;
    case "li":
      return <li ref={setRef} className={classNames} data-mode="chars" data-visible={resolvedVisible} style={style}>{children}</li>;
    case "p":
    default:
      return <p ref={setRef} className={classNames} data-mode="chars" data-visible={resolvedVisible} style={style}>{children}</p>;
  }
}
