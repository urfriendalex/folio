"use client";

import { lockInternalHyphenWrapping } from "@/lib/lockInternalHyphenWrapping";
import { layoutLinesWordWrap } from "@/lib/wordWrapLines";
import { useLayoutEffect, useState, type RefObject } from "react";

export type PretextLinesWhiteSpace = "normal" | "pre-wrap";

function fallbackLines(text: string): string[] {
  return text.split("\n");
}

/** Content-box width available for text (excludes horizontal padding). */
function contentWidthPx(el: HTMLElement, cs: CSSStyleDeclaration): number {
  const pl = parseFloat(cs.paddingLeft) || 0;
  const pr = parseFloat(cs.paddingRight) || 0;
  return el.clientWidth - pl - pr;
}

function letterSpacingPx(cs: CSSStyleDeclaration): number {
  if (cs.letterSpacing === "normal") {
    return 0;
  }
  const px = parseFloat(cs.letterSpacing);
  return Number.isFinite(px) ? px : 0;
}

/**
 * Canvas `measureText` ignores CSS `letter-spacing`. Negative tracking makes rendered lines
 * narrower than measured widths, so we narrow the layout budget slightly so breaks match the DOM.
 */
function pretextMaxWidthPx(contentWidth: number, cs: CSSStyleDeclaration): number {
  const ls = letterSpacingPx(cs);
  if (ls === 0) {
    return contentWidth;
  }
  const fontSize = parseFloat(cs.fontSize) || 16;
  const avgCharPx = fontSize * 0.52;
  const nEst = Math.max(12, Math.min(96, Math.floor(contentWidth / avgCharPx)));
  return contentWidth - (nEst - 1) * ls;
}

/**
 * Width-aware line breaks for reveal animations: canvas `measureText` + greedy wrap **between words**
 * only (no mid-word splits like `R` / `eact`). Hyphen locking runs via {@link lockInternalHyphenWrapping}.
 * Resize re-runs layout only.
 */
export function usePretextLines(
  text: string,
  containerRef: RefObject<HTMLElement | null>,
  whiteSpace: PretextLinesWhiteSpace = "pre-wrap",
  enabled = true,
): string[] {
  const normalizedText = lockInternalHyphenWrapping(text);
  const [lines, setLines] = useState<string[]>(() => fallbackLines(normalizedText));

  useLayoutEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const el = containerRef.current;
    if (!el) {
      return undefined;
    }

    const update = () => {
      const cs = getComputedStyle(el);
      const font = cs.font;
      const width = pretextMaxWidthPx(contentWidthPx(el, cs), cs);

      if (width <= 1 || !font) {
        setLines(fallbackLines(normalizedText));
        return;
      }

      setLines(layoutLinesWordWrap(normalizedText, width, font, whiteSpace));
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, [normalizedText, whiteSpace, enabled, containerRef]);

  useLayoutEffect(() => {
    if (enabled) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setLines(fallbackLines(normalizedText));
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [enabled, normalizedText]);

  return lines;
}
