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
  sizes: string;
  fill?: boolean;
  fit?: "cover" | "contain";
  loading?: "eager" | "lazy";
  priority?: boolean;
};

type UseIntersectionOptions = {
  threshold?: number;
  enabled?: boolean;
};

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

function useIntersectionState<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { threshold = 0, enabled = true }: UseIntersectionOptions,
) {
  const [intersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!enabled || !node) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIntersecting(Boolean(entry?.isIntersecting && entry.intersectionRatio >= threshold));
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, ref, threshold]);

  return enabled ? intersecting : false;
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

function resolveVariant(media: ProjectMediaSlot, isMobile: boolean): ProjectMediaAsset {
  return isMobile && media.mobile ? media.mobile : media.desktop;
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
  sizes,
  fill = false,
  fit = "contain",
  loading = "lazy",
  priority = false,
}: ProjectMediaInnerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isInViewport = useIntersectionState(rootRef, {
    enabled: media.kind === "video",
    threshold: 0.3,
  });
  const [assetReady, setAssetReady] = useState(false);
  const [posterReady, setPosterReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [placeholderGrid, setPlaceholderGrid] = useState({ cols: 12, rows: 12 });
  const placeholderFrameRef = useRef<number | null>(null);
  const placeholderCells = useMemo(
    () => Array.from({ length: placeholderGrid.cols * placeholderGrid.rows }, (_, index) => index),
    [placeholderGrid.cols, placeholderGrid.rows],
  );

  useLayoutEffect(() => {
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
  }, []);

  useEffect(() => {
    if (media.kind !== "video") {
      return undefined;
    }

    const video = videoRef.current;

    if (!video) {
      return undefined;
    }

    if (!isInViewport) {
      video.pause();
      return undefined;
    }

    void ensureVideoPlayback(video);
    return undefined;
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
  const ready = media.kind === "video" ? posterReady || videoReady : assetReady;

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
        {placeholderCells.map((cellIndex) => (
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
                priority={priority}
                className={styles.asset}
                onLoad={(event) => {
                  handleImageLoad(event.currentTarget, () => setPosterReady(true));
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
                  onLoadedData={() => setVideoReady(true)}
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
              priority={priority}
              className={styles.asset}
              onLoad={(event) => {
                handleImageLoad(event.currentTarget, () => setAssetReady(true));
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
