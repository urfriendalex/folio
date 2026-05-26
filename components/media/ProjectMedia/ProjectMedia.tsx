"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type RefObject,
} from "react";
import type { ProjectMediaAsset, ProjectMediaSlot } from "@/content/projects/types";
import { PROJECT_MEDIA_MOBILE_QUERY } from "@/lib/projectMedia";
import styles from "./ProjectMedia.module.scss";

/** Fixed square cell size (px); overflow is clipped by the placeholder. 50% larger than original 15px. */
const PLACEHOLDER_CELL_PX = 15 * 1.5;
const PLACEHOLDER_GRID_GAP_PX = 1;
/** Placeholder has `padding: 1px` — measure grid inside the content box. */
const PLACEHOLDER_INSET_PAD_PX = 2;

function placeholderFixedCellGridDims(widthPx: number, heightPx: number, cellPx = PLACEHOLDER_CELL_PX) {
  if (widthPx <= 0 || heightPx <= 0) {
    return { cols: 12, rows: 12 };
  }

  const gap = PLACEHOLDER_GRID_GAP_PX;
  const innerW = Math.max(0, widthPx - PLACEHOLDER_INSET_PAD_PX);
  const innerH = Math.max(0, heightPx - PLACEHOLDER_INSET_PAD_PX);
  const step = cellPx + gap;
  const cols = Math.max(1, Math.ceil((innerW + gap) / step));
  const rows = Math.max(1, Math.ceil((innerH + gap) / step));

  return { cols, rows };
}

type ProjectMediaProps = {
  media: ProjectMediaSlot;
  alt?: string;
  className?: string;
  /** Passed to `next/image`; defaults to `"auto"` (browser-derived slot width for responsive images). */
  sizes?: string;
  fill?: boolean;
  fit?: "cover" | "contain";
  loading?: "eager" | "lazy";
  /** Forwards to `next/image` `preload` on the LCP candidate (first tile / hero). */
  imagePreload?: boolean;
};

type UseIntersectionOptions = {
  enabled?: boolean;
};

/** Enough samples that fast mobile scroll still delivers callbacks before layout settles. */
const VIEWPORT_THRESHOLD_STEPS = [0, 0.05, 0.1, 0.25, 0.5, 0.75, 1] as const;

function useIntersectionState<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { enabled = true }: UseIntersectionOptions,
) {
  const [intersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!enabled || !node) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          setIntersecting(false);
          return;
        }
        setIntersecting(Boolean(entry.isIntersecting && entry.intersectionRatio > 0));
      },
      { threshold: [...VIEWPORT_THRESHOLD_STEPS] },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, ref]);

  return enabled ? intersecting : false;
}

let projectMediaMobileMql: MediaQueryList | null = null;
const projectMediaMobileSubscribers = new Set<() => void>();

function getProjectMediaMobileMql() {
  if (typeof window === "undefined") {
    return null;
  }

  projectMediaMobileMql ??= window.matchMedia(PROJECT_MEDIA_MOBILE_QUERY);
  return projectMediaMobileMql;
}

function notifyProjectMediaMobileSubscribers() {
  projectMediaMobileSubscribers.forEach((subscriber) => subscriber());
}

function subscribeProjectMediaMobile(onChange: () => void) {
  const mediaQuery = getProjectMediaMobileMql();
  if (!mediaQuery) {
    return () => undefined;
  }

  if (projectMediaMobileSubscribers.size === 0) {
    mediaQuery.addEventListener("change", notifyProjectMediaMobileSubscribers);
  }
  projectMediaMobileSubscribers.add(onChange);

  return () => {
    projectMediaMobileSubscribers.delete(onChange);
    if (projectMediaMobileSubscribers.size === 0) {
      mediaQuery.removeEventListener("change", notifyProjectMediaMobileSubscribers);
    }
  };
}

function projectMediaMobileSnapshot() {
  return getProjectMediaMobileMql()?.matches ?? false;
}

function projectMediaMobileServerSnapshot() {
  return false;
}

async function ensureVideoPlayback(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.autoplay = true;

  try {
    await video.play();
  } catch {
    // Best-effort autoplay only.
  }
}

function releaseVideoSource(video: HTMLVideoElement, detachSource = false) {
  video.pause();
  if (detachSource) {
    video.removeAttribute("src");
    video.load();
  }
}

function resolveVariant(media: ProjectMediaSlot, isMobile: boolean): ProjectMediaAsset {
  return isMobile && media.mobile ? media.mobile : media.desktop;
}

const loadedProjectMediaSources = new Set<string>();

function markProjectMediaSourceLoaded(...sources: Array<string | null | undefined>) {
  sources.forEach((source) => {
    if (source) {
      loadedProjectMediaSources.add(source);
    }
  });
}

function hasLoadedProjectMediaSource(...sources: Array<string | null | undefined>) {
  return sources.some((source) => Boolean(source && loadedProjectMediaSources.has(source)));
}

type ProjectMediaInnerProps = Omit<ProjectMediaProps, "media"> & {
  media: ProjectMediaSlot;
  activeAsset: ProjectMediaAsset;
};

function ProjectMediaInner({
  media,
  activeAsset,
  alt,
  className,
  sizes = "auto",
  fill = false,
  fit = "contain",
  loading = "lazy",
  imagePreload = false,
}: ProjectMediaInnerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isInViewport = useIntersectionState(rootRef, {
    enabled: media.kind === "video",
  });
  const [assetReady, setAssetReady] = useState(() => hasLoadedProjectMediaSource(activeAsset.src));
  const [posterReady, setPosterReady] = useState(() => (
    hasLoadedProjectMediaSource(activeAsset.poster, activeAsset.src)
  ));
  const [videoReady, setVideoReady] = useState(() => hasLoadedProjectMediaSource(activeAsset.src));
  const ready = media.kind === "video" ? posterReady || videoReady : assetReady;
  const [placeholderGrid, setPlaceholderGrid] = useState({ cols: 12, rows: 12 });
  const placeholderFrameRef = useRef<number | null>(null);
  const placeholderCells = useMemo(
    () => Array.from({ length: placeholderGrid.cols * placeholderGrid.rows }, (_, index) => index),
    [placeholderGrid.cols, placeholderGrid.rows],
  );

  useLayoutEffect(() => {
    if (ready) {
      return undefined;
    }

    const node = rootRef.current;

    if (!node) {
      return undefined;
    }

    const update = () => {
      const rect = node.getBoundingClientRect();
      const next = placeholderFixedCellGridDims(rect.width, rect.height);
      setPlaceholderGrid((current) => (
        current.cols === next.cols && current.rows === next.rows ? current : next
      ));
    };

    update();

    const observer = new ResizeObserver(() => {
      if (placeholderFrameRef.current) {
        window.cancelAnimationFrame(placeholderFrameRef.current);
      }
      placeholderFrameRef.current = window.requestAnimationFrame(() => {
        update();
        placeholderFrameRef.current = null;
      });
    });

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (placeholderFrameRef.current) {
        window.cancelAnimationFrame(placeholderFrameRef.current);
        placeholderFrameRef.current = null;
      }
    };
  }, [ready]);

  useEffect(() => {
    if (media.kind !== "video") {
      return undefined;
    }

    const video = videoRef.current;

    if (!video || !isInViewport) {
      return undefined;
    }

    void ensureVideoPlayback(video);
    return () => {
      releaseVideoSource(video, process.env.NODE_ENV === "production");
    };
  }, [isInViewport, media.kind]);

  /** When the `<video>` unmounts off-screen, clear readiness so we do not hide the poster while the next decode is pending (avoids a black frame on scroll-back). */
  useEffect(() => {
    if (media.kind !== "video") {
      return;
    }

    if (!isInViewport) {
      setVideoReady(false);
    }
  }, [isInViewport, media.kind]);

  const handleImageLoad = useCallback((image: HTMLImageElement, onReady: () => void) => {
    if (typeof image.decode !== "function") {
      onReady();
      return;
    }

    void image.decode().catch(() => undefined).finally(onReady);
  }, []);

  const sharedStyle = useMemo<CSSProperties | undefined>(() => {
    if (fill) {
      return undefined;
    }

    return {
      aspectRatio: `${activeAsset.width} / ${activeAsset.height}`,
    };
  }, [activeAsset.height, activeAsset.width, fill]);

  const imageAlt = media.kind === "image" ? alt ?? media.alt ?? "" : "";
  const videoLabel = media.kind === "video" ? alt ?? media.alt : undefined;
  const showVideo = media.kind === "video" && isInViewport;
  /** Poster must stay visible when the `<video>` is unmounted off-viewport; do not tie to `videoReady` alone. */
  const videoPlayingInView = showVideo && videoReady;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-fill={fill ? "true" : "false"}
      data-fit={fit}
      data-kind={media.kind}
      data-ready={ready ? "true" : "false"}
      data-video-playing={videoPlayingInView ? "true" : "false"}
    >
      <div
        className={styles.placeholder}
        aria-hidden="true"
        style={
          {
            "--placeholder-cols": placeholderGrid.cols,
            "--placeholder-rows": placeholderGrid.rows,
            "--placeholder-cell-px": `${PLACEHOLDER_CELL_PX}px`,
          } as CSSProperties
        }
      >
        {ready
          ? null
          : placeholderCells.map((cellIndex) => (
              <span key={cellIndex} className={styles.placeholderCell} />
            ))}
      </div>
      <div className={styles.frame} style={sharedStyle}>
        {media.kind === "video" ? (
          <>
            <div className={styles.posterLayer} data-loaded={posterReady ? "true" : "false"}>
              <Image
                src={activeAsset.poster ?? activeAsset.src}
                alt={videoLabel ? `${videoLabel} poster frame` : "Video poster frame"}
                fill
                sizes={sizes}
                loading={loading}
                preload={imagePreload}
                className={styles.asset}
                onLoad={(event) => {
                  const image = event.currentTarget;
                  handleImageLoad(image, () => {
                    markProjectMediaSourceLoaded(activeAsset.poster, activeAsset.src, image.currentSrc);
                    setPosterReady(true);
                  });
                }}
              />
            </div>

            {showVideo ? (
              <div className={styles.videoLayer}>
                <video
                  ref={videoRef}
                  className={styles.video}
                  src={activeAsset.src}
                  poster={activeAsset.poster}
                  muted
                  playsInline
                  autoPlay
                  preload={isInViewport ? "auto" : "metadata"}
                  loop={media.loop !== false}
                  disablePictureInPicture
                  aria-label={videoLabel}
                  onLoadedData={(event) => {
                    markProjectMediaSourceLoaded(activeAsset.src, event.currentTarget.currentSrc);
                    setVideoReady(true);
                  }}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.layer} data-loaded={assetReady ? "true" : "false"}>
            <Image
              src={activeAsset.src}
              alt={imageAlt}
              fill
              sizes={sizes}
              loading={loading}
              preload={imagePreload}
              className={styles.asset}
              onLoad={(event) => {
                const image = event.currentTarget;
                handleImageLoad(image, () => {
                  markProjectMediaSourceLoaded(activeAsset.src, image.currentSrc);
                  setAssetReady(true);
                });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectMedia(props: ProjectMediaProps) {
  const isMobile = useSyncExternalStore(
    subscribeProjectMediaMobile,
    projectMediaMobileSnapshot,
    projectMediaMobileServerSnapshot,
  );
  const activeAsset = useMemo(() => resolveVariant(props.media, isMobile), [isMobile, props.media]);
  const assetKey = `${props.media.kind}:${activeAsset.src}:${activeAsset.poster ?? ""}:${activeAsset.width}x${activeAsset.height}`;

  return <ProjectMediaInner key={assetKey} {...props} activeAsset={activeAsset} />;
}
