"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

class AnimationManager {
  private animation: number | null = null;
  private callback: () => void;
  private lastFrame = -1;
  private frameTime = 1000 / 30;

  constructor(callback: () => void, fps = 30) {
    this.callback = callback;
    this.frameTime = 1000 / fps;
  }

  updateFPS(fps: number) {
    this.frameTime = 1000 / fps;
  }

  start() {
    if (this.animation != null) return;
    this.animation = requestAnimationFrame(this.update);
  }

  pause() {
    if (this.animation == null) return;
    this.lastFrame = -1;
    cancelAnimationFrame(this.animation);
    this.animation = null;
  }

  private update = (time: number) => {
    let delta = time - this.lastFrame;

    if (this.lastFrame === -1) {
      this.lastFrame = time;
    } else {
      while (delta >= this.frameTime) {
        this.callback();
        delta -= this.frameTime;
        this.lastFrame += this.frameTime;
      }
    }

    this.animation = requestAnimationFrame(this.update);
  };
}

type Quality = "low" | "medium" | "high";

const FALLBACK_ORDER: Record<Quality, Quality[]> = {
  low: ["low", "high", "medium"],
  medium: ["medium", "high", "low"],
  high: ["high", "low", "medium"],
};

async function resolveFrameSource(
  frameFolder: string,
  quality: Quality,
  firstFrameFile: string,
): Promise<{ baseUrl: string; isFlat: boolean } | null> {
  const fallbackQualities = FALLBACK_ORDER[quality];

  for (const candidate of fallbackQualities) {
    try {
      const probeUrl = `/${frameFolder}/${candidate}/${firstFrameFile}`;
      const probeResponse = await fetch(probeUrl);
      if (probeResponse.ok) {
        if (candidate !== quality) {
          console.warn(
            `ASCIIAnimation: quality "${quality}" not found in "${frameFolder}", falling back to "${candidate}"`,
          );
        }

        return { baseUrl: `/${frameFolder}/${candidate}`, isFlat: false };
      }
    } catch {
      // continue to next candidate
    }
  }

  try {
    const legacyProbe = await fetch(`/${frameFolder}/${firstFrameFile}`);
    if (legacyProbe.ok) {
      console.warn(
        `ASCIIAnimation: no quality subfolders found in "${frameFolder}", using flat folder structure`,
      );

      return { baseUrl: `/${frameFolder}`, isFlat: true };
    }
  } catch {
    // no legacy frames either
  }

  return null;
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
}

const CONTAIN_SCALE_FACTOR = 1;

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
}: ASCIIAnimationProps) {
  const [frames, setFrames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const frameCounterRef = useRef<HTMLDivElement>(null);
  const [scaleValue, setScaleValue] = useState(scale);
  const [scaled, setScaled] = useState(false);

  const currentFrameRef = useRef(0);
  const framesRef = useRef<string[]>([]);
  const hasNotifiedReadyRef = useRef(false);

  const notifyReady = useCallback(() => {
    if (hasNotifiedReadyRef.current) {
      return;
    }

    hasNotifiedReadyRef.current = true;
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  const fullLoadTriggered = useRef(false);
  const resolvedSource = useRef<{ baseUrl: string; isFlat: boolean } | null>(null);

  const animationManager = useMemo(
    () =>
      new AnimationManager(() => {
        const currentFrames = framesRef.current;
        if (currentFrames.length === 0) return;

        const nextFrame = (currentFrameRef.current + 1) % currentFrames.length;
        currentFrameRef.current = nextFrame;

        if (preRef.current) {
          preRef.current.textContent = currentFrames[nextFrame];
        }

        if (frameCounterRef.current) {
          frameCounterRef.current.textContent = `Frame: ${nextFrame + 1}/${currentFrames.length}`;
        }
      }, fps),
    [fps],
  );

  const frameFiles = useMemo(
    () =>
      Array.from(
        { length: frameCount },
        (_, index) => `frame_${String(index + 1).padStart(5, "0")}.txt`,
      ),
    [frameCount],
  );

  const loadAllFrames = useCallback(async () => {
    if (fullLoadTriggered.current) return;
    fullLoadTriggered.current = true;

    const source = resolvedSource.current;
    if (!source) {
      notifyReady();
      return;
    }

    try {
      const framePromises = frameFiles.map(async (filename) => {
        const response = await fetch(`${source.baseUrl}/${filename}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${filename}: ${response.status}`);
        }
        return response.text();
      });

      const loadedFrames = await Promise.all(framePromises);
      setFrames(loadedFrames);
      currentFrameRef.current = 0;
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

    const loadPreview = async () => {
      if (providedFrames) {
        setFrames(providedFrames);
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

      const source = await resolveFrameSource(frameFolder, quality, firstFrameFile);
      if (!source) {
        console.error(
          `ASCIIAnimation: could not find frames in any quality folder or flat structure for "${frameFolder}"`,
        );
        setIsLoading(false);
        notifyReady();
        return;
      }

      resolvedSource.current = source;

      try {
        const response = await fetch(`${source.baseUrl}/${firstFrameFile}`);
        if (!response.ok) {
          throw new Error("Failed to fetch preview frame");
        }

        const firstFrame = await response.text();
        setFrames([firstFrame]);
        currentFrameRef.current = 0;
      } catch (error) {
        console.error("Failed to load preview frame:", error);
      }

      if (!lazy) {
        await loadAllFrames();
      } else {
        setIsLoading(false);
        notifyReady();
      }
    };

    loadPreview();
  }, [providedFrames, frameFolder, quality, lazy, frameFiles, loadAllFrames, notifyReady]);

  useEffect(() => {
    if (frames.length === 0 || !containerRef.current) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (lazy && !fullLoadTriggered.current) {
              loadAllFrames();
            }
            if (!reducedMotion) {
              animationManager.start();
            }
          } else {
            animationManager.pause();
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      animationManager.pause();
    };
  }, [animationManager, frames.length, lazy, loadAllFrames]);

  useLayoutEffect(() => {
    if (!containerRef.current || !preRef.current || frames.length === 0) return;

    const updateScale = () => {
      const container = containerRef.current;
      const content = preRef.current;

      if (!container || !content) return;

      const availableWidth = container.clientWidth;
      const availableHeight = container.clientHeight;
      const naturalWidth = content.scrollWidth;
      const naturalHeight = content.scrollHeight;

      if (naturalWidth === 0 || naturalHeight === 0) return;

      const newScale = Math.min(
        availableWidth / naturalWidth,
        availableHeight / naturalHeight,
      );

      const safeScale = Number.isFinite(scale) ? Math.max(scale, 0) : 1;
      setScaleValue(newScale * CONTAIN_SCALE_FACTOR * safeScale);
      if (!scaled) setScaled(true);
    };

    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [frames, quality, scale, scaled]);

  if (isLoading && frames.length === 0) {
    return (
      <div ref={containerRef} className={className} aria-hidden="true">
        <pre ref={preRef} className={preClassName} />
      </div>
    );
  }

  if (!frames.length) {
    return (
      <div ref={containerRef} className={className} aria-hidden="true">
        <pre ref={preRef} className={preClassName} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      {...(ariaLabel ? { role: "img", "aria-label": ariaLabel } : {})}
    >
      {showFrameCounter ? (
        <div ref={frameCounterRef}>
          Frame: {currentFrameRef.current + 1}/{frames.length}
        </div>
      ) : null}
      <pre
        ref={preRef}
        className={preClassName}
        style={{
          transform: `translate3d(-50%, -50%, 0) scale(${scaleValue})`,
          opacity: scaled ? 1 : 0,
          transition: "opacity 0.5s ease-in",
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
        }}
      >
        {frames[currentFrameRef.current]}
      </pre>
    </div>
  );
}
