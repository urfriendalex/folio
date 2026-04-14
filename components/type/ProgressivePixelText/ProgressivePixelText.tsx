"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styles from "./ProgressivePixelText.module.scss";

type ProgressivePixelTextProps = {
  ariaHidden?: boolean;
  className?: string;
  gamma?: number;
  minBlock?: number;
  maxBlockRatio?: number;
  pixelationStart?: number;
  lastCharOnly?: boolean;
  /** One line, no wrapping; width uses max(container, scrollWidth). */
  singleLine?: boolean;
  /** Animate whole-text sharpen (mosaic → sharp) on hover (canvas-only, no DOM overlay). */
  canvasHoverReveal?: boolean;
  /** When true (e.g. link has focus), keep reveal fully sharp alongside pointer hover. */
  focusActive?: boolean;
  /** With `canvasHoverReveal`, use `--signal-color` while hovered/focused (site accent red). */
  signalColorOnHover?: boolean;
  text: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function splitGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), ({ segment }) => segment);
  }
  return Array.from(text);
}

function averageRect(
  data: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  x0: number,
  y0: number,
  rw: number,
  rh: number,
): { r: number; g: number; b: number; a: number } {
  const x1 = clamp(Math.floor(x0), 0, srcW);
  const y1 = clamp(Math.floor(y0), 0, srcH);
  const x2 = clamp(Math.ceil(x0 + rw), 0, srcW);
  const y2 = clamp(Math.ceil(y0 + rh), 0, srcH);
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  let count = 0;
  for (let y = y1; y < y2; y++) {
    const row = y * srcW * 4;
    for (let x = x1; x < x2; x++) {
      const i = row + x * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      a += data[i + 3];
      count++;
    }
  }
  if (!count) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
    a: Math.round(a / count),
  };
}

function wrapTextToWidth(
  ctx: CanvasRenderingContext2D,
  line: string,
  maxWidth: number,
): string[] {
  if (maxWidth <= 0) {
    return [line];
  }
  const lines: string[] = [];
  let current = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = current + ch;
    if (ctx.measureText(next).width > maxWidth && current.length > 0) {
      lines.push(current);
      current = ch;
    } else {
      current = next;
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines.length > 0 ? lines : [""];
}

function drawProgressiveMosaicFullWidth(
  srcData: ImageData,
  srcW: number,
  srcH: number,
  logicalW: number,
  logicalH: number,
  dpr: number,
  outCtx: CanvasRenderingContext2D,
  outW: number,
  outH: number,
  outDpr: number,
  minBlock: number,
  maxBlock: number,
  gamma: number,
  pixelationStart: number,
) {
  outCtx.clearRect(0, 0, outW, outH);
  const data = srcData.data;
  const start = clamp(pixelationStart, 0, 0.95);
  const denom = Math.max(1e-6, 1 - start);

  let lx = 0;
  while (lx < logicalW) {
    const t0 = logicalW <= 1 ? 1 : lx / logicalW;
    const ramp = clamp((t0 - start) / denom, 0, 1);
    // Strong ease: small blocks for a long span; tail stays readable
    const rampSoft = Math.pow(ramp, 0.64) * 0.84;
    const sLog = minBlock + (maxBlock - minBlock) * rampSoft ** gamma;
    const cw = clamp(Math.round(sLog), 1, logicalW - lx);

    for (let ly = 0; ly < logicalH; ly += cw) {
      const ch = Math.min(cw, logicalH - ly);
      const sx0 = lx * dpr;
      const sy0 = ly * dpr;
      const sw = cw * dpr;
      const sh = ch * dpr;
      const { r, g, b, a } = averageRect(data, srcW, srcH, sx0, sy0, sw, sh);
      if (a < 10) {
        continue;
      }
      outCtx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      outCtx.fillRect(lx * outDpr, ly * outDpr, cw * outDpr, ch * outDpr);
    }
    lx += cw;
  }
}

function drawLastGraphemeMosaic(
  srcData: ImageData,
  srcW: number,
  srcH: number,
  dpr: number,
  outCtx: CanvasRenderingContext2D,
  outDpr: number,
  minBlock: number,
  maxBlock: number,
  gamma: number,
  region: { x0: number; y0: number; x1: number; y1: number },
) {
  outCtx.putImageData(srcData, 0, 0);
  const data = srcData.data;
  const rw = Math.max(1e-6, region.x1 - region.x0);
  let lx = region.x0;
  while (lx < region.x1) {
    const t = (lx - region.x0) / rw;
    const ramp = t ** gamma;
    const sLog = minBlock + (maxBlock - minBlock) * ramp;
    const cw = clamp(Math.round(sLog), 1, region.x1 - lx);

    for (let ly = region.y0; ly < region.y1; ly += cw) {
      const ch = Math.min(cw, region.y1 - ly);
      const sx0 = lx * dpr;
      const sy0 = ly * dpr;
      const sw = cw * dpr;
      const sh = ch * dpr;
      const { r, g, b, a } = averageRect(data, srcW, srcH, sx0, sy0, sw, sh);
      if (a < 10) {
        continue;
      }
      outCtx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      outCtx.fillRect(lx * outDpr, ly * outDpr, cw * outDpr, ch * outDpr);
    }
    lx += cw;
  }
}

function stableHash2D(x: number, y: number): number {
  let h = (Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return (h >>> 0) / 4294967296;
}

/** 4×4 Bayer matrix for ordered dither (tech / scanline feel). */
const BAYER4 = [
  0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5,
];

/** Ease-out: linear "sharp probability" → clarity resolving (filter lifting off). */
function clarityFromLinearSharp(t: number, power = 2.45): number {
  if (t <= 0) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  return 1 - (1 - t) ** power;
}

/** Whole canvas sharpens together; `hoverT` 0 = mosaic, 1 = sharp. */
function compositeUniformClarityUnpixelate(
  sharpCanvas: HTMLCanvasElement,
  mosaicCanvas: HTMLCanvasElement,
  hoverT: number,
  outCtx: CanvasRenderingContext2D,
  outW: number,
  outH: number,
) {
  const t = clamp(hoverT, 0, 1);
  outCtx.clearRect(0, 0, outW, outH);

  if (t <= 0) {
    outCtx.drawImage(mosaicCanvas, 0, 0);
    return;
  }
  if (t >= 1) {
    outCtx.drawImage(sharpCanvas, 0, 0);
    return;
  }

  const sharpCtx = sharpCanvas.getContext("2d", { alpha: true });
  const mosaicCtx = mosaicCanvas.getContext("2d", { alpha: true });
  if (!sharpCtx || !mosaicCtx) {
    outCtx.drawImage(mosaicCanvas, 0, 0);
    return;
  }

  const sharpData = sharpCtx.getImageData(0, 0, outW, outH);
  const mosaicData = mosaicCtx.getImageData(0, 0, outW, outH);
  const sd = sharpData.data;
  const md = mosaicData.data;
  const out = outCtx.createImageData(outW, outH);
  const od = out.data;

  const c = clarityFromLinearSharp(t, 2.1);

  for (let y = 0; y < outH; y++) {
    const row = y * outW * 4;
    for (let x = 0; x < outW; x++) {
      const i = row + x * 4;
      const bayer = BAYER4[(y & 3) * 4 + (x & 3)] / 16;
      const h = stableHash2D(x, y);
      const st = (bayer + h) * 0.5;
      const pickSharp = st < c;
      const wBinary = pickSharp ? 1 : 0;
      // Mostly binary decode (sharp vs mosaic samples), tiny linear anchor — avoids “opacity fade”
      const wSharp = clamp(wBinary * 0.93 + c * 0.07, 0, 1);
      const wM = 1 - wSharp;
      od[i] = sd[i] * wSharp + md[i] * wM;
      od[i + 1] = sd[i + 1] * wSharp + md[i + 1] * wM;
      od[i + 2] = sd[i + 2] * wSharp + md[i + 2] * wM;
      od[i + 3] = sd[i + 3] * wSharp + md[i + 3] * wM;
    }
  }
  outCtx.putImageData(out, 0, 0);
}

export function ProgressivePixelText({
  ariaHidden = false,
  className,
  gamma = 1.38,
  minBlock = 1,
  maxBlockRatio = 0.052,
  pixelationStart = 0.06,
  lastCharOnly = false,
  singleLine = false,
  canvasHoverReveal = false,
  focusActive = false,
  signalColorOnHover = true,
  text,
}: ProgressivePixelTextProps) {
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fallback, setFallback] = useState(false);
  const [pointerHover, setPointerHover] = useState(false);
  const hoverRef = useRef(0);
  const hoverTargetRef = useRef(0);
  const pointerInsideRef = useRef(false);
  const rafHoverRef = useRef<number | null>(null);

  const useAccentColor =
    canvasHoverReveal && signalColorOnHover && (pointerHover || focusActive);

  const paint = useCallback(async () => {
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !measure || !canvas || !text) {
      return;
    }

    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }

    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const computed = getComputedStyle(measure);
    const font = computed.font;
    const color = computed.color;
    const fontSize = parseFloat(computed.fontSize || "16");

    let logicalW = Math.max(1, Math.round(measure.offsetWidth));
    if (singleLine) {
      logicalW = Math.max(logicalW, Math.ceil(measure.scrollWidth));
    }
    if (logicalW < 2) {
      return;
    }

    const off = document.createElement("canvas");
    const sctx = off.getContext("2d", { alpha: true });
    if (!sctx) {
      setFallback(true);
      return;
    }

    sctx.font = font;
    sctx.fillStyle = color;
    sctx.textBaseline = "alphabetic";

    const lines = singleLine ? [text] : wrapTextToWidth(sctx, text, logicalW - 1);
    const probe = sctx.measureText("Mg");
    const ascent =
      probe.fontBoundingBoxAscent ??
      probe.actualBoundingBoxAscent ??
      probe.emHeightAscent ??
      0.75 * fontSize;
    const descent =
      probe.fontBoundingBoxDescent ??
      probe.actualBoundingBoxDescent ??
      probe.emHeightDescent ??
      0.25 * fontSize;
    const lineHeight = Math.ceil((ascent + descent) * 1.08);

    const padTop = Math.ceil(fontSize * 0.14);
    const padBottom = Math.ceil(Math.max(descent, fontSize * 0.22) * 1.25);
    const numLines = lines.length;
    const contentBottom = padTop + ascent + (numLines - 1) * lineHeight + descent;
    const logicalH = Math.max(Math.ceil(contentBottom + padBottom), Math.round(measure.offsetHeight));

    const srcW = Math.ceil(logicalW * dpr);
    const srcH = Math.ceil(logicalH * dpr);
    off.width = srcW;
    off.height = srcH;

    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.font = font;
    sctx.fillStyle = color;
    sctx.textBaseline = "alphabetic";
    sctx.scale(dpr, dpr);
    sctx.clearRect(0, 0, logicalW, logicalH);

    measure.style.minHeight = `${logicalH}px`;

    let y = padTop + ascent;
    for (const line of lines) {
      sctx.fillText(line, 0, y);
      y += lineHeight;
    }

    const sharpSrc = sctx.getImageData(0, 0, srcW, srcH);

    const outW = Math.ceil(logicalW * dpr);
    const outH = Math.ceil(logicalH * dpr);
    canvas.width = outW;
    canvas.height = outH;
    canvas.style.width = `${logicalW}px`;
    canvas.style.height = `${logicalH}px`;

    const octx = canvas.getContext("2d", { alpha: true });
    if (!octx) {
      setFallback(true);
      return;
    }

    const maxBlockFromRatio = Math.max(
      minBlock + 1,
      Math.round(logicalW * clamp(maxBlockRatio, 0.006, 0.95)),
    );
    const maxBlockHardCeil = Math.max(minBlock + 1, Math.ceil(logicalW * 0.011));
    const maxBlock = Math.min(maxBlockFromRatio, maxBlockHardCeil);

    const sharpBuf = document.createElement("canvas");
    sharpBuf.width = outW;
    sharpBuf.height = outH;
    const sbuf = sharpBuf.getContext("2d");
    if (!sbuf) {
      setFallback(true);
      return;
    }
    sbuf.putImageData(sharpSrc, 0, 0);

    if (lastCharOnly) {
      const lastLine = lines[lines.length - 1] ?? "";
      const gs = splitGraphemes(lastLine);
      const lastG = gs[gs.length - 1];
      if (!lastG || gs.length === 0) {
        octx.putImageData(sharpSrc, 0, 0);
        setFallback(false);
        return;
      }

      const beforeLast = gs.slice(0, -1).join("");
      const x0 = sctx.measureText(beforeLast).width;
      const x1 = x0 + sctx.measureText(lastG).width;

      const lineIndex = lines.length - 1;
      const baseline = padTop + ascent + lineIndex * lineHeight;
      const y0 = Math.max(0, baseline - ascent - 1);
      const y1 = Math.min(logicalH, baseline + descent + 3);

      const region = {
        x0: clamp(x0, 0, logicalW - 1),
        x1: clamp(Math.max(x1, x0 + 1), 1, logicalW),
        y0,
        y1: Math.max(y1, y0 + 1),
      };

      const regionW = region.x1 - region.x0;
      const maxBlockLocalRaw = Math.max(
        minBlock + 2,
        Math.round(regionW * clamp(maxBlockRatio, 0.06, 0.95)),
      );
      const maxBlockLocal = Math.min(
        maxBlockLocalRaw,
        Math.max(minBlock + 2, Math.ceil(regionW * 0.014)),
      );

      const mosaicBuf = document.createElement("canvas");
      mosaicBuf.width = outW;
      mosaicBuf.height = outH;
      const mb = mosaicBuf.getContext("2d");
      if (!mb) {
        setFallback(true);
        return;
      }
      drawLastGraphemeMosaic(
        sharpSrc,
        srcW,
        srcH,
        dpr,
        mb,
        dpr,
        minBlock,
        maxBlockLocal,
        gamma,
        region,
      );

      if (canvasHoverReveal) {
        compositeUniformClarityUnpixelate(
          sharpBuf,
          mosaicBuf,
          hoverRef.current,
          octx,
          outW,
          outH,
        );
      } else {
        octx.drawImage(mosaicBuf, 0, 0);
      }
      setFallback(false);
      return;
    }

    const mosaicCanvas = document.createElement("canvas");
    mosaicCanvas.width = outW;
    mosaicCanvas.height = outH;
    const mctx = mosaicCanvas.getContext("2d", { alpha: true });
    if (!mctx) {
      setFallback(true);
      return;
    }

    drawProgressiveMosaicFullWidth(
      sharpSrc,
      srcW,
      srcH,
      logicalW,
      logicalH,
      dpr,
      mctx,
      outW,
      outH,
      dpr,
      minBlock,
      maxBlock,
      gamma,
      pixelationStart,
    );

    if (canvasHoverReveal && lines.length > 0) {
      compositeUniformClarityUnpixelate(
        sharpBuf,
        mosaicCanvas,
        hoverRef.current,
        octx,
        outW,
        outH,
      );
    } else {
      octx.drawImage(mosaicCanvas, 0, 0);
    }

    setFallback(false);
  }, [canvasHoverReveal, gamma, lastCharOnly, maxBlockRatio, minBlock, pixelationStart, singleLine, text]);

  useLayoutEffect(() => {
    void document.fonts.ready.then(() => paint());
  }, [paint]);

  useLayoutEffect(() => {
    if (!canvasHoverReveal) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      paint();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [canvasHoverReveal, focusActive, paint, pointerHover, signalColorOnHover]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => paint());
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [paint]);

  useEffect(() => {
    const onResize = () => {
      requestAnimationFrame(() => paint());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [paint]);

  useEffect(() => {
    const html = document.documentElement;
    const schedule = () => {
      requestAnimationFrame(() => paint());
    };
    const mo = new MutationObserver(schedule);
    mo.observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [paint]);

  const focusActiveRef = useRef(focusActive);

  useEffect(() => {
    focusActiveRef.current = focusActive;
  }, [focusActive]);

  const runHoverAnimation = useCallback(() => {
    if (rafHoverRef.current !== null) {
      cancelAnimationFrame(rafHoverRef.current);
    }
    const step = () => {
      const cur = hoverRef.current;
      const tgt = hoverTargetRef.current;
      const delta = tgt - cur;
      if (Math.abs(delta) < 0.008) {
        hoverRef.current = tgt;
        paint();
        rafHoverRef.current = null;
        return;
      }
      hoverRef.current += delta * 0.34;
      paint();
      rafHoverRef.current = requestAnimationFrame(step);
    };
    rafHoverRef.current = requestAnimationFrame(step);
  }, [paint]);

  useEffect(() => {
    if (!canvasHoverReveal) {
      return;
    }
    hoverTargetRef.current = focusActive || pointerInsideRef.current ? 1 : 0;
    runHoverAnimation();
  }, [canvasHoverReveal, focusActive, runHoverAnimation]);

  const onPointerEnter = useCallback(() => {
    if (!canvasHoverReveal) {
      return;
    }
    pointerInsideRef.current = true;
    setPointerHover(true);
    hoverTargetRef.current = 1;
    runHoverAnimation();
  }, [canvasHoverReveal, runHoverAnimation]);

  const onPointerLeave = useCallback(() => {
    if (!canvasHoverReveal) {
      return;
    }
    pointerInsideRef.current = false;
    setPointerHover(false);
    hoverTargetRef.current = focusActiveRef.current ? 1 : 0;
    runHoverAnimation();
  }, [canvasHoverReveal, runHoverAnimation]);

  const measureColorStyle =
    canvasHoverReveal && signalColorOnHover
      ? ({
          color: useAccentColor ? "var(--signal-color)" : "var(--fg-color)",
        } as const)
      : undefined;

  if (fallback) {
    return (
      <span
        className={[styles.fallback, className].filter(Boolean).join(" ")}
        style={
          canvasHoverReveal && signalColorOnHover
            ? { color: useAccentColor ? "var(--signal-color)" : "var(--fg-color)" }
            : undefined
        }
        aria-hidden={ariaHidden}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      ref={wrapRef}
      className={[styles.wrap, singleLine ? styles.wrapSingleLine : "", className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={ariaHidden}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <span
        ref={measureRef}
        className={[styles.measure, singleLine ? styles.measureSingleLine : "", styles.measureColorLatch]
          .filter(Boolean)
          .join(" ")}
        style={measureColorStyle}
      >
        {text}
      </span>
      <canvas ref={canvasRef} className={styles.canvas} role="presentation" />
    </span>
  );
}
