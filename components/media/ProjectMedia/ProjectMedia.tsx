"use client";

import Image from "next/image";
import { usePreloaderComplete } from "@/lib/preloaderComplete";
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
  placeholderClassName?: string;
  /** Forwards to `next/image` `preload` on the LCP candidate (first tile / hero). */
  imagePreload?: boolean;
  /** `instant` skips the load fade — used for hover/scroll previews that must cut. */
  reveal?: "fade" | "instant";
};

type UseIntersectionOptions = {
  enabled?: boolean;
  rootMargin?: string;
};

/** Keep video observers cheap; we only need enter/exit state for mount/playback. */
const VIEWPORT_THRESHOLD_STEPS = [0] as const;

function useIntersectionState<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { enabled = true, rootMargin = "0px" }: UseIntersectionOptions,
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
      { threshold: [...VIEWPORT_THRESHOLD_STEPS], rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, ref, rootMargin]);

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

  try {
    await video.play();
  } catch {
    // Best-effort autoplay only.
  }
}

function resolveVariant(media: ProjectMediaSlot, isMobile: boolean): ProjectMediaAsset {
  return isMobile && media.mobile ? media.mobile : media.desktop;
}

/**
 * Serializes `<video>` mounts so decoders spin up one at a time. Without it, scrolling toward a grid of
 * 2K clips starts several demux/decode/texture-upload pipelines in the same frames as the reveal.
 * Posters stay painted until each video's first frame lands, so the queue is invisible.
 */
type VideoMountJob = { grant: () => void };

/** Fallback release if a video never reports `loadeddata` (slow network, decode error). */
const VIDEO_MOUNT_RELEASE_TIMEOUT_MS = 1500;

const videoMountQueue: VideoMountJob[] = [];
let activeVideoMount: VideoMountJob | null = null;
let activeVideoMountTimer = 0;

function pumpVideoMountQueue() {
  if (activeVideoMount) {
    return;
  }

  const next = videoMountQueue.shift();
  if (!next) {
    return;
  }

  activeVideoMount = next;
  activeVideoMountTimer = window.setTimeout(
    () => releaseVideoMount(next),
    VIDEO_MOUNT_RELEASE_TIMEOUT_MS,
  );
  next.grant();
}

function releaseVideoMount(job: VideoMountJob) {
  const queuedIndex = videoMountQueue.indexOf(job);
  if (queuedIndex !== -1) {
    videoMountQueue.splice(queuedIndex, 1);
    return;
  }

  if (activeVideoMount !== job) {
    return;
  }

  window.clearTimeout(activeVideoMountTimer);
  activeVideoMount = null;
  // Let the finished video's first frame paint on its own before the next decoder starts.
  window.requestAnimationFrame(pumpVideoMountQueue);
}

/** Returns an idempotent release; on-screen requests jump ahead of look-ahead (600px) prep. */
function requestVideoMount(grant: () => void, priority: boolean) {
  const job: VideoMountJob = { grant };

  if (priority) {
    videoMountQueue.unshift(job);
  } else {
    videoMountQueue.push(job);
  }

  pumpVideoMountQueue();
  return () => releaseVideoMount(job);
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
  placeholderClassName,
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
  const preloaderComplete = usePreloaderComplete();
  const {
    hasIntersected: hasBeenVisible,
    intersecting: isInViewport,
  } = useIntersectionState(rootRef, {
    enabled: media.kind === "video" && !reducedMotion,
  });
  const { hasIntersected: hasPreparedVideo } = useIntersectionState(rootRef, {
    enabled: media.kind === "video" && !reducedMotion && !mountVideoEager && preloaderComplete,
    rootMargin: "0px 0px 600px 0px",
  });
  const [assetReady, setAssetReady] = useState(() => hasLoadedProjectMediaSource(activeAsset.src));
  const [posterReady, setPosterReady] = useState(() => (
    hasLoadedProjectMediaSource(activeAsset.poster)
  ));
  const [videoReady, setVideoReady] = useState(false);
  const wantsVideo = media.kind === "video" && !reducedMotion && (mountVideoEager || hasPreparedVideo || hasBeenVisible);
  /* Hover/scroll previews must cut instantly — they bypass the decoder queue. */
  const bypassVideoQueue = reveal === "instant";
  const [videoSlotGranted, setVideoSlotGranted] = useState(false);
  const releaseVideoSlotRef = useRef<(() => void) | null>(null);
  const isInViewportRef = useRef(isInViewport);
  const showVideo = wantsVideo && (bypassVideoQueue || videoSlotGranted);

  useEffect(() => {
    isInViewportRef.current = isInViewport;
  }, [isInViewport]);

  useEffect(() => {
    if (!wantsVideo || bypassVideoQueue) {
      return undefined;
    }

    const release = requestVideoMount(() => setVideoSlotGranted(true), isInViewportRef.current);
    releaseVideoSlotRef.current = release;

    return () => {
      release();
      releaseVideoSlotRef.current = null;
    };
  }, [bypassVideoQueue, wantsVideo]);

  const releaseVideoSlot = useCallback(() => {
    releaseVideoSlotRef.current?.();
  }, []);
  const ready = media.kind === "video" ? posterReady || videoReady : assetReady;

  useEffect(() => {
    if (!showVideo) {
      return undefined;
    }

    const video = videoRef.current;

    if (!video) {
      return undefined;
    }

    if (isInViewport) {
      void ensureVideoPlayback(video);
    } else {
      video.pause();
    }

    return () => video.pause();
  }, [isInViewport, showVideo]);

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
    >
      <ProjectMediaPlaceholderGrid
        grid={placeholderGrid}
        className={[styles.placeholder, placeholderClassName]
          .filter(Boolean)
          .join(" ")}
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
                  muted
                  playsInline
                  preload="auto"
                  loop={media.loop !== false}
                  disablePictureInPicture
                  aria-label={videoLabel}
                  onPlaying={(event) => {
                    markVideoReady(event.currentTarget);
                  }}
                  onLoadedData={(event) => {
                    releaseVideoSlot();
                    markVideoReady(event.currentTarget);
                  }}
                  onError={releaseVideoSlot}
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
