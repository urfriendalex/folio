import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import { lockInternalHyphenWrapping } from "@/lib/lockInternalHyphenWrapping";

/** Reference font size (px) for Pretext measurement; final size scales linearly. */
const PROBE_FONT_PX = 512;

const MIN_FONT_PX = 8;
const MAX_FONT_PX = 16000;

type ProbeCache = {
  text: string;
  fontProbe: string;
  naturalWidth: number;
};

let probeCache: ProbeCache | null = null;

/**
 * Font size (px) so `text` fits `maxWidthPx` on one line, using Pretext + canvas metrics
 * (no DOM scrollWidth / reflow). `fontAtSize` must match the element’s CSS font
 * (style, weight, family) at the given pixel size.
 *
 * Caches `prepareWithSegments` + first-line width when only the target width changes (resize).
 */
export function wordmarkFontSizePxForWidth(
  text: string,
  maxWidthPx: number,
  fontAtSize: (sizePx: number) => string,
): number {
  if (maxWidthPx <= 1) {
    return MIN_FONT_PX;
  }

  const fontProbe = fontAtSize(PROBE_FONT_PX);
  const normalizedText = lockInternalHyphenWrapping(text);

  if (!probeCache || probeCache.text !== normalizedText || probeCache.fontProbe !== fontProbe) {
    const prepared = prepareWithSegments(normalizedText, fontProbe);
    const { lines } = layoutWithLines(prepared, 1e12, 1);
    probeCache = {
      text: normalizedText,
      fontProbe,
      naturalWidth: lines[0]?.width ?? 0,
    };
  }

  const naturalWidth = probeCache.naturalWidth;

  if (naturalWidth <= 0) {
    return MIN_FONT_PX;
  }

  const raw = (maxWidthPx / naturalWidth) * PROBE_FONT_PX;
  return Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, raw));
}
