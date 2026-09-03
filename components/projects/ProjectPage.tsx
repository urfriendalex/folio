"use client";

import gsap from "gsap";
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
import { usePathname, useRouter } from "next/navigation";
import { ProjectMedia } from "@/components/media/ProjectMedia/ProjectMedia";
import { ImageReveal } from "@/components/motion/ImageReveal/ImageReveal";
import { RevealLines } from "@/components/motion/RevealLines/RevealLines";
import { usePretextLines } from "@/components/motion/shared/usePretextLines";
import { ExploreCueHost } from "@/components/ui/ExploreCue/ExploreCueHost";
import { Overlay } from "@/components/ui/Overlay/Overlay";
import { useOverlay } from "@/components/ui/Overlay/OverlayProvider";
import type { ProjectEntry } from "@/content/projects/types";
import { allowNavigatorRoutePrefetch } from "@/lib/allowNavigatorRoutePrefetch";
import { PROJECT_STILL_IMAGE_SIZES } from "@/lib/projectMedia";
import { useClientMounted } from "@/lib/useClientMounted";
import { useNavigationFlightLock } from "@/lib/useNavigationFlightLock";
import styles from "./ProjectPage.module.scss";

/** Keep in sync with `--reveal-step` in `ProjectPage.module.scss`. */
const TOOLBAR_LINE_STEP_MS = 34;
/** Keep in sync with `--toolbar-desc-transform-ms` in `ProjectPage.module.scss`. */
const TOOLBAR_DESC_TRANSFORM_MS = 320;
/** Keep in sync with action stagger buffer used by `toolbarActionUnderlineReadyMs`. */
const TOOLBAR_UNDERLINE_BUFFER_MS = 120;
/** Start copy while the shell is still opening so it lands as the box settles. */
const TOOLBAR_COPY_REVEAL_DELAY_MS = 80;
/** Wait before pending chrome so instant prefetched navigations do not flash. */
const NAV_PENDING_FEEDBACK_MS = 90;

type ProjectNavDirection = "previous" | "next";

function toolbarActionUnderlineReadyMs(tokenIndex: number, stepMs: number): number {
  const revealActionsDelay = TOOLBAR_DESC_TRANSFORM_MS * 0.2 + stepMs * 2;
  return (
    revealActionsDelay
    + tokenIndex * stepMs
    + TOOLBAR_DESC_TRANSFORM_MS
    + TOOLBAR_UNDERLINE_BUFFER_MS
  );
}
const PORTRAIT_MEDIA_RATIO = 1.25;
const PORTRAIT_ZOOM_MIN = 1;
const PORTRAIT_ZOOM_MAX = 3;
const PORTRAIT_ZOOM_STEP = 0.35;
const PORTRAIT_ZOOM_BUTTON_DURATION = 0.24;
const PORTRAIT_ZOOM_WHEEL_DURATION = 0.18;
const PORTRAIT_ZOOM_EASE = "power3.out";
const PORTRAIT_VIEW_RESET_DURATION = 0.26;
const PORTRAIT_VIEW_RESET_EASE = "power3.out";
const MEDIA_VIEWER_CONTENT_EXIT_MS = 160;
/** Immersive shell fades ~480ms after `visible` is set false (see Overlay.module.scss). */
const MEDIA_VIEWER_OVERLAY_EXIT_MS = MEDIA_VIEWER_CONTENT_EXIT_MS + 520;
const MEDIA_SWIPE_DISTANCE_PX = 56;
const MEDIA_SWIPE_VELOCITY_PX_PER_MS = 0.45;
const MEDIA_CHANGE_DURATION = 0.2;
const MEDIA_CHANGE_EASE = "power3.inOut";
const MEDIA_GESTURE_SETTLE_DURATION = 0.14;

type MediaTransition = {
  direction: -1 | 1;
  outgoingIndex: number;
};

type PortraitView = {
  x: number;
  y: number;
  scale: number;
};

function portraitIntrinsicCssVars(
  media: ProjectEntry["media"][number],
  useMobileVariant = false,
): CSSProperties {
  const { width, height } =
    useMobileVariant && media.mobile ? media.mobile : media.desktop;
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
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
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
  return (
    typeof window !== "undefined" &&
    window.matchMedia(PORTRAIT_MOBILE_MQ).matches
  );
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

export function ProjectPage({
  nextProject,
  previousProject,
  project,
}: ProjectPageProps) {
  const { openProjectFullInfo } = useOverlay();
  const pathname = usePathname();
  const router = useRouter();
  const { guardedPush, isPendingNav } = useNavigationFlightLock(pathname);

  useEffect(() => {
    if (!allowNavigatorRoutePrefetch()) {
      return;
    }

    router.prefetch(`/projects/${previousProject.slug}`);
    router.prefetch(`/projects/${nextProject.slug}`);
  }, [nextProject.slug, previousProject.slug, router]);

  const [toolbarPinnedOpen, setToolbarPinnedOpen] = useState(false);
  const [toolbarHovered, setToolbarHovered] = useState(false);
  const [toolbarLinesVisible, setToolbarLinesVisible] = useState(false);
  const [pendingDirection, setPendingDirection] =
    useState<ProjectNavDirection | null>(null);
  const [showNavPending, setShowNavPending] = useState(false);
  const [visitUnderlineReady, setVisitUnderlineReady] = useState(false);
  const [overviewUnderlineReady, setOverviewUnderlineReady] = useState(false);
  const toolbarUnderlineTimersRef = useRef<number[]>([]);
  const hasMounted = useClientMounted();
  const toolbarMeasureRef = useRef<HTMLElement | null>(null);
  const [mobileMediaIndex, setMobileMediaIndex] = useState<number | null>(null);
  /** When false, grid slot fades back in while the overlay finishes closing (avoids an empty card gap). */
  const [mediaViewerHidesGridSlot, setMediaViewerHidesGridSlot] =
    useState(false);
  const [mobileMediaOverlayVisible, setMobileMediaOverlayVisible] =
    useState(false);
  const [mobileMediaContentVisible, setMobileMediaContentVisible] =
    useState(false);
  const [mediaZoom, setMediaZoom] = useState(PORTRAIT_ZOOM_MIN);
  const [mediaHasPan, setMediaHasPan] = useState(false);
  const [mediaTransition, setMediaTransition] =
    useState<MediaTransition | null>(null);
  const mobileMediaRevealRef = useRef<HTMLDivElement | null>(null);
  const outgoingMediaRevealRef = useRef<HTMLDivElement | null>(null);
  const portraitInteractiveSurfaceRef = useRef<HTMLDivElement | null>(null);
  const mediaTransitioningRef = useRef(false);
  const portraitViewRef = useRef<PortraitView>({
    x: 0,
    y: 0,
    scale: PORTRAIT_ZOOM_MIN,
  });
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
    startTime: 0,
    navigatesGallery: false,
  });
  const portraitPointersRef = useRef(
    new Map<number, { x: number; y: number }>(),
  );
  const portraitPinchRef = useRef<{
    startDistance: number;
    startScale: number;
  } | null>(null);
  const toolbarExpanded = toolbarPinnedOpen || toolbarHovered;
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServerSnapshot,
  );
  const isPortraitMobileLayoutLive = useSyncExternalStore(
    subscribePortraitMobileLayout,
    portraitMobileLayoutSnapshot,
    portraitMobileLayoutServerSnapshot,
  );
  const isPortraitMobileLayout = hasMounted
    ? isPortraitMobileLayoutLive
    : false;
  const overviewLabel = "show full overview";
  const visitLabel = "visit site";
  const primaryProjectUrl = project.links?.[0]?.url;
  const mobileOverlayMedia =
    mobileMediaIndex !== null ? project.media[mobileMediaIndex] : null;
  const outgoingOverlayMedia = mediaTransition
    ? project.media[mediaTransition.outgoingIndex]
    : null;
  const mediaViewerOpen = mobileMediaIndex !== null;
  const hasPreviousMedia = mobileMediaIndex !== null && mobileMediaIndex > 0;
  const hasNextMedia =
    mobileMediaIndex !== null && mobileMediaIndex < project.media.length - 1;

  const lineStepMs = reducedMotion ? 8 : TOOLBAR_LINE_STEP_MS;
  const descriptorLines = usePretextLines(
    project.descriptor,
    toolbarMeasureRef,
    "pre-wrap",
    hasMounted,
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setToolbarLinesVisible(toolbarExpanded);
    }, toolbarExpanded && !reducedMotion ? TOOLBAR_COPY_REVEAL_DELAY_MS : 0);

    return () => window.clearTimeout(timerId);
  }, [reducedMotion, toolbarExpanded]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setShowNavPending(isPendingNav && pendingDirection !== null);
    }, isPendingNav && pendingDirection !== null ? NAV_PENDING_FEEDBACK_MS : 0);

    return () => window.clearTimeout(timerId);
  }, [isPendingNav, pendingDirection]);

  const goToSibling = (direction: ProjectNavDirection) => {
    const target = direction === "next" ? nextProject : previousProject;
    const started = guardedPush(`/projects/${target.slug}`);

    if (!started) {
      return;
    }

    setPendingDirection(direction);
  };

  const { total, descriptorOffset, visitOffset, overviewOffset } =
    useMemo(() => {
      const hasVisit = Boolean(primaryProjectUrl);
      const descriptorLineCount = Math.max(1, descriptorLines.length);
      const visitOffsetValue = descriptorLineCount;
      const overviewOffsetValue = descriptorLineCount + (hasVisit ? 1 : 0);
      return {
        total: overviewOffsetValue + 1,
        descriptorOffset: 0,
        visitOffset: visitOffsetValue,
        overviewOffset: overviewOffsetValue,
      };
    }, [descriptorLines.length, primaryProjectUrl]);

  useEffect(() => {
    toolbarUnderlineTimersRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    toolbarUnderlineTimersRef.current = [];
    const resetTimer = window.setTimeout(() => {
      setVisitUnderlineReady(false);
      setOverviewUnderlineReady(false);
    }, 0);
    toolbarUnderlineTimersRef.current.push(resetTimer);

    if (!toolbarLinesVisible) {
      return;
    }

    if (reducedMotion) {
      const readyTimer = window.setTimeout(() => {
        setVisitUnderlineReady(true);
        setOverviewUnderlineReady(true);
      }, 0);
      toolbarUnderlineTimersRef.current.push(readyTimer);
      return;
    }

    const scheduleUnderlineReady = (
      tokenIndex: number,
      markReady: (ready: boolean) => void,
    ) => {
      const timerId = window.setTimeout(() => {
        markReady(true);
      }, toolbarActionUnderlineReadyMs(tokenIndex, lineStepMs));
      toolbarUnderlineTimersRef.current.push(timerId);
    };

    if (primaryProjectUrl) {
      scheduleUnderlineReady(visitOffset, setVisitUnderlineReady);
    }

    scheduleUnderlineReady(overviewOffset, setOverviewUnderlineReady);

    return () => {
      toolbarUnderlineTimersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      toolbarUnderlineTimersRef.current = [];
    };
  }, [
    lineStepMs,
    overviewOffset,
    primaryProjectUrl,
    reducedMotion,
    toolbarLinesVisible,
    visitOffset,
  ]);

  const handleToolbarPointerEnter = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.pointerType === "mouse") {
      setToolbarHovered(true);
    }
  };

  const handleToolbarPointerLeave = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.pointerType === "mouse") {
      setToolbarHovered(false);
    }
  };

  const handleToolbarFocus = () => {
    setToolbarHovered(true);
  };

  const handleToolbarBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;

    if (
      !(nextTarget instanceof Node) ||
      !event.currentTarget.contains(nextTarget)
    ) {
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

  const setMediaViewAtRest = useCallback(() => {
    portraitViewRef.current = { x: 0, y: 0, scale: PORTRAIT_ZOOM_MIN };
    setMediaZoom(PORTRAIT_ZOOM_MIN);
    setMediaHasPan(false);
    const surf = portraitInteractiveSurfaceRef.current;
    if (surf) {
      gsap.killTweensOf(surf);
      gsap.set(surf, { x: 0, y: 0, scale: PORTRAIT_ZOOM_MIN });
    }
  }, []);

  const resetMediaView = useCallback(() => {
    const reveal = mobileMediaRevealRef.current;
    if (reveal) {
      gsap.killTweensOf(reveal);
      gsap.set(reveal, { y: 0 });
    }
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

  const navigateMedia = useCallback(
    (direction: -1 | 1, source: "control" | "gesture" | "keyboard") => {
      if (mobileMediaIndex === null || mediaTransitioningRef.current) {
        return;
      }

      const nextIndex = mobileMediaIndex + direction;
      if (nextIndex < 0 || nextIndex >= project.media.length) {
        const reveal = mobileMediaRevealRef.current;
        if (reveal) {
          gsap.to(reveal, {
            y: 0,
            duration: reducedMotion ? 0 : MEDIA_GESTURE_SETTLE_DURATION,
            ease: "power4.out",
            overwrite: true,
          });
        }
        return;
      }

      const reveal = mobileMediaRevealRef.current;
      const shouldAnimate =
        source !== "keyboard" && !reducedMotion && Boolean(reveal);
      mediaTransitioningRef.current = true;
      clearPortraitTouchState();
      setMediaViewAtRest();

      if (!shouldAnimate) {
        if (reveal) {
          gsap.killTweensOf(reveal);
          gsap.set(reveal, { clearProps: "y,yPercent,opacity" });
        }
        setMediaTransition(null);
        setMobileMediaIndex(nextIndex);
        mediaTransitioningRef.current = false;
        return;
      }

      setMediaTransition({ direction, outgoingIndex: mobileMediaIndex });
      setMobileMediaIndex(nextIndex);
    },
    [
      clearPortraitTouchState,
      mobileMediaIndex,
      project.media.length,
      reducedMotion,
      setMediaViewAtRest,
    ],
  );

  const openMobileMediaOverlay = useCallback(
    (mediaIndex: number) => {
      clearMobileMediaTimers();
      clearPortraitTouchState();
      mediaTransitioningRef.current = false;
      setMediaTransition(null);
      if (mobileMediaRevealRef.current) {
        gsap.killTweensOf(mobileMediaRevealRef.current);
        gsap.set(mobileMediaRevealRef.current, {
          clearProps: "y,yPercent,opacity",
        });
      }
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
        mobileMediaContentFrameRef.current = window.requestAnimationFrame(
          () => {
            setMobileMediaContentVisible(true);
            mobileMediaContentFrameRef.current = null;
          },
        );
      });
    },
    [clearMobileMediaTimers, clearPortraitTouchState],
  );

  const closeMobileMediaOverlay = useCallback(() => {
    clearMobileMediaTimers();
    clearPortraitTouchState();
    mediaTransitioningRef.current = false;
    setMediaTransition(null);
    const reveal = mobileMediaRevealRef.current;
    if (reveal) {
      gsap.killTweensOf(reveal);
    }
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

  const handlePortraitToggle = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const mediaIndex = mediaIndexFromTarget(event.currentTarget);
      if (mediaIndex !== null) {
        openMobileMediaOverlay(mediaIndex);
      }
    },
    [openMobileMediaOverlay],
  );

  const handleMobileMediaOpenCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (mediaViewerOpen) {
        return;
      }
      const target = event.target as HTMLElement;
      if (
        target.closest(
          "button, a[href], input, textarea, select, [data-skip-portrait-open='true']",
        )
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const mediaIndex = mediaIndexFromTarget(event.currentTarget);
      if (mediaIndex !== null) {
        openMobileMediaOverlay(mediaIndex);
      }
    },
    [mediaViewerOpen, openMobileMediaOverlay],
  );

  const handleMobileMediaKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
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
    },
    [mediaViewerOpen, openMobileMediaOverlay],
  );

  const handleMediaZoom = useCallback(
    (direction: 1 | -1) => {
      const reveal = mobileMediaRevealRef.current;
      if (reveal) {
        gsap.killTweensOf(reveal);
        gsap.set(reveal, { y: 0 });
      }
      const surf = portraitInteractiveSurfaceRef.current;
      const next = clampZoom(
        portraitViewRef.current.scale + direction * PORTRAIT_ZOOM_STEP,
      );
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

  const handlePortraitPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!mediaViewerOpen) {
      return;
    }

    const surf = portraitInteractiveSurfaceRef.current;
    if (!surf) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest("button, a[href], input, textarea, select")) {
      return;
    }

    const map = portraitPointersRef.current;
    map.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (map.size >= 2) {
      const reveal = mobileMediaRevealRef.current;
      if (reveal) {
        gsap.killTweensOf(reveal);
        gsap.set(reveal, { y: 0 });
      }
      const points = [...map.values()];
      const dist = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y,
      );
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

    const reveal = mobileMediaRevealRef.current;
    if (reveal) {
      gsap.killTweensOf(reveal);
      gsap.set(reveal, { y: 0 });
    }

    portraitDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: portraitViewRef.current.x,
      panY: portraitViewRef.current.y,
      startTime: performance.now(),
      navigatesGallery:
        portraitViewRef.current.scale <= PORTRAIT_ZOOM_MIN + 0.001,
    };
    event.currentTarget.setAttribute("data-dragging", "true");
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can fail when the browser has already cancelled a touch.
    }
  };

  const handlePortraitPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
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
      const dist = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y,
      );
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

    if (drag.navigatesGallery) {
      const reveal = mobileMediaRevealRef.current;
      if (!reveal) {
        return;
      }
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const verticalIntent = Math.abs(deltaY) > Math.abs(deltaX);
      gsap.set(reveal, { y: verticalIntent ? deltaY * 0.72 : 0 });
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

  const handlePortraitPointerEnd = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const completedDrag = { ...portraitDragRef.current };
    const map = portraitPointersRef.current;
    map.delete(event.pointerId);

    if (map.size < 2) {
      portraitPinchRef.current = null;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }

    if (portraitDragRef.current.pointerId === event.pointerId) {
      portraitDragRef.current.pointerId = -1;
      clearPortraitDragging(event.currentTarget);

      if (completedDrag.navigatesGallery) {
        const deltaX = event.clientX - completedDrag.startX;
        const deltaY = event.clientY - completedDrag.startY;
        const elapsed = Math.max(1, performance.now() - completedDrag.startTime);
        const velocity = Math.abs(deltaY) / elapsed;
        const isVertical = Math.abs(deltaY) > Math.abs(deltaX) * 1.15;
        const shouldNavigate =
          isVertical &&
          (Math.abs(deltaY) >= MEDIA_SWIPE_DISTANCE_PX ||
            velocity >= MEDIA_SWIPE_VELOCITY_PX_PER_MS);

        if (shouldNavigate) {
          navigateMedia(deltaY < 0 ? 1 : -1, "gesture");
        } else {
          const reveal = mobileMediaRevealRef.current;
          if (reveal) {
            gsap.to(reveal, {
              y: 0,
              duration: reducedMotion ? 0 : MEDIA_GESTURE_SETTLE_DURATION,
              ease: "power4.out",
              overwrite: true,
            });
          }
        }
        return;
      }

      setMediaZoom(portraitViewRef.current.scale);
      setMediaHasPan(
        portraitViewRef.current.x !== 0 || portraitViewRef.current.y !== 0,
      );
    } else if (map.size === 1 && mediaViewerOpen) {
      setMediaZoom(portraitViewRef.current.scale);
      const [remainingId, pt] = [...map.entries()][0]!;
      portraitDragRef.current = {
        pointerId: remainingId,
        startX: pt.x,
        startY: pt.y,
        panX: portraitViewRef.current.x,
        panY: portraitViewRef.current.y,
        startTime: performance.now(),
        navigatesGallery: false,
      };
    }
  };

  const handlePortraitPointerCancel = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
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

    const reveal = mobileMediaRevealRef.current;
    return () => {
      gsap.killTweensOf(surf);
      if (reveal) {
        gsap.killTweensOf(reveal);
      }
    };
  }, [clearPortraitTouchState, mobileMediaIndex]);

  useLayoutEffect(() => {
    if (!mediaTransition || reducedMotion) {
      return undefined;
    }

    const incoming = mobileMediaRevealRef.current;
    const outgoing = outgoingMediaRevealRef.current;
    if (!incoming || !outgoing) {
      mediaTransitioningRef.current = false;
      return undefined;
    }

    const { direction } = mediaTransition;
    const outgoingY = Number(gsap.getProperty(outgoing, "y")) || 0;
    const timeline = gsap.timeline({
      defaults: { overwrite: true, force3D: true },
      onComplete: () => {
        gsap.set(incoming, { clearProps: "clipPath,y,visibility" });
        mediaTransitioningRef.current = false;
        setMediaTransition(null);
      },
    });

    timeline
      .set(incoming, {
        clipPath:
          direction > 0 ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)",
        y: direction * 18,
        visibility: "visible",
      })
      .to(
        outgoing,
        {
          y: outgoingY - direction * 10,
          duration: MEDIA_CHANGE_DURATION,
          ease: MEDIA_CHANGE_EASE,
        },
        0,
      )
      .to(
        incoming,
        {
          clipPath: "inset(0% 0 0% 0)",
          y: 0,
          duration: MEDIA_CHANGE_DURATION,
          ease: MEDIA_CHANGE_EASE,
        },
        0,
      );

    return () => {
      timeline.kill();
    };
  }, [mediaTransition, reducedMotion]);

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
    if (mobileMediaIndex === null) {
      return undefined;
    }

    const handleViewerKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        navigateMedia(-1, "keyboard");
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        navigateMedia(1, "keyboard");
      }
    };

    document.addEventListener("keydown", handleViewerKeyDown);
    return () => document.removeEventListener("keydown", handleViewerKeyDown);
  }, [mobileMediaIndex, navigateMedia]);

  useEffect(() => {
    if (mobileMediaIndex === null) {
      return;
    }

    [mobileMediaIndex - 1, mobileMediaIndex + 1].forEach((index) => {
      const item = project.media[index];
      if (!item) {
        return;
      }
      const asset =
        isPortraitMobileLayout && item.mobile ? item.mobile : item.desktop;
      const image = new window.Image();
      image.src = item.kind === "video" ? asset.poster ?? asset.src : asset.src;
    });
  }, [isPortraitMobileLayout, mobileMediaIndex, project.media]);

  useEffect(() => {
    return () => {
      clearMobileMediaTimers();
    };
  }, [clearMobileMediaTimers]);

  const pendingProjectTitle =
    pendingDirection === "next"
      ? nextProject.title
      : pendingDirection === "previous"
        ? previousProject.title
        : null;

  return (
    <article
      className={`page-shell ${styles.page}`}
      aria-busy={isPendingNav || undefined}
      data-nav-pending={showNavPending ? "true" : undefined}
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {showNavPending && pendingProjectTitle
          ? `Loading ${pendingProjectTitle}`
          : ""}
      </p>
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
          <div
            className={styles.mobileMediaViewer}
            data-visible={mobileMediaContentVisible ? "true" : "false"}
            onPointerDown={handlePortraitPointerDown}
            onPointerMove={handlePortraitPointerMove}
            onPointerUp={handlePortraitPointerEnd}
            onPointerCancel={handlePortraitPointerCancel}
          >
            <div className={styles.mobileMediaStage}>
              {outgoingOverlayMedia && mediaTransition ? (
                <div
                  key={`media-${mediaTransition.outgoingIndex}`}
                  ref={outgoingMediaRevealRef}
                  className={`${styles.mobileMediaReveal} ${styles.mobileMediaOutgoing}`}
                  style={portraitIntrinsicCssVars(outgoingOverlayMedia, true)}
                  aria-hidden="true"
                >
                  <div className={styles.mobileMediaSurface}>
                    <ProjectMedia
                      media={outgoingOverlayMedia}
                      alt=""
                      className={styles.stillMedia}
                      placeholderClassName={styles.mobileMediaPlaceholder}
                      fill
                      fit="contain"
                    />
                  </div>
                </div>
              ) : null}
              <div
                key={`media-${mobileMediaIndex}`}
                ref={mobileMediaRevealRef}
                className={styles.mobileMediaReveal}
                style={portraitIntrinsicCssVars(mobileOverlayMedia, true)}
              >
                <div
                  ref={portraitInteractiveSurfaceRef}
                  className={styles.mobileMediaSurface}
                >
                  <ProjectMedia
                    media={mobileOverlayMedia}
                    alt={
                      mobileOverlayMedia.alt ??
                      `${project.title} media ${(mobileMediaIndex ?? 0) + 1}`
                    }
                    className={styles.stillMedia}
                    placeholderClassName={styles.mobileMediaPlaceholder}
                    fill
                    fit="contain"
                    sizes="100vw"
                  />
                </div>
              </div>
            </div>
            <div
              className={`${styles.mediaViewerControls} ${styles.mediaViewerZoomControls}`}
              aria-label="Media zoom controls"
              role="group"
            >
              <button
                type="button"
                className={styles.mediaViewerControlButton}
                onClick={() => handleMediaZoom(-1)}
                disabled={mediaZoom <= PORTRAIT_ZOOM_MIN}
              >
                <span className={styles.mediaViewerControlGlyph}>-</span>
              </button>
              <button
                type="button"
                className={styles.mediaViewerControlButton}
                onClick={resetMediaView}
                disabled={mediaZoom <= PORTRAIT_ZOOM_MIN && !mediaHasPan}
              >
                <span className={styles.mediaViewerControlGlyph}>reset</span>
              </button>
              <button
                type="button"
                className={styles.mediaViewerControlButton}
                onClick={() => handleMediaZoom(1)}
                disabled={mediaZoom >= PORTRAIT_ZOOM_MAX}
              >
                <span className={styles.mediaViewerControlGlyph}>+</span>
              </button>
            </div>
            <div
              className={`${styles.mediaViewerControls} ${styles.mediaViewerNavigationControls}`}
              aria-label="Media navigation controls"
              role="group"
            >
              <button
                type="button"
                className={styles.mediaViewerControlButton}
                onClick={() => navigateMedia(-1, "control")}
                disabled={!hasPreviousMedia}
                aria-label="View previous media"
              >
                <span
                  className={styles.mediaViewerControlGlyph}
                  aria-hidden="true"
                >
                  ↑
                </span>
              </button>
              <button
                type="button"
                className={styles.mediaViewerControlButton}
                onClick={() => navigateMedia(1, "control")}
                disabled={!hasNextMedia}
                aria-label="View next media"
              >
                <span
                  className={styles.mediaViewerControlGlyph}
                  aria-hidden="true"
                >
                  ↓
                </span>
              </button>
            </div>
            <p className={styles.mediaViewerPosition} aria-hidden="true">
              {String((mobileMediaIndex ?? 0) + 1).padStart(2, "0")} /{" "}
              {String(project.media.length).padStart(2, "0")}
            </p>
            <p
              className="sr-only"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              Media {(mobileMediaIndex ?? 0) + 1} of {project.media.length}
            </p>
          </div>
        </Overlay>
      ) : null}
      <section className={styles.stills}>
        {project.media.map((item, index) => {
          const isPortrait = isPortraitMediaCapture(item);
          const label = item.alt ?? `${project.title} visual ${index + 1}`;
          const mediaKey = `${item.desktop.src}-${index}`;
          const isActiveViewerItem = mobileMediaIndex === index;
          const slotHiddenForViewer =
            mediaViewerHidesGridSlot && isActiveViewerItem;

          return (
            <ImageReveal
              key={mediaKey}
              data-project-media-card="true"
              data-media-viewer-hidden={
                slotHiddenForViewer ? "true" : undefined
              }
              className={[styles.still, isPortrait ? styles.portraitStill : ""]
                .filter(Boolean)
                .join(" ")}
              data-portrait-card={isPortrait ? "true" : undefined}
              aria-hidden={slotHiddenForViewer ? true : undefined}
            >
              <ExploreCueHost
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
                enabled={!slotHiddenForViewer}
                label="zoom"
                onClickCapture={handleMobileMediaOpenCapture}
                onKeyDown={handleMobileMediaKeyDown}
              >
                <div
                  className={
                    isPortrait ? styles.portraitMediaSurface : undefined
                  }
                  style={
                    isPortrait
                      ? portraitIntrinsicCssVars(item, isPortraitMobileLayout)
                      : undefined
                  }
                >
                  <ProjectMedia
                    media={item}
                    alt={label}
                    className={styles.stillMedia}
                    fit="contain"
                    sizes={PROJECT_STILL_IMAGE_SIZES}
                    imagePreload={index === 0}
                    loading={index < 2 ? "eager" : "lazy"}
                  />
                </div>
                {isPortrait ? (
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
              </ExploreCueHost>
            </ImageReveal>
          );
        })}
      </section>

      <div
        className={styles.toolbarShell}
        data-overlay-toolbar-slide="true"
        data-expanded={toolbarExpanded}
      >
        <div className={styles.toolbarTrack}>
          <button
            type="button"
            data-pending={
              showNavPending && pendingDirection === "previous"
                ? "true"
                : undefined
            }
            className={`${styles.navButton} ${styles.previousButton}`}
            onClick={() => {
              goToSibling("previous");
            }}
          >
            Previous
          </button>

          <div
            className={styles.toolbarCore}
            data-expanded={toolbarExpanded}
            onPointerEnter={handleToolbarPointerEnter}
            onPointerLeave={handleToolbarPointerLeave}
            onFocusCapture={handleToolbarFocus}
            onBlurCapture={handleToolbarBlur}
          >
            <section
              ref={toolbarMeasureRef}
              className={styles.toolbarPanel}
              aria-label={`${project.title} project toolbar`}
            >
              <div className={styles.toolbarHeader}>
                <div className={styles.toolbarCopy}>
                  <h1>{project.title}</h1>
                </div>

                <button
                  type="button"
                  className={styles.expandToggle}
                  aria-expanded={toolbarExpanded}
                  aria-label={
                    toolbarExpanded
                      ? "Collapse project toolbar"
                      : "Expand project toolbar"
                  }
                  onClick={handleToggleClick}
                >
                  <span className={styles.expandGlyph} aria-hidden="true" />
                </button>
              </div>

              <div
                className={styles.toolbarBodyWrap}
                aria-hidden={
                  toolbarExpanded && !toolbarLinesVisible ? true : undefined
                }
              >
                <div className={styles.toolbarBody}>
                  <RevealLines
                    as="p"
                    className={styles.toolbarDescription}
                    lines={descriptorLines}
                    measureLines={false}
                    text={project.descriptor}
                    offset={descriptorOffset}
                    stepMs={lineStepMs}
                    total={total}
                    visible={toolbarLinesVisible}
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
                        data-underline-ready={visitUnderlineReady ? "true" : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        tabIndex={toolbarLinesVisible ? 0 : -1}
                      >
                        <RevealLines
                          as="span"
                          className={styles.toolbarActionReveal}
                          text={visitLabel}
                          measureLines={false}
                          offset={visitOffset}
                          stepMs={lineStepMs}
                          total={total}
                          visible={toolbarLinesVisible}
                        />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className={`link-underline ${styles.toolbarAction}`}
                      data-align="end"
                      data-underline-ready={overviewUnderlineReady ? "true" : undefined}
                      onClick={() => openProjectFullInfo(project)}
                      tabIndex={toolbarLinesVisible ? 0 : -1}
                    >
                      <RevealLines
                        as="span"
                        className={styles.toolbarActionReveal}
                        text={overviewLabel}
                        measureLines={false}
                        offset={overviewOffset}
                        stepMs={lineStepMs}
                        total={total}
                        visible={toolbarLinesVisible}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <button
            type="button"
            data-pending={
              showNavPending && pendingDirection === "next" ? "true" : undefined
            }
            className={`${styles.navButton} ${styles.nextButton}`}
            onClick={() => {
              goToSibling("next");
            }}
          >
            Next
          </button>
        </div>
      </div>
    </article>
  );
}
