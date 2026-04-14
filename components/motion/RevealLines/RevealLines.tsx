"use client";

import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import {
  usePretextLines,
  type PretextLinesWhiteSpace,
} from "@/components/motion/shared/usePretextLines";
import { useRevealOnView } from "@/components/motion/shared/useRevealOnView";
import { lockInternalHyphenWrapping } from "@/lib/lockInternalHyphenWrapping";
import styles from "@/components/motion/shared/reveal.module.scss";

type RevealLinesTag = "p" | "span" | "h1" | "h2" | "li" | "dt" | "dd";

export type RevealLinesProps = {
  as?: RevealLinesTag;
  className?: string;
  elementRef?: RefObject<HTMLElement | null>;
  offset?: number;
  stepMs?: number;
  text: string;
  total?: number;
  visible?: boolean;
  /**
   * When set, line tokens come from the parent (e.g. shared stagger with another `RevealLines`). Skips internal
   * `usePretextLines`; parent should measure with the same ref passed to this component.
   */
  lines?: string[];
  /**
   * When true (default), line tokens follow [@chenglou/pretext](https://github.com/chenglou/pretext) layout at the
   * element’s width (matches wrapping without DOM measurement). When false, splits only on `\n`.
   */
  measureLines?: boolean;
  /** Passed to Pretext when `measureLines` is true. Default `pre-wrap` keeps `\n` as hard breaks like CSS. */
  pretextWhiteSpace?: PretextLinesWhiteSpace;
  /** When set, replaces plain text inside each line token (e.g. mixed font families). */
  renderToken?: (token: string, index: number) => ReactNode;
  /**
   * Added to each line token’s entry delay (`--reveal-delay`). Use to align blocks that share a global
   * `--token-index` timeline (can be negative for overlap).
   */
  revealDelayMs?: number;
};

export function RevealLines({
  as = "p",
  className,
  elementRef,
  offset = 0,
  stepMs = 70,
  text,
  total,
  visible,
  lines: linesFromParent,
  measureLines = true,
  pretextWhiteSpace = "pre-wrap",
  renderToken,
  revealDelayMs,
}: RevealLinesProps) {
  const internalRef = useRef<HTMLElement | null>(null);
  const visibleOnView = useRevealOnView(internalRef);
  const resolvedVisible = visible ?? visibleOnView;
  const shouldMeasure = measureLines && linesFromParent === undefined;
  const measuredLines = usePretextLines(text, internalRef, pretextWhiteSpace, shouldMeasure);
  const tokens =
    linesFromParent
    ?? (measureLines ? measuredLines : lockInternalHyphenWrapping(text).split("\n"));
  const setRef = (node: HTMLElement | null) => {
    internalRef.current = node;
    if (elementRef) {
      elementRef.current = node;
    }
  };

  /** If `elementRef` is replaced, keep it in sync (ref callback only runs when the node attaches). */
  useLayoutEffect(() => {
    if (elementRef) {
      elementRef.current = internalRef.current;
    }
  }, [elementRef]);
  const classNames = [styles.root, className].filter(Boolean).join(" ");
  const style = {
    "--reveal-step": `${stepMs}ms`,
    "--reveal-total": total ?? tokens.length + offset,
    ...(revealDelayMs !== undefined && { "--reveal-delay": `${revealDelayMs}ms` }),
  } as CSSProperties;
  const children = tokens.map((token, index) => (
    <span key={`${token}-${index}`} className={styles.tokenClip}>
      <span
        className={styles.token}
        style={{ "--token-index": offset + index } as CSSProperties}
      >
        {renderToken ? renderToken(token, index) : token}
      </span>
    </span>
  ));

  switch (as) {
    case "span":
      return <span ref={setRef} className={classNames} data-mode="lines" data-pretext={measureLines ? "true" : undefined} data-visible={resolvedVisible} style={style}>{children}</span>;
    case "h1":
      return <h1 ref={setRef} className={classNames} data-mode="lines" data-pretext={measureLines ? "true" : undefined} data-visible={resolvedVisible} style={style}>{children}</h1>;
    case "h2":
      return <h2 ref={setRef} className={classNames} data-mode="lines" data-pretext={measureLines ? "true" : undefined} data-visible={resolvedVisible} style={style}>{children}</h2>;
    case "li":
      return <li ref={setRef} className={classNames} data-mode="lines" data-pretext={measureLines ? "true" : undefined} data-visible={resolvedVisible} style={style}>{children}</li>;
    case "dt":
      return <dt ref={setRef} className={classNames} data-mode="lines" data-pretext={measureLines ? "true" : undefined} data-visible={resolvedVisible} style={style}>{children}</dt>;
    case "dd":
      return <dd ref={setRef} className={classNames} data-mode="lines" data-pretext={measureLines ? "true" : undefined} data-visible={resolvedVisible} style={style}>{children}</dd>;
    case "p":
    default:
      return <p ref={setRef} className={classNames} data-mode="lines" data-pretext={measureLines ? "true" : undefined} data-visible={resolvedVisible} style={style}>{children}</p>;
  }
}
