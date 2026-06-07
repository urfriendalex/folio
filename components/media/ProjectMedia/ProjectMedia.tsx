"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
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
};

type UseIntersectionOptions = {
  enabled?: boolean;
};

/** Keep video observers cheap; we only need enter/exit state for mount/playback. */
const VIEWPORT_THRESHOLD_STEPS = [0] as const;
const MAX_RETAINED_VIDEO_NODES = 4;

type RetainedVideo = {
  id: string;
  inViewport: boolean;
  release: () => void;
};

const retainedVideos = new Map<string, RetainedVideo>();

function enforceRetainedVideoLimit() {
  while (retainedVideos.size > MAX_RETAINED_VIDEO_NODES) {
    const candidate = retainedVideos.values().find((entry) => !entry.inViewport);
    if (!candidate) {
      return;
    }

    retainedVideos.delete(candidate.id);
    candidate.release();
  }
}

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
}: ProjectMediaInnerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const retainedVideoId = useId();
  const {
    hasIntersected: hasMountedVideo,
    intersecting: isInViewport,
  } = useIntersectionState(rootRef, {
    enabled: media.kind === "video",
  });
  const [assetReady, setAssetReady] = useState(() => hasLoadedProjectMediaSource(activeAsset.src));
  const [posterReady, setPosterReady] = useState(() => (
    hasLoadedProjectMediaSource(activeAsset.poster)
  ));
  const [videoReady, setVideoReady] = useState(false);
  const [videoRetained, setVideoRetained] = useState(false);
  const ready = media.kind === "video" ? posterReady || videoReady : assetReady;

  useEffect(() => {
    if (media.kind !== "video" || !videoRetained) {
      retainedVideos.delete(retainedVideoId);
      return undefined;
    }

    retainedVideos.delete(retainedVideoId);
    retainedVideos.set(retainedVideoId, {
      id: retainedVideoId,
      inViewport: isInViewport,
      release: () => {
        setVideoReady(false);
        setVideoRetained(false);
      },
    });
    enforceRetainedVideoLimit();

    return () => {
      retainedVideos.delete(retainedVideoId);
    };
  }, [isInViewport, media.kind, retainedVideoId, videoRetained]);

  useEffect(() => {
    if (media.kind !== "video" || !hasMountedVideo || !videoRetained) {
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

    return undefined;
  }, [hasMountedVideo, isInViewport, media.kind, videoRetained]);

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
  const showVideo =
    media.kind === "video" && hasMountedVideo && (isInViewport || videoRetained);

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-fill={fill ? "true" : "false"}
      data-fit={fit}
      data-kind={media.kind}
      data-ready={ready ? "true" : "false"}
      data-video-ready={videoReady ? "true" : "false"}
    >
      <ProjectMediaPlaceholderGrid
        grid={placeholderGrid}
        className={styles.placeholder}
        visible={!ready}
      />
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
                  poster={activeAsset.poster}
                  muted
                  playsInline
                  autoPlay
                  preload="auto"
                  loop={media.loop !== false}
                  disablePictureInPicture
                  aria-label={videoLabel}
                  onLoadedData={(event) => {
                    markProjectMediaSourceLoaded(activeAsset.src, event.currentTarget.currentSrc);
                    setVideoReady(true);
                    setVideoRetained(true);
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
