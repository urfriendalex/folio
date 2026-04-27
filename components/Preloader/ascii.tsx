"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Quality = "low" | "medium" | "high";

type ResolvedSource = {
  baseUrl: string;
  format: "text" | "color";
};

type SourceFormat = "auto" | "text" | "color";

interface ColorAsciiMeta {
  version: 2;
  format: "color-ascii-v2";
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  palette: string[];
  paletteSize: number;
  charset: string;
  renderMode: "ascii";
  colorMode: "color";
  bgMode: "black" | "green" | "transparent";
  dithering: "off" | "ordered";
  frameEncoding: "packed-12";
  bitsPerGlyph: number;
  bitsPerColor: number;
  bytesPerFrame: number;
}

interface ASCIIAnimationProps {
  frames?: string[];
  className?: string;
  preClassName?: string;
  fps?: number;
  frameCount?: number;
  frameFolder?: string;
  showFrameCounter?: boolean;
  quality?: Quality;
  ariaLabel?: string;
  lazy?: boolean;
  onReady?: () => void;
  scale?: number;
  color?: string;
  gradient?: string;
  paused?: boolean;
  playOnHover?: boolean;
  sourceFormat?: SourceFormat;
  /** Stretch canvas/pre to fill the container (100% × 100%) with CSS; uses object-fit: cover for color canvas. */
  fillParent?: boolean;
  /**
   * Color frames only: each cell gets a stable pseudo-random threshold; glyphs appear as progress 0→1
   * (scrambled “pop-in” order). Respects `prefers-reduced-motion` (full frame at once).
   */
  randomCellReveal?: boolean;
  /** Duration for one full random reveal pass (ms). */
  randomCellRevealDurationMs?: number;
  /** Toggle render visibility without layout changes. */
  visible?: boolean;
  /** Text/color frames: reveal and hide using a stable random cell mask instead of container fades/scales. */
  randomVisibilityReveal?: boolean;
  /** Duration for random enter visibility reveal (ms). Exit runs slightly faster. */
  randomVisibilityDurationMs?: number;
  /** Color frames: skip solid background so empty areas stay transparent (overrides meta `bgMode` when true). */
  transparentCanvasBackground?: boolean;
}

const FALLBACK_ORDER: Record<Quality, Quality[]> = {
  low: ["low", "high", "medium"],
  medium: ["medium", "high", "low"],
  high: ["high", "low", "medium"],
};

const CONTAIN_SCALE_FACTOR = 1;
const FONT_SIZE = 10;
const FONT_FAMILY = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace";

async function resolveFrameSource(
  frameFolder: string,
  quality: Quality,
  firstFrameFile: string,
  sourceFormat: SourceFormat,
): Promise<ResolvedSource | null> {
  const fallbackQualities = FALLBACK_ORDER[quality];

  for (const candidate of fallbackQualities) {
    const probeTextFirst = sourceFormat !== "color";
    const formatsToTry: Array<ResolvedSource["format"]> = probeTextFirst ? ["text", "color"] : ["color"];

    for (const format of formatsToTry) {
      try {
        const probeUrl = format === "color"
          ? `/${frameFolder}/${candidate}/meta.json`
          : `/${frameFolder}/${candidate}/${firstFrameFile}`;
        const probeResponse = await fetch(probeUrl);
        if (probeResponse.ok) {
          if (candidate !== quality) {
            console.warn(
              `ASCIIAnimation: quality "${quality}" not found in "${frameFolder}", falling back to "${candidate}"`,
            );
          }

          return { baseUrl: `/${frameFolder}/${candidate}`, format };
        }
      } catch {
        // continue to next candidate / format
      }
    }
  }

  try {
    const legacyProbe = await fetch(`/${frameFolder}/${firstFrameFile}`);
    if (legacyProbe.ok) {
      console.warn(
        `ASCIIAnimation: no quality subfolders found in "${frameFolder}", using flat folder structure`,
      );

      return { baseUrl: `/${frameFolder}`, format: "text" };
    }
  } catch {
    // no legacy frames either
  }

  return null;
}

function decodeColorFrame(meta: ColorAsciiMeta, buffer: Uint8Array) {
  const cellCount = meta.width * meta.height;
  const glyphs = new Uint8Array(cellCount);
  const colors = new Uint8Array(cellCount);

  for (let index = 0, offset = 0; index < cellCount; index += 2, offset += 3) {
    const byte0 = buffer[offset] ?? 0;
    const byte1 = buffer[offset + 1] ?? 0;
    const byte2 = buffer[offset + 2] ?? 0;
    const cellA = (byte0 << 4) | (byte1 >> 4);
    const cellB = ((byte1 & 0x0f) << 8) | byte2;

    glyphs[index] = cellA >> meta.bitsPerColor;
    colors[index] = cellA & ((1 << meta.bitsPerColor) - 1);

    if (index + 1 < cellCount) {
      glyphs[index + 1] = cellB >> meta.bitsPerColor;
      colors[index + 1] = cellB & ((1 << meta.bitsPerColor) - 1);
    }
  }

  return { glyphs, colors };
}

/** Deterministic hash in [0, 1) for cell index + frame — used for random-order glyph reveal. */
function cellRevealHash01(cellIndex: number, frameKey: number): number {
  let h = Math.imul(cellIndex ^ frameKey, 0x9e3779b9) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

function easeOutQuart(value: number): number {
  return 1 - (1 - value) ** 4;
}

function maskTextFrame(frameText: string, revealProgress: number, frameKey: number): string {
  if (revealProgress >= 1) {
    return frameText;
  }

  if (revealProgress <= 0) {
    return frameText.replace(/[^\r\n]/g, " ");
  }

  let cellIndex = 0;
  let masked = "";

  for (let index = 0; index < frameText.length; index += 1) {
    const char = frameText[index] ?? "";
    if (char === "\r" || char === "\n") {
      masked += char;
      continue;
    }

    masked += cellRevealHash01(cellIndex, frameKey) <= revealProgress ? char : " ";
    cellIndex += 1;
  }

  return masked;
}

type DrawColorFrameOptions = {
  revealProgress?: number;
  frameKey?: number;
  transparentBackground?: boolean;
};

function drawColorFrame(
  canvas: HTMLCanvasElement,
  meta: ColorAsciiMeta,
  buffer: Uint8Array,
  options?: DrawColorFrameOptions,
) {
  const revealProgress = options?.revealProgress ?? 1;
  const frameKey = options?.frameKey ?? 0;
  const useReveal = revealProgress < 1;
  const transparentBg =
    options?.transparentBackground === true || meta.bgMode === "transparent";
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
  ctx.textBaseline = "top";
  const cellWidth = Math.ceil(ctx.measureText("M").width);
  const cellHeight = Math.ceil(FONT_SIZE);

  canvas.width = Math.max(1, meta.width * cellWidth);
  canvas.height = Math.max(1, meta.height * cellHeight);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!transparentBg) {
    ctx.fillStyle = meta.bgMode === "green" ? "#001f00" : "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
  ctx.textBaseline = "top";

  const frame = decodeColorFrame(meta, buffer);
  for (let index = 0; index < frame.glyphs.length; index += 1) {
    if (useReveal && cellRevealHash01(index, frameKey) > revealProgress) {
      continue;
    }

    const char = meta.charset[frame.glyphs[index] ?? 0] ?? " ";
    if (char === " ") {
      continue;
    }

    ctx.fillStyle = meta.palette[frame.colors[index] ?? 0] ?? "#fff";
    ctx.fillText(
      char,
      (index % meta.width) * cellWidth,
      Math.floor(index / meta.width) * cellHeight,
    );
  }
}

export default function ASCIIAnimation({
  frames: providedFrames,
  className = "",
  preClassName = "",
  fps = 24,
  frameCount = 60,
  frameFolder = "frames",
  showFrameCounter = false,
  ariaLabel,
  quality = "medium",
  lazy = true,
  onReady,
  scale = 1,
  color,
  gradient,
  paused = false,
  playOnHover = false,
  sourceFormat = "auto",
  fillParent = false,
  randomCellReveal = false,
  randomCellRevealDurationMs = 650,
  visible = true,
  randomVisibilityReveal = false,
  randomVisibilityDurationMs = 520,
  transparentCanvasBackground = false,
}: ASCIIAnimationProps) {
  const [frames, setFrames] = useState<string[]>([]);
  const [colorFrames, setColorFrames] = useState<Uint8Array[]>([]);
  const [meta, setMeta] = useState<ColorAsciiMeta | null>(null);
  const [format, setFormat] = useState<"text" | "color" | null>(providedFrames ? "text" : null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isIntersecting, setIsIntersecting] = useState(!lazy);
  const [isHovered, setIsHovered] = useState(false);
  const [scaleValue, setScaleValue] = useState(scale);
  const [scaled, setScaled] = useState(false);
  const [visibilityProgress, setVisibilityProgress] = useState(visible ? 1 : 0);
  const [visibilitySeed, setVisibilitySeed] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fullLoadTriggered = useRef(false);
  const resolvedSource = useRef<ResolvedSource | null>(null);
  const hasNotifiedReadyRef = useRef(false);
  const revealRafRef = useRef<number>(0);
  const visibilityRafRef = useRef<number>(0);
  const visibilityProgressRef = useRef(visible ? 1 : 0);
  const visibilitySeedRef = useRef(0);

  const notifyReady = useCallback(() => {
    if (hasNotifiedReadyRef.current) {
      return;
    }

    hasNotifiedReadyRef.current = true;
    onReady?.();
  }, [onReady]);

  const frameFiles = useMemo(
    () =>
      Array.from(
        { length: frameCount },
        (_, index) => `frame_${String(index + 1).padStart(5, "0")}.txt`,
      ),
    [frameCount],
  );

  const loadAllFrames = useCallback(async (resolved = resolvedSource.current) => {
    if (!resolved || fullLoadTriggered.current) {
      return;
    }

    fullLoadTriggered.current = true;

    try {
      if (resolved.format === "color") {
        const metaResponse = await fetch(`${resolved.baseUrl}/meta.json`);
        if (!metaResponse.ok) {
          throw new Error(`Failed to fetch color ASCII metadata: ${metaResponse.status}`);
        }

        const resolvedMeta = (await metaResponse.json()) as ColorAsciiMeta;
        const loadedFrames = await Promise.all(
          Array.from({ length: resolvedMeta.frameCount }, async (_, index) => {
            const response = await fetch(
              `${resolved.baseUrl}/frame_${String(index + 1).padStart(5, "0")}.bin`,
            );
            if (!response.ok) {
              throw new Error(`Failed to fetch color frame ${index + 1}: ${response.status}`);
            }
            return new Uint8Array(await response.arrayBuffer());
          }),
        );

        setMeta(resolvedMeta);
        setColorFrames(loadedFrames);
        setFrames([]);
      } else {
        const loadedFrames = await Promise.all(
          frameFiles.map(async (filename) => {
            const response = await fetch(`${resolved.baseUrl}/${filename}`);
            if (!response.ok) {
              throw new Error(`Failed to fetch ${filename}: ${response.status}`);
            }
            return response.text();
          }),
        );

        setFrames(loadedFrames);
        setColorFrames([]);
        setMeta(null);
      }

      setCurrentFrameIndex(0);
    } catch (error) {
      console.error("Failed to load ASCII frames:", error);
    } finally {
      setIsLoading(false);
      notifyReady();
    }
  }, [frameFiles, notifyReady]);

  useEffect(() => {
    fullLoadTriggered.current = false;
    resolvedSource.current = null;
    hasNotifiedReadyRef.current = false;
    setFrames(providedFrames ?? []);
    setColorFrames([]);
    setMeta(null);
    setFormat(providedFrames ? "text" : null);
    setCurrentFrameIndex(0);
    setIsIntersecting(!lazy);
    setIsLoading(!providedFrames);
    setScaled(false);

    const loadPreview = async () => {
      if (providedFrames) {
        setIsLoading(false);
        fullLoadTriggered.current = true;
        notifyReady();
        return;
      }

      const firstFrameFile = frameFiles[0];
      if (!firstFrameFile) {
        setIsLoading(false);
        notifyReady();
        return;
      }

      const source = await resolveFrameSource(frameFolder, quality, firstFrameFile, sourceFormat);
      if (!source) {
        console.error(
          `ASCIIAnimation: could not find frames in any quality folder or flat structure for "${frameFolder}"`,
        );
        setIsLoading(false);
        notifyReady();
        return;
      }

      resolvedSource.current = source;
      setFormat(source.format);

      try {
        if (source.format === "color") {
          const metaResponse = await fetch(`${source.baseUrl}/meta.json`);
          if (!metaResponse.ok) {
            throw new Error(`Failed to fetch color ASCII metadata: ${metaResponse.status}`);
          }

          const resolvedMeta = (await metaResponse.json()) as ColorAsciiMeta;
          const previewResponse = await fetch(`${source.baseUrl}/frame_00001.bin`);
          if (!previewResponse.ok) {
            throw new Error(`Failed to fetch preview color frame: ${previewResponse.status}`);
          }

          setMeta(resolvedMeta);
          setColorFrames([new Uint8Array(await previewResponse.arrayBuffer())]);
          setFrames([]);
        } else {
          const response = await fetch(`${source.baseUrl}/${firstFrameFile}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch preview frame: ${response.status}`);
          }

          setFrames([await response.text()]);
          setColorFrames([]);
          setMeta(null);
        }

        setCurrentFrameIndex(0);
      } catch (error) {
        console.error("Failed to load preview frame:", error);
      }

      if (!lazy) {
        await loadAllFrames(source);
      } else {
        setIsLoading(false);
        notifyReady();
      }
    };

    loadPreview();
  }, [providedFrames, frameFolder, quality, lazy, frameFiles, loadAllFrames, notifyReady, sourceFormat]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !lazy) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsIntersecting(entry.isIntersecting);

          if (entry.isIntersecting && !fullLoadTriggered.current) {
            void loadAllFrames();
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [lazy, loadAllFrames]);

  const shouldPlay = isIntersecting && (!playOnHover || isHovered) && !paused;
  const totalFrames = format === "color" ? colorFrames.length : frames.length;
  const currentTextFrame = frames[currentFrameIndex] || frames[0] || "";
  const maskedTextFrame = useMemo(() => {
    if (format !== "text" || !randomVisibilityReveal) {
      return currentTextFrame;
    }

    return maskTextFrame(currentTextFrame, visibilityProgress, visibilitySeed);
  }, [currentTextFrame, format, randomVisibilityReveal, visibilityProgress, visibilitySeed]);

  useEffect(() => {
    window.cancelAnimationFrame(visibilityRafRef.current);

    const target = visible ? 1 : 0;

    if (!randomVisibilityReveal) {
      visibilityProgressRef.current = target;
      setVisibilityProgress(target);
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      visibilityProgressRef.current = target;
      setVisibilityProgress(target);
      return;
    }

    const startProgress = visibilityProgressRef.current;
    if (Math.abs(startProgress - target) < 0.001) {
      visibilityProgressRef.current = target;
      setVisibilityProgress(target);
      return;
    }

    const nextSeed = visibilitySeedRef.current + 1;
    visibilitySeedRef.current = nextSeed;
    setVisibilitySeed(nextSeed);

    const durationBase = Math.max(120, randomVisibilityDurationMs);
    const duration = target > startProgress
      ? durationBase
      : Math.max(90, Math.round(durationBase * 0.72));
    const start = performance.now();

    const tick = () => {
      const elapsed = performance.now() - start;
      const progress = Math.min(1, elapsed / duration);
      const nextValue =
        startProgress + (target - startProgress) * easeOutQuart(progress);

      visibilityProgressRef.current = nextValue;
      setVisibilityProgress(nextValue);

      if (progress < 1) {
        visibilityRafRef.current = window.requestAnimationFrame(tick);
      }
    };

    visibilityRafRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(visibilityRafRef.current);
    };
  }, [randomVisibilityDurationMs, randomVisibilityReveal, visible]);

  useEffect(() => {
    if (totalFrames <= 1 || !shouldPlay) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      return;
    }

    const frameInterval = window.setInterval(() => {
      setCurrentFrameIndex((currentIndex) => (currentIndex + 1) % totalFrames);
    }, 1000 / fps);

    return () => {
      window.clearInterval(frameInterval);
    };
  }, [fps, shouldPlay, totalFrames]);

  useEffect(() => {
    if (format !== "color" || !meta || !colorFrames[currentFrameIndex] || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const buffer = colorFrames[currentFrameIndex];

    const drawOpts = { transparentBackground: transparentCanvasBackground };

    if (!randomCellReveal) {
      drawColorFrame(canvas, meta, buffer, drawOpts);
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      drawColorFrame(canvas, meta, buffer, drawOpts);
      return;
    }

    const duration = Math.max(120, randomCellRevealDurationMs);
    const frameKey = currentFrameIndex;
    const start = performance.now();
    let cancelled = false;

    const tick = () => {
      if (cancelled || !canvasRef.current) {
        return;
      }

      const latest = colorFrames[currentFrameIndex];
      if (!latest) {
        return;
      }

      const elapsed = performance.now() - start;
      const progress = Math.min(1, elapsed / duration);
      drawColorFrame(canvasRef.current, meta, latest, {
        revealProgress: progress,
        frameKey,
        transparentBackground: transparentCanvasBackground,
      });

      if (progress < 1) {
        revealRafRef.current = window.requestAnimationFrame(tick);
      }
    };

    revealRafRef.current = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(revealRafRef.current);
    };
  }, [
    colorFrames,
    currentFrameIndex,
    format,
    meta,
    randomCellReveal,
    randomCellRevealDurationMs,
    transparentCanvasBackground,
  ]);

  useEffect(() => {
    return () => {
      window.cancelAnimationFrame(visibilityRafRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (fillParent) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateScale = () => {
      const target = format === "color" ? canvasRef.current : preRef.current;
      if (!target) {
        return;
      }

      const naturalWidth = target instanceof HTMLCanvasElement
        ? target.width
        : target.scrollWidth || target.clientWidth;
      const naturalHeight = target instanceof HTMLCanvasElement
        ? target.height
        : target.scrollHeight || target.clientHeight;

      if (!naturalWidth || !naturalHeight) {
        return;
      }

      const newScale = Math.min(
        container.clientWidth / naturalWidth,
        container.clientHeight / naturalHeight,
      );
      const safeScale = Number.isFinite(scale) ? Math.max(scale, 0) : 1;
      setScaleValue(newScale * CONTAIN_SCALE_FACTOR * safeScale);
      if (!scaled) {
        setScaled(true);
      }
    };

    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(container);

    if (preRef.current) {
      resizeObserver.observe(preRef.current);
    }

    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [colorFrames.length, currentFrameIndex, currentTextFrame, format, meta, scale, scaled, fillParent]);

  if (isLoading && !frames.length && !colorFrames.length) {
    return <div ref={containerRef} className={className} aria-hidden="true" />;
  }

  if (!frames.length && !colorFrames.length) {
    return <div ref={containerRef} className={className} aria-hidden="true" />;
  }

  const hasRenderable = colorFrames.length > 0 || frames.length > 0;
  const fillVisible = fillParent && hasRenderable && !isLoading;
  const containVisible = !fillParent && scaled;

  const sharedStyleContain = {
    transform: `translate3d(-50%, -50%, 0) scale(${scaleValue})`,
    opacity: containVisible ? 1 : 0,
    transition: "opacity 0.2s ease-out",
  } as const;

  const sharedStyleFill = {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    opacity: fillVisible ? 1 : 0,
    transition: "opacity 0.18s ease-out",
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={
        fillParent
          ? { position: "relative", width: "100%", height: "100%", minHeight: 0 }
          : undefined
      }
      {...(ariaLabel ? { role: "img", "aria-label": ariaLabel } : {})}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showFrameCounter ? (
        <div>
          Frame: {Math.min(currentFrameIndex + 1, totalFrames)}/{totalFrames}
        </div>
      ) : null}

      {format === "color" ? (
        <canvas
          ref={canvasRef}
          className={preClassName}
          style={fillParent ? sharedStyleFill : sharedStyleContain}
        />
      ) : (
        <pre
          ref={preRef}
          className={preClassName}
          style={
            fillParent
              ? {
                  ...sharedStyleFill,
                  margin: 0,
                  padding: 0,
                  whiteSpace: "pre",
                  overflow: "hidden",
                  fontFamily: FONT_FAMILY,
                  ...(gradient
                    ? {
                        background: gradient,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }
                    : color
                      ? { color }
                      : {}),
                }
              : {
                  ...sharedStyleContain,
                  ...(gradient
                    ? {
                        background: gradient,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }
                    : color
                      ? { color }
                      : {}),
                }
          }
        >
          {maskedTextFrame}
        </pre>
      )}
    </div>
  );
}
