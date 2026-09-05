"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type RefObject,
} from "react";
import type { ProjectMediaAsset, ProjectMediaSlot } from "@/content/projects/types";
import { ProjectMediaPlaceholderGrid } from "@/components/media/ProjectMediaPlaceholderGrid";
import {
  PROJECT_MEDIA_MOBILE_QUERY,
  projectMediaPlaceholderGridForAsset,
  type ProjectMediaPlaceholderGrid as ProjectMediaPlaceholderGridShape,
} from "@/lib/projectMedia";
import styles from "./ProjectMedia.module.scss";

type ProjectMediaProps = {
  media: ProjectMediaSlot;
  alt?: string;
  className?: string;
  /** Passed to `next/image`; defaults to `"auto"` (browser-derived slot width for responsive images). */
  sizes?: string;
  fill?: boolean;
  fit?: "cover" | "contain";
  loading?: "eager" | "lazy";
  placeholderGrid?: ProjectMediaPlaceholderGridShape;
  /** Forwards to `next/image` `preload` on the LCP candidate (first tile / hero). */
  imagePreload?: boolean;
  /** `instant` skips the load fade — used for hover/scroll previews that must cut. */
  reveal?: "fade" | "instant";
};

type UseIntersectionOptions = {
  enabled?: boolean;
};

/** Keep video observers cheap; we only need enter/exit state for mount/playback. */
const VIEWPORT_THRESHOLD_STEPS = [0] as const;

function useIntersectionState<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { enabled = true }: UseIntersectionOptions,
) {
  const [intersecting, setIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

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
        const nextIntersecting = Boolean(entry.isIntersecting && entry.intersectionRatio > 0);
        setIntersecting(nextIntersecting);
        if (nextIntersecting) {
          setHasIntersected(true);
        }
      },
      { threshold: [...VIEWPORT_THRESHOLD_STEPS] },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, ref]);

  return {
    hasIntersected: enabled ? hasIntersected : false,
    intersecting: enabled ? intersecting : false,
  };
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

function subscribeReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function reducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function reducedMotionServerSnapshot() {
  return false;
}

const POSTER_FALLBACK_MS = 900;

function whenVideoFramePainted(video: HTMLVideoElement, onFrame: () => void) {
  if (typeof video.requestVideoFrameCallback === "function") {
    video.requestVideoFrameCallback(() => {
      onFrame();
    });
    return;
  }

  onFrame();
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
  placeholderGrid: ProjectMediaPlaceholderGridShape;
};

function ProjectMediaInner({
  media,
  activeAsset,
  placeholderGrid,
  alt,
  className,
  sizes = "auto",
  fill = false,
  fit = "contain",
  loading = "lazy",
  imagePreload = false,
  reveal = "fade",
}: ProjectMediaInnerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoReadyOnceRef = useRef(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServerSnapshot,
  );
  const mountVideoEager = media.kind === "video" && (loading === "eager" || imagePreload);
  const {
    hasIntersected: hasMountedVideo,
    intersecting: isInViewport,
  } = useIntersectionState(rootRef, {
    enabled: media.kind === "video" && !reducedMotion && !mountVideoEager,
  });
  const [assetReady, setAssetReady] = useState(() => hasLoadedProjectMediaSource(activeAsset.src));
  const [posterReady, setPosterReady] = useState(() => (
    hasLoadedProjectMediaSource(activeAsset.poster)
  ));
  const [videoReady, setVideoReady] = useState(false);
  const [posterFallback, setPosterFallback] = useState(false);
  const showVideo = media.kind === "video" && !reducedMotion && (mountVideoEager || hasMountedVideo);
  const holdPosterForMotion = media.kind === "video" && reveal !== "instant" && !reducedMotion;
  const posterVisible = posterReady && (!holdPosterForMotion || posterFallback);
  const ready = media.kind === "video" ? posterVisible || videoReady : assetReady;

  useEffect(() => {
    if (!showVideo) {
      return undefined;
    }

    const video = videoRef.current;

    if (!video) {
      return undefined;
    }

    if (mountVideoEager || isInViewport) {
      void ensureVideoPlayback(video);
    } else {
      video.pause();
    }

    return undefined;
  }, [isInViewport, mountVideoEager, showVideo]);

  useEffect(() => {
    if (media.kind !== "video" || reducedMotion || reveal === "instant" || videoReady) {
      return undefined;
    }

    const id = window.setTimeout(() => {
      setPosterFallback(true);
    }, POSTER_FALLBACK_MS);

    return () => window.clearTimeout(id);
  }, [media.kind, reducedMotion, reveal, videoReady]);

  const markVideoReady = useCallback((video: HTMLVideoElement) => {
    if (videoReadyOnceRef.current) {
      return;
    }

    whenVideoFramePainted(video, () => {
      if (videoReadyOnceRef.current) {
        return;
      }

      videoReadyOnceRef.current = true;
      markProjectMediaSourceLoaded(activeAsset.src, video.currentSrc);
      setVideoReady(true);
    });
  }, [activeAsset.src]);

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
  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-project-media="true"
      data-fill={fill ? "true" : "false"}
      data-fit={fit}
      data-kind={media.kind}
      data-ready={ready ? "true" : "false"}
      data-media-width={activeAsset.width}
      data-media-height={activeAsset.height}
      data-reveal={reveal}
      data-video-ready={videoReady ? "true" : "false"}
      data-hold-poster={holdPosterForMotion ? "true" : undefined}
      data-poster-fallback={posterFallback ? "true" : undefined}
    >
      <ProjectMediaPlaceholderGrid
        grid={placeholderGrid}
        className={styles.placeholder}
        visible={!ready}
      />
      <div className={styles.frame} data-project-media-surface="true" style={sharedStyle}>
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
                    markProjectMediaSourceLoaded(activeAsset.poster, image.currentSrc);
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
                  poster={holdPosterForMotion ? undefined : activeAsset.poster}
                  muted
                  playsInline
                  autoPlay
                  preload="auto"
                  loop={media.loop !== false}
                  disablePictureInPicture
                  aria-label={videoLabel}
                  onPlaying={(event) => {
                    markVideoReady(event.currentTarget);
                  }}
                  onLoadedData={(event) => {
                    markVideoReady(event.currentTarget);
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
  const placeholderGrid = props.placeholderGrid ?? projectMediaPlaceholderGridForAsset(activeAsset);
  const assetKey = `${props.media.kind}:${activeAsset.src}:${activeAsset.poster ?? ""}:${activeAsset.width}x${activeAsset.height}`;

  return (
    <ProjectMediaInner
      key={assetKey}
      {...props}
      activeAsset={activeAsset}
      placeholderGrid={placeholderGrid}
    />
  );
}
