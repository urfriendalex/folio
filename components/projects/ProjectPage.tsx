"use client";

import gsap from "gsap";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ProjectMedia } from "@/components/media/ProjectMedia/ProjectMedia";
import { ImageReveal, RevealLines } from "@/components/motion";
import { Overlay } from "@/components/ui/Overlay/Overlay";
import { useOverlay } from "@/components/ui/Overlay/OverlayProvider";
import type { ProjectEntry } from "@/content/projects/types";
import { estimateWrappedLines } from "@/lib/projectOverlaySequence";
import styles from "./ProjectPage.module.scss";

/** Line stagger for toolbar copy — aligned with immersive overlays (~28ms), slightly tighter for this bar. */
const TOOLBAR_LINE_STEP_MS = 26;
const PORTRAIT_MEDIA_RATIO = 1.25;
const PORTRAIT_ZOOM_MIN = 1;
const PORTRAIT_ZOOM_MAX = 3;
const PORTRAIT_ZOOM_STEP = 0.35;
const PORTRAIT_ZOOM_BUTTON_DURATION = 0.4;
const PORTRAIT_ZOOM_WHEEL_DURATION = 0.34;
const PORTRAIT_ZOOM_EASE = "power3.out";
const PORTRAIT_VIEW_RESET_DURATION = 0.52;
const PORTRAIT_VIEW_RESET_EASE = "power3.out";
const MEDIA_VIEWER_CONTENT_EXIT_MS = 160;
/** Immersive shell fades ~480ms after `visible` is set false (see Overlay.module.scss). */
const MEDIA_VIEWER_OVERLAY_EXIT_MS = MEDIA_VIEWER_CONTENT_EXIT_MS + 520;

type PortraitView = {
  x: number;
  y: number;
  scale: number;
};

function portraitIntrinsicCssVars(media: ProjectEntry["media"][number], useMobileVariant = false): CSSProperties {
  const { width, height } = useMobileVariant && media.mobile ? media.mobile : media.desktop;
  return {
    "--pm-w": String(width),
    "--pm-h": String(height),
  } as CSSProperties;
}

function isPortraitMediaCapture(item: ProjectEntry["media"][number]) {
  return item.desktop.height / item.desktop.width >= PORTRAIT_MEDIA_RATIO;
}

function clampZoom(value: number) {
  return Math.min(PORTRAIT_ZOOM_MAX, Math.max(PORTRAIT_ZOOM_MIN, value));
}

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function reducedMotionSnapshot() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function reducedMotionServerSnapshot() {
  return false;
}

/** Align with `.portrait*` layout breakpoint in `ProjectPage.module.scss` (desktop starts at 48.001rem). */
const PORTRAIT_MOBILE_MQ = "(max-width: 48rem)";

function subscribePortraitMobileLayout(onChange: () => void) {
  const mq = window.matchMedia(PORTRAIT_MOBILE_MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function portraitMobileLayoutSnapshot() {
  return typeof window !== "undefined" && window.matchMedia(PORTRAIT_MOBILE_MQ).matches;
}

function portraitMobileLayoutServerSnapshot() {
  return false;
}

type ProjectPageProps = {
  nextProject: ProjectEntry;
  previousProject: ProjectEntry;
  project: ProjectEntry;
};

function mediaIndexFromTarget(target: HTMLElement) {
  const raw = target.dataset.mediaIndex;
  const index = raw ? Number(raw) : NaN;
  return Number.isInteger(index) ? index : null;
}

export function ProjectPage({ nextProject, previousProject, project }: ProjectPageProps) {
  const { openProjectFullInfo } = useOverlay();
  const [toolbarPinnedOpen, setToolbarPinnedOpen] = useState(false);
  const [toolbarHovered, setToolbarHovered] = useState(false);
  const [mobileMediaIndex, setMobileMediaIndex] = useState<number | null>(null);
  /** When false, grid slot fades back in while the overlay finishes closing (avoids an empty card gap). */
  const [mediaViewerHidesGridSlot, setMediaViewerHidesGridSlot] = useState(false);
  const [mobileMediaOverlayVisible, setMobileMediaOverlayVisible] = useState(false);
  const [mobileMediaContentVisible, setMobileMediaContentVisible] = useState(false);
  const [mediaZoom, setMediaZoom] = useState(PORTRAIT_ZOOM_MIN);
  const [mediaHasPan, setMediaHasPan] = useState(false);
  const portraitInteractiveSurfaceRef = useRef<HTMLDivElement | null>(null);
  const portraitViewRef = useRef<PortraitView>({ x: 0, y: 0, scale: PORTRAIT_ZOOM_MIN });
  const mobileMediaHideShellTimerRef = useRef<number | null>(null);
  const mobileMediaCloseTimerRef = useRef<number | null>(null);
  const mobileMediaOpenFrameRef = useRef<number | null>(null);
  const mobileMediaContentFrameRef = useRef<number | null>(null);
  const portraitDragRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
  });
  const portraitPointersRef = useRef(new Map<number, { x: number; y: number }>());
  const portraitPinchRef = useRef<{ startDistance: number; startScale: number } | null>(null);
  const toolbarExpanded = toolbarPinnedOpen || toolbarHovered;
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServerSnapshot,
  );
  const isPortraitMobileLayout = useSyncExternalStore(
    subscribePortraitMobileLayout,
    portraitMobileLayoutSnapshot,
    portraitMobileLayoutServerSnapshot,
  );
  const overviewLabel = "show full overview";
  const visitLabel = "visit site";
  const primaryProjectUrl = project.links?.[0]?.url;
  const mobileOverlayMedia = mobileMediaIndex !== null ? project.media[mobileMediaIndex] : null;
  const mediaViewerOpen = mobileMediaIndex !== null;

  const lineStepMs = reducedMotion ? 8 : TOOLBAR_LINE_STEP_MS;

  const { total, descriptorOffset, visitOffset, overviewOffset } = useMemo(() => {
    const hasVisit = Boolean(project.links?.[0]?.url);
    const dLines = estimateWrappedLines(project.descriptor, 24, 4);
    const visitLines = hasVisit ? 1 : 0;
    const overviewLines = 1;
    return {
      total: dLines + visitLines + overviewLines,
      descriptorOffset: 0,
      visitOffset: dLines,
      overviewOffset: dLines + visitLines,
    };
  }, [project]);

  const handleToolbarPointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") {
      setToolbarHovered(true);
    }
  };

  const handleToolbarPointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") {
      setToolbarHovered(false);
    }
  };

  const handleToolbarFocus = () => {
    setToolbarHovered(true);
  };

  const handleToolbarBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;

    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setToolbarHovered(false);
    }
  };

  const handleToggleClick = () => {
    if (toolbarExpanded) {
      setToolbarPinnedOpen(false);
      setToolbarHovered(false);
    } else {
      setToolbarPinnedOpen(true);
    }
  };

  const clearPortraitTouchState = useCallback(() => {
    portraitPointersRef.current.clear();
    portraitPinchRef.current = null;
    portraitDragRef.current.pointerId = -1;
  }, []);

  const resetMediaView = useCallback(() => {
    portraitViewRef.current = { x: 0, y: 0, scale: PORTRAIT_ZOOM_MIN };
    setMediaZoom(PORTRAIT_ZOOM_MIN);
    setMediaHasPan(false);
    const surf = portraitInteractiveSurfaceRef.current;
    if (!surf) {
      return;
    }
    gsap.killTweensOf(surf);
    if (reducedMotion) {
      gsap.set(surf, { x: 0, y: 0, scale: PORTRAIT_ZOOM_MIN });
    } else {
      gsap.to(surf, {
        x: 0,
        y: 0,
        scale: PORTRAIT_ZOOM_MIN,
        duration: PORTRAIT_VIEW_RESET_DURATION,
        ease: PORTRAIT_VIEW_RESET_EASE,
        overwrite: true,
        force3D: true,
      });
    }
  }, [reducedMotion]);

  const clearMobileMediaTimers = useCallback(() => {
    if (mobileMediaHideShellTimerRef.current) {
      window.clearTimeout(mobileMediaHideShellTimerRef.current);
      mobileMediaHideShellTimerRef.current = null;
    }
    if (mobileMediaCloseTimerRef.current) {
      window.clearTimeout(mobileMediaCloseTimerRef.current);
      mobileMediaCloseTimerRef.current = null;
    }
    if (mobileMediaOpenFrameRef.current) {
      window.cancelAnimationFrame(mobileMediaOpenFrameRef.current);
      mobileMediaOpenFrameRef.current = null;
    }
    if (mobileMediaContentFrameRef.current) {
      window.cancelAnimationFrame(mobileMediaContentFrameRef.current);
      mobileMediaContentFrameRef.current = null;
    }
  }, []);

  const openMobileMediaOverlay = useCallback(
    (mediaIndex: number) => {
      clearMobileMediaTimers();
      clearPortraitTouchState();
      portraitViewRef.current = { x: 0, y: 0, scale: PORTRAIT_ZOOM_MIN };
      setMediaZoom(PORTRAIT_ZOOM_MIN);
      setMediaHasPan(false);
      setMediaViewerHidesGridSlot(true);
      setMobileMediaIndex(mediaIndex);
      setMobileMediaOverlayVisible(false);
      setMobileMediaContentVisible(false);
      mobileMediaOpenFrameRef.current = window.requestAnimationFrame(() => {
        setMobileMediaOverlayVisible(true);
        mobileMediaOpenFrameRef.current = null;
        mobileMediaContentFrameRef.current = window.requestAnimationFrame(() => {
          setMobileMediaContentVisible(true);
          mobileMediaContentFrameRef.current = null;
        });
      });
    },
    [clearMobileMediaTimers, clearPortraitTouchState],
  );

  const closeMobileMediaOverlay = useCallback(() => {
    clearMobileMediaTimers();
    clearPortraitTouchState();
    const surf = portraitInteractiveSurfaceRef.current;
    if (surf) {
      gsap.killTweensOf(surf);
    }
    setMediaViewerHidesGridSlot(false);
    setMobileMediaContentVisible(false);
    mobileMediaHideShellTimerRef.current = window.setTimeout(() => {
      setMobileMediaOverlayVisible(false);
      mobileMediaHideShellTimerRef.current = null;
    }, MEDIA_VIEWER_CONTENT_EXIT_MS);
    mobileMediaCloseTimerRef.current = window.setTimeout(() => {
      portraitViewRef.current = { x: 0, y: 0, scale: PORTRAIT_ZOOM_MIN };
      setMediaZoom(PORTRAIT_ZOOM_MIN);
      setMediaHasPan(false);
      setMobileMediaIndex(null);
      setMediaViewerHidesGridSlot(false);
      mobileMediaCloseTimerRef.current = null;
    }, MEDIA_VIEWER_OVERLAY_EXIT_MS);
  }, [clearMobileMediaTimers, clearPortraitTouchState]);

  const handlePortraitToggle = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const mediaIndex = mediaIndexFromTarget(event.currentTarget);
    if (mediaIndex !== null) {
      openMobileMediaOverlay(mediaIndex);
    }
  }, [openMobileMediaOverlay]);

  const handleMobileMediaOpenCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (mediaViewerOpen) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest("button, a[href], input, textarea, select, [data-skip-portrait-open='true']")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const mediaIndex = mediaIndexFromTarget(event.currentTarget);
    if (mediaIndex !== null) {
      openMobileMediaOverlay(mediaIndex);
    }
  }, [mediaViewerOpen, openMobileMediaOverlay]);

  const handleMobileMediaKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (mediaViewerOpen) {
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    const mediaIndex = mediaIndexFromTarget(event.currentTarget);
    if (mediaIndex !== null) {
      openMobileMediaOverlay(mediaIndex);
    }
  }, [mediaViewerOpen, openMobileMediaOverlay]);

  const handleMediaZoom = useCallback(
    (direction: 1 | -1) => {
      const surf = portraitInteractiveSurfaceRef.current;
      const next = clampZoom(portraitViewRef.current.scale + direction * PORTRAIT_ZOOM_STEP);
      portraitViewRef.current.scale = next;
      setMediaZoom(next);
      if (!surf) {
        return;
      }
      const duration = reducedMotion ? 0 : PORTRAIT_ZOOM_BUTTON_DURATION;
      gsap.to(surf, {
        scale: next,
        duration,
        ease: PORTRAIT_ZOOM_EASE,
        overwrite: "auto",
        force3D: true,
      });
    },
    [reducedMotion],
  );

  const handlePortraitPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!mediaViewerOpen) {
      return;
    }

    const surf = portraitInteractiveSurfaceRef.current;
    if (!surf) {
      return;
    }

    const map = portraitPointersRef.current;
    map.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (map.size >= 2) {
      const points = [...map.values()];
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (dist > 1e-3) {
        portraitPinchRef.current = {
          startDistance: dist,
          startScale: portraitViewRef.current.scale,
        };
      }
      portraitDragRef.current.pointerId = -1;
      event.currentTarget.removeAttribute("data-dragging");
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      map.delete(event.pointerId);
      return;
    }

    portraitDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: portraitViewRef.current.x,
      panY: portraitViewRef.current.y,
    };
    event.currentTarget.setAttribute("data-dragging", "true");
    if (event.pointerType === "mouse") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePortraitPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!mediaViewerOpen) {
      return;
    }

    const surf = portraitInteractiveSurfaceRef.current;
    if (!surf) {
      return;
    }

    const map = portraitPointersRef.current;
    if (!map.has(event.pointerId)) {
      return;
    }
    map.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (map.size >= 2 && portraitPinchRef.current) {
      const points = [...map.values()];
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const pinch = portraitPinchRef.current;
      if (dist > 1e-3 && pinch.startDistance > 1e-3) {
        const next = clampZoom(pinch.startScale * (dist / pinch.startDistance));
        portraitViewRef.current.scale = next;
        gsap.set(surf, { scale: next });
      }
      return;
    }

    const drag = portraitDragRef.current;
    if (drag.pointerId !== event.pointerId) {
      return;
    }

    const nx = drag.panX + event.clientX - drag.startX;
    const ny = drag.panY + event.clientY - drag.startY;
    portraitViewRef.current.x = nx;
    portraitViewRef.current.y = ny;
    gsap.set(surf, { x: nx, y: ny });
  };

  const clearPortraitDragging = (target: HTMLElement) => {
    target.removeAttribute("data-dragging");
    const surf = portraitInteractiveSurfaceRef.current;
    if (surf && surf !== target) {
      surf.removeAttribute("data-dragging");
    }
  };

  const handlePortraitPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const map = portraitPointersRef.current;
    map.delete(event.pointerId);

    if (map.size < 2) {
      portraitPinchRef.current = null;
    }

    if (event.pointerType === "mouse" && event.currentTarget.hasPointerCapture(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }

    if (portraitDragRef.current.pointerId === event.pointerId) {
      portraitDragRef.current.pointerId = -1;
      setMediaZoom(portraitViewRef.current.scale);
      setMediaHasPan(portraitViewRef.current.x !== 0 || portraitViewRef.current.y !== 0);
      clearPortraitDragging(event.currentTarget);
    } else if (map.size === 1 && mediaViewerOpen) {
      setMediaZoom(portraitViewRef.current.scale);
      const [remainingId, pt] = [...map.entries()][0]!;
      portraitDragRef.current = {
        pointerId: remainingId,
        startX: pt.x,
        startY: pt.y,
        panX: portraitViewRef.current.x,
        panY: portraitViewRef.current.y,
      };
    }
  };

  const handlePortraitPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    handlePortraitPointerEnd(event);
  };

  useLayoutEffect(() => {
    if (mobileMediaIndex === null) {
      return undefined;
    }

    const surf = portraitInteractiveSurfaceRef.current;
    if (!surf) {
      return undefined;
    }

    gsap.killTweensOf(surf);
    clearPortraitTouchState();
    portraitViewRef.current = { x: 0, y: 0, scale: PORTRAIT_ZOOM_MIN };
    gsap.set(surf, {
      x: 0,
      y: 0,
      scale: PORTRAIT_ZOOM_MIN,
      transformOrigin: "50% 50%",
      force3D: true,
    });

    return undefined;
  }, [clearPortraitTouchState, mobileMediaIndex]);

  useLayoutEffect(() => {
    if (mobileMediaIndex === null) {
      return undefined;
    }

    const surf = portraitInteractiveSurfaceRef.current;
    if (!surf) {
      return undefined;
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.14 : -0.14;
      const next = clampZoom(portraitViewRef.current.scale + delta);
      portraitViewRef.current.scale = next;
      setMediaZoom(next);
      const duration = reducedMotion ? 0 : PORTRAIT_ZOOM_WHEEL_DURATION;
      gsap.to(surf, {
        scale: next,
        duration,
        ease: PORTRAIT_ZOOM_EASE,
        overwrite: "auto",
        force3D: true,
      });
    };

    surf.addEventListener("wheel", onWheel, { passive: false });
    return () => surf.removeEventListener("wheel", onWheel);
  }, [mobileMediaIndex, reducedMotion]);

  useEffect(() => {
    return () => {
      clearMobileMediaTimers();
    };
  }, [clearMobileMediaTimers]);

  return (
    <article className={`page-shell ${styles.page}`}>
      {mobileOverlayMedia ? (
        <Overlay
          closeLabel="back"
          contentNonScrollable
          contentVisible={mobileMediaContentVisible}
          onClose={closeMobileMediaOverlay}
          showTitle={false}
          title={mobileOverlayMedia.alt ?? `${project.title} media`}
          variant="immersive"
          visible={mobileMediaOverlayVisible}
        >
          <div className={styles.mobileMediaViewer} data-visible={mobileMediaContentVisible ? "true" : "false"}>
            <div className={styles.mobileMediaStage}>
              <div
                className={styles.mobileMediaReveal}
                style={portraitIntrinsicCssVars(mobileOverlayMedia, true)}
              >
                <div
                  ref={portraitInteractiveSurfaceRef}
                  className={styles.mobileMediaSurface}
                  onPointerDown={handlePortraitPointerDown}
                  onPointerMove={handlePortraitPointerMove}
                  onPointerUp={handlePortraitPointerEnd}
                  onPointerCancel={handlePortraitPointerCancel}
                >
                  <ProjectMedia
                    media={mobileOverlayMedia}
                    alt={mobileOverlayMedia.alt ?? `${project.title} media ${(mobileMediaIndex ?? 0) + 1}`}
                    className={styles.stillMedia}
                    sizes="100vw"
                    fill
                    fit="contain"
                  />
                </div>
              </div>
            </div>
            <div className={styles.mediaViewerControls} aria-label="Media zoom controls">
              <button type="button" onClick={() => handleMediaZoom(-1)} disabled={mediaZoom <= PORTRAIT_ZOOM_MIN}>
                -
              </button>
              <button
                type="button"
                onClick={resetMediaView}
                disabled={mediaZoom <= PORTRAIT_ZOOM_MIN && !mediaHasPan}
              >
                reset
              </button>
              <button type="button" onClick={() => handleMediaZoom(1)} disabled={mediaZoom >= PORTRAIT_ZOOM_MAX}>
                +
              </button>
            </div>
          </div>
        </Overlay>
      ) : null}
      <section className={styles.stills}>
        {project.media.map((item, index) => {
          const isPortrait = isPortraitMediaCapture(item);
          const label = item.alt ?? `${project.title} visual ${index + 1}`;
          const mediaKey = `${item.desktop.src}-${index}`;
          const isActiveViewerItem = mobileMediaIndex === index;
          const slotHiddenForViewer = mediaViewerHidesGridSlot && isActiveViewerItem;

          return (
            <ImageReveal
              key={mediaKey}
              data-project-media-card="true"
              data-media-viewer-hidden={slotHiddenForViewer ? "true" : undefined}
              className={[styles.still, isPortrait ? styles.portraitStill : ""].filter(Boolean).join(" ")}
              data-portrait-card={isPortrait ? "true" : undefined}
              aria-hidden={slotHiddenForViewer ? true : undefined}
            >
              <div
                className={[
                  isPortrait ? styles.portraitFrame : "",
                  styles.mobileMediaTrigger,
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-project-media-frame="true"
                data-media-index={index}
                role="button"
                tabIndex={slotHiddenForViewer ? -1 : 0}
                aria-label={`Open ${label} full screen`}
                onClickCapture={handleMobileMediaOpenCapture}
                onKeyDown={handleMobileMediaKeyDown}
              >
                <div
                  className={isPortrait ? styles.portraitMediaSurface : undefined}
                  style={isPortrait ? portraitIntrinsicCssVars(item, isPortraitMobileLayout) : undefined}
                >
                  <ProjectMedia
                    media={item}
                    alt={label}
                    className={styles.stillMedia}
                    sizes={isPortrait ? "(max-width: 48rem) 20rem, 24rem" : "(max-width: 48rem) 100vw, 72rem"}
                    fit="contain"
                    loading={index < 2 ? "eager" : "lazy"}
                    priority={index < 2}
                  />
                </div>
                {isPortrait && !isPortraitMobileLayout ? (
                  <button
                    type="button"
                    className={`link-underline ${styles.fullscreenLink}`}
                    data-media-index={index}
                    aria-expanded={false}
                    aria-label={`View ${label} full screen`}
                    onClick={handlePortraitToggle}
                  >
                    view full screen
                  </button>
                ) : null}
              </div>
            </ImageReveal>
          );
        })}
      </section>

      <div className={styles.toolbarShell} data-overlay-chrome-conceal="true" data-expanded={toolbarExpanded}>
        <div className={styles.toolbarTrack}>
          <Link
            href={`/projects/${previousProject.slug}`}
            className={`${styles.navButton} ${styles.previousButton}`}
          >
            Previous
          </Link>

          <div
            className={styles.toolbarCore}
            data-expanded={toolbarExpanded}
            onPointerEnter={handleToolbarPointerEnter}
            onPointerLeave={handleToolbarPointerLeave}
            onFocusCapture={handleToolbarFocus}
            onBlurCapture={handleToolbarBlur}
          >
            <section className={styles.toolbarPanel} aria-label={`${project.title} project toolbar`}>
              <div className={styles.toolbarHeader}>
                <div className={styles.toolbarCopy}>
                  <h1>{project.title}</h1>
                </div>

                <button
                  type="button"
                  className={styles.expandToggle}
                  aria-expanded={toolbarExpanded}
                  aria-label={toolbarExpanded ? "Collapse project toolbar" : "Expand project toolbar"}
                  onClick={handleToggleClick}
                >
                  <span className={styles.expandGlyph} aria-hidden="true" />
                </button>
              </div>

              <div className={styles.toolbarBodyWrap}>
                <div className={styles.toolbarBody}>
                  <RevealLines
                    as="p"
                    className={styles.toolbarDescription}
                    text={project.descriptor}
                    offset={descriptorOffset}
                    stepMs={lineStepMs}
                    total={total}
                    visible={toolbarExpanded}
                  />
                  <div
                    className={styles.toolbarActions}
                    data-has-visit={primaryProjectUrl ? "true" : undefined}
                  >
                    {primaryProjectUrl ? (
                      <a
                        href={primaryProjectUrl}
                        className={`link-underline ${styles.toolbarAction}`}
                        data-align="start"
                        target="_blank"
                        rel="noopener noreferrer"
                        tabIndex={toolbarExpanded ? 0 : -1}
                      >
                        <RevealLines
                          as="span"
                          className={styles.toolbarActionReveal}
                          text={visitLabel}
                          measureLines={false}
                          offset={visitOffset}
                          stepMs={lineStepMs}
                          total={total}
                          visible={toolbarExpanded}
                        />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className={`link-underline ${styles.toolbarAction}`}
                      data-align="end"
                      onClick={() => openProjectFullInfo(project)}
                      tabIndex={toolbarExpanded ? 0 : -1}
                    >
                      <RevealLines
                        as="span"
                        className={styles.toolbarActionReveal}
                        text={overviewLabel}
                        measureLines={false}
                        offset={overviewOffset}
                        stepMs={lineStepMs}
                        total={total}
                        visible={toolbarExpanded}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <Link
            href={`/projects/${nextProject.slug}`}
            className={`${styles.navButton} ${styles.nextButton}`}
          >
            Next
          </Link>
        </div>
      </div>
    </article>
  );
}
