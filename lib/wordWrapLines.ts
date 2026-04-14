type MeasureContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

let measureCtx: MeasureContext | null = null;

function getMeasureContext(): MeasureContext {
  if (measureCtx !== null) {
    return measureCtx;
  }
  if (typeof OffscreenCanvas !== "undefined") {
    measureCtx = new OffscreenCanvas(1, 1).getContext("2d");
  } else if (typeof document !== "undefined") {
    measureCtx = document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) {
    throw new Error("Canvas 2D context required for text measurement");
  }
  return measureCtx;
}

const graphemeSegmenter =
  typeof Intl !== "undefined"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function splitGraphemes(s: string): string[] {
  if (graphemeSegmenter) {
    return [...graphemeSegmenter.segment(s)].map((seg) => seg.segment);
  }
  return [...s];
}

/**
 * When a single token is wider than the line, break into grapheme chunks as a last resort
 * (URLs, long hashes). Normal words like "React" stay on one line via {@link wrapParagraph}.
 */
function breakOversizedWord(
  word: string,
  maxWidthPx: number,
  measure: (s: string) => number,
): string[] {
  const out: string[] = [];
  let line = "";
  for (const g of splitGraphemes(word)) {
    const candidate = line + g;
    if (line.length === 0) {
      if (measure(g) <= maxWidthPx) {
        line = g;
      } else {
        out.push(g);
      }
      continue;
    }
    if (measure(candidate) <= maxWidthPx) {
      line = candidate;
    } else {
      out.push(line);
      line = g;
    }
  }
  if (line.length > 0) {
    out.push(line);
  }
  return out;
}

function wrapParagraph(
  paragraph: string,
  maxWidthPx: number,
  measure: (s: string) => number,
): string[] {
  if (!paragraph) {
    return [];
  }
  const trimmed = paragraph.trim();
  if (!trimmed) {
    return paragraph.length > 0 ? [paragraph] : [];
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const sep = currentLine.length > 0 ? " " : "";
    const candidate = currentLine + sep + word;

    if (measure(candidate) <= maxWidthPx) {
      currentLine = candidate;
      continue;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = "";
    }

    if (measure(word) <= maxWidthPx) {
      currentLine = word;
    } else {
      lines.push(...breakOversizedWord(word, maxWidthPx, measure));
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

/**
 * Greedy word-wrap using canvas metrics — only breaks **between** words, except when one word
 * is wider than the line (then grapheme fallback). Avoids mid-word splits like `R` / `eact` that
 * Pretext can produce at narrow widths.
 */
export function layoutLinesWordWrap(
  text: string,
  maxWidthPx: number,
  font: string,
  whiteSpace: "normal" | "pre-wrap",
): string[] {
  const ctx = getMeasureContext();
  ctx.font = font;
  const measure = (s: string) => ctx.measureText(s).width;

  if (whiteSpace === "normal") {
    const collapsed = text.replace(/\s+/g, " ").trim();
    if (!collapsed) {
      return [""];
    }
    return wrapParagraph(collapsed, maxWidthPx, measure);
  }

  const parts = text.split("\n");
  const out: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part === "") {
      out.push("");
      continue;
    }
    const wrapped = wrapParagraph(part, maxWidthPx, measure);
    if (wrapped.length === 0) {
      out.push("");
    } else {
      out.push(...wrapped);
    }
  }

  return out.length > 0 ? out : [""];
}
