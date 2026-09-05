"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { ProjectMedia } from "@/components/media/ProjectMedia/ProjectMedia";
import { IntentPrefetchLink } from "@/components/navigation/IntentPrefetchLink";
import { ProjectCard } from "@/components/ui/ProjectCard/ProjectCard";
import {
  filterProjectsByType,
  PROJECT_FILTERS,
  projectFilterCounts,
  projectFilterLabel,
  type ProjectFilterId,
} from "@/content/projects";
import type { ProjectEntry, ProjectMediaSlot } from "@/content/projects/types";
import { gsap, registerGsapScrollTrigger, ScrollTrigger } from "@/lib/gsapScroll";
import { onBodyScrollLock, isBodyScrollLocked } from "@/lib/scrollLock";
import { coerceProjectIndexView, readProjectLayout, writeProjectLayout } from "@/lib/projectLayout";
import { useClientMounted } from "@/lib/useClientMounted";
import { PROJECT_INDEX_PREVIEW_IMAGE_SIZES, thumbnailToMediaSlot } from "@/lib/projectMedia";
import { getLenis } from "@/lib/smoothScroll";
import styles from "./ProjectsIndex.module.scss";

type GridView = "stack" | "wide" | "regular";
type IndexView = "list" | GridView;

type ViewOption = {
  view: IndexView;
  label: string;
  columns: number;
  rows: number;
  variant: "bars" | "grid";
  widthRatio: number;
  heightRatio: number;
  gapRatio: number;
};

const LIST_OPTION: ViewOption = {
  view: "list",
  label: "List view",
  columns: 1,
  rows: 3,
  variant: "grid",
  widthRatio: 0.42,
  heightRatio: 0.48,
  gapRatio: 0.14,
};

const desktopGridOptions: ViewOption[] = [
  {
    view: "stack",
    label: "One column grid",
    columns: 1,
    rows: 2,
    variant: "grid",
    widthRatio: 0.5,
    heightRatio: 0.48,
    gapRatio: 0.09,
  },
  {
    view: "wide",
    label: "Two column grid",
    columns: 2,
    rows: 2,
    variant: "grid",
    widthRatio: 0.5,
    heightRatio: 0.48,
    gapRatio: 0.092,
  },
  {
    view: "regular",
    label: "Three column grid",
    columns: 3,
    rows: 2,
    variant: "grid",
    widthRatio: 0.5,
    heightRatio: 0.48,
    gapRatio: 0.095,
  },
];

const MOBILE_MQ = "(max-width: 48rem)";
/* Above 13–14" laptop CSS widths (~1440–1512). 16" / external / XL only. */
const SUPER_WIDE_QUERY = "(min-width: 100rem)";

function isGridView(view: IndexView): view is GridView {
  return view !== "list";
}

const PREVIEW_CURSOR_OFFSET = 36;
const PREVIEW_VIEWPORT_PAD = 12;
const PREVIEW_LERP = 0.2;
const PREVIEW_CROSSFADE_MS = 280;
const VIEW_LEAVE_MS = 100;
const VIEW_ENTER_STAGGER_CAP = 8;
const VIEW_INDEX_STAGGER_MS = 120;
const VIEW_INDEX_RULE_MS = 1100;
const VIEW_INDEX_RULE_DELAY_MS = Math.round(VIEW_INDEX_STAGGER_MS * 1.5);
const VIEW_ENTER_DONE_MS =
  VIEW_ENTER_STAGGER_CAP * VIEW_INDEX_STAGGER_MS + VIEW_INDEX_RULE_DELAY_MS + VIEW_INDEX_RULE_MS + 40;
const LIST_PAGE_LOCK_S = 0.42;
const PREVIEW_INTRO_TAIL_MS = 220;
const PREVIEW_SWIPE_RATIO = 0.28;
const PREVIEW_SWIPE_VELOCITY = 0.55;
const PREVIEW_SWIPE_LOCK = 10;

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function reducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function reducedMotionServerSnapshot() {
  return false;
}

function subscribeMobile(onChange: () => void) {
  const mq = window.matchMedia(MOBILE_MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function mobileSnapshot() {
  return window.matchMedia(MOBILE_MQ).matches;
}

function previewSlot(project: ProjectEntry, stillOnly: boolean): ProjectMediaSlot {
  const slot = thumbnailToMediaSlot(project.thumbnail);
  if (!stillOnly || slot.kind === "image") {
    return slot;
  }

  return {
    ...slot,
    kind: "image",
    desktop: {
      ...slot.desktop,
      src: slot.desktop.poster ?? slot.desktop.src,
    },
    mobile: slot.mobile
      ? {
          ...slot.mobile,
          src: slot.mobile.poster ?? slot.mobile.src,
        }
      : undefined,
  };
}

function headerHeightPx() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-height").trim();
  const parsed = Number.parseFloat(raw);

  if (!Number.isFinite(parsed)) {
    return 72;
  }

  if (raw.endsWith("rem")) {
    const fontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return parsed * fontSize;
  }

  return parsed;
}

function writeFilterToUrl(filter: ProjectFilterId) {
  const url = new URL(window.location.href);

  if (filter === "all") {
    url.searchParams.delete("type");
  } else {
    url.searchParams.set("type", filter);
  }

  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

type ProjectsIndexProps = {
  projects: ProjectEntry[];
  initialFilter?: ProjectFilterId;
};

export function ProjectsIndex({ projects, initialFilter = "all" }: ProjectsIndexProps) {
  const [view, setView] = useState<IndexView>("list");
  const [filter, setFilter] = useState<ProjectFilterId>(initialFilter);
  const [exitingView, setExitingView] = useState<IndexView | null>(null);
  const [pendingView, setPendingView] = useState<IndexView | null>(null);
  const [entered, setEntered] = useState(false);
  const [layoutEpoch, setLayoutEpoch] = useState(0);
  const pendingViewRef = useRef<IndexView | null>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [filterMotion, setFilterMotion] = useState(false);
  const [toolbarFaded, setToolbarFaded] = useState(false);
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const [previewIntroDone, setPreviewIntroDone] = useState(false);
  const [activeHighlightPending, setActiveHighlightPending] = useState(true);
  const [listPinActive, setListPinActive] = useState(true);
  const [filterPanelBox, setFilterPanelBox] = useState({ top: 0, left: 0 });
  const headerRef = useRef<HTMLElement | null>(null);
  const filterFieldRef = useRef<HTMLDivElement | null>(null);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const pinListRef = useRef(false);
  const pinFrozenRef = useRef(false);
  const visibleProjects = useMemo(() => filterProjectsByType(projects, filter), [filter, projects]);
  const visibleSlugs = visibleProjects.map((project) => project.slug).join(" ");
  const filterCounts = projectFilterCounts(projects);
  const visibleFilters = PROJECT_FILTERS.filter((option) => option.id === "all" || filterCounts[option.id] > 0);
  const [activeSlug, setActiveSlug] = useState(visibleProjects[0]?.slug ?? projects[0]?.slug ?? "");
  const [desktopHovering, setDesktopHovering] = useState(false);
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const gridItemRefs = useRef(new Map<string, HTMLElement>());
  const previousGridRectsRef = useRef(new Map<string, DOMRect>());
  const tableRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const followPreviewRef = useRef<HTMLDivElement | null>(null);
  const dockedPreviewRef = useRef<HTMLAnchorElement | null>(null);
  const previewDismissedRef = useRef(false);
  const previewIntroPlayedRef = useRef(false);
  const previewDismissingRef = useRef(false);
  const releaseRowTopRef = useRef<number | null>(null);
  const filterMenuOpenRef = useRef(false);
  const previewSwipeRef = useRef<{
    id: number;
    x: number;
    y: number;
    t: number;
    dragging: boolean;
    suppressClick: boolean;
  } | null>(null);
  const syncListFromPinRef = useRef<(progress?: number) => void>(() => {});
  const posRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const hasPointerPosRef = useRef(false);
  const rafRef = useRef(0);
  const activeSlugRef = useRef(activeSlug);
  activeSlugRef.current = activeSlug;
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServerSnapshot,
  );
  const isMobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, reducedMotionServerSnapshot);
  const hasMounted = useClientMounted();

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("is-work-index-route");

    return () => {
      html.classList.remove("is-work-index-route");
    };
  }, []);

  useEffect(() => {
    if (!hasMounted || reducedMotion) {
      return;
    }

    const videos = visibleProjects
      .slice(0, 2)
      .map((project) => project.thumbnail.desktop.video)
      .filter((src): src is string => Boolean(src))
      .map((src) => {
        const video = document.createElement("video");
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.preload = "auto";
        video.src = src;
        video.load();
        return video;
      });

    return () => {
      videos.forEach((video) => {
        video.removeAttribute("src");
        video.load();
      });
    };
  }, [hasMounted, reducedMotion, visibleProjects, visibleSlugs]);

  const viewOptions: ViewOption[] = [...desktopGridOptions, LIST_OPTION];
  const isList = view === "list";
  pinListRef.current = isMobile && isList && !previewDismissed;
  const pinList = pinListRef.current;
  previewDismissedRef.current = previewDismissed;
  filterMenuOpenRef.current = filterMenuOpen;
  const showFollowPreview = isList && !isMobile && desktopHovering;
  const showDockedPreview = isList && isMobile;
  const activeProject =
    visibleProjects.find((project) => project.slug === activeSlug) ?? visibleProjects[0];
  const activeMedia = activeProject ? previewSlot(activeProject, reducedMotion) : null;
  const [previewPrevious, setPreviewPrevious] = useState<ProjectEntry | null>(null);
  const previewSlugRef = useRef(activeProject?.slug ?? "");
  const previousMedia = previewPrevious ? previewSlot(previewPrevious, reducedMotion) : null;

  useLayoutEffect(() => {
    const slug = activeProject?.slug ?? "";
    if (!slug || slug === previewSlugRef.current) {
      return;
    }

    const previous =
      visibleProjects.find((project) => project.slug === previewSlugRef.current) ?? null;
    previewSlugRef.current = slug;
    setPreviewPrevious(previous);
    const timeout = window.setTimeout(() => {
      setPreviewPrevious(null);
    }, PREVIEW_CROSSFADE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeProject?.slug, visibleProjects]);

  const setRowNode = (slug: string, node: HTMLElement | null) => {
    if (node) {
      rowRefs.current.set(slug, node);
      return;
    }

    rowRefs.current.delete(slug);
  };

  const setGridItemNode = (slug: string, node: HTMLElement | null) => {
    if (node) {
      gridItemRefs.current.set(slug, node);
      return;
    }

    gridItemRefs.current.delete(slug);
  };

  const captureGridRects = () => {
    const rects = new Map<string, DOMRect>();

    visibleProjects.forEach((project) => {
      const node = gridItemRefs.current.get(project.slug);
      if (node) {
        rects.set(project.slug, node.getBoundingClientRect());
      }
    });

    return rects;
  };

  useLayoutEffect(() => {
    const previousRects = previousGridRectsRef.current;

    if (!previousRects.size || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      previousRects.clear();
      return;
    }

    visibleProjects.forEach((project) => {
      const node = gridItemRefs.current.get(project.slug);
      const previousRect = previousRects.get(project.slug);

      if (!node || !previousRect) {
        return;
      }

      const nextRect = node.getBoundingClientRect();
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      const scaleX = previousRect.width / nextRect.width;
      const scaleY = previousRect.height / nextRect.height;

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1 && Math.abs(scaleX - 1) < 0.01) {
        return;
      }

      node.animate(
        [
          {
            transformOrigin: "top left",
            transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`,
          },
          {
            transformOrigin: "top left",
            transform: "translate(0, 0) scale(1, 1)",
          },
        ],
        {
          duration: 420,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        },
      );
    });

    previousRects.clear();
  }, [view, visibleProjects, visibleSlugs]);

  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_MQ);
    const superWideQuery = window.matchMedia(SUPER_WIDE_QUERY);
    let restored = false;

    const syncViewport = () => {
      const mobile = mobileQuery.matches;
      const superWide = superWideQuery.matches;
      const viewport = { mobile, superWide };

      if (!mobile) {
        setFilterMenuOpen(false);
      }
      setView((currentView) => {
        const source = restored ? currentView : readProjectLayout().view;
        restored = true;
        const next = coerceProjectIndexView(source, viewport);
        if (next !== source) {
          writeProjectLayout(next === "list" ? { view: next } : { view: next, grid: next });
        }
        return next;
      });
    };

    syncViewport();

    mobileQuery.addEventListener("change", syncViewport);
    superWideQuery.addEventListener("change", syncViewport);

    return () => {
      mobileQuery.removeEventListener("change", syncViewport);
      superWideQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useLayoutEffect(() => {
    const node = dockedPreviewRef.current;
    if (node) {
      gsap.killTweensOf(node);
    }

    previewSwipeRef.current = null;
    if (view === "list") {
      previewDismissingRef.current = false;
      previewIntroPlayedRef.current = false;
      setPreviewIntroDone(false);
      setActiveHighlightPending(true);
      setPreviewDismissed(false);
    }
  }, [view]);

  useEffect(() => {
    if (isList) {
      return;
    }

    setDesktopHovering(false);
    hasPointerPosRef.current = false;
  }, [isList]);

  useEffect(() => {
    if (visibleProjects.some((project) => project.slug === activeSlug)) {
      return;
    }

    setActiveSlug(visibleProjects[0]?.slug ?? "");
    setDesktopHovering(false);
    hasPointerPosRef.current = false;
  }, [activeSlug, visibleProjects]);

  const dismissPreview = useCallback(() => {
    const node = dockedPreviewRef.current;
    if (!node || previewDismissedRef.current || previewDismissingRef.current) {
      return;
    }

    previewDismissingRef.current = true;
    const stage = pinRef.current;
    const track = tableRef.current?.querySelector<HTMLElement>('[role="list"]');
    const toolbarHeight = headerRef.current?.getBoundingClientRect().height ?? 48;
    const reserve = Math.max(
      node.getBoundingClientRect().height + 24,
      (stage?.getBoundingClientRect().height ?? 0) - toolbarHeight - (track?.scrollHeight ?? 0),
    );
    stage?.style.setProperty("--preview-reserve", `${reserve}px`);
    gsap.to(node, {
      x: node.getBoundingClientRect().width + 48,
      autoAlpha: 0,
      duration: reducedMotion ? 0.01 : 0.28,
      ease: "power2.in",
      overwrite: "auto",
      onComplete: () => {
        releaseRowTopRef.current =
          rowRefs.current.get(activeSlugRef.current)?.getBoundingClientRect().top ?? null;
        setPreviewDismissed(true);
        gsap.set(node, { x: 0 });
      },
    });
  }, [reducedMotion]);

  useEffect(() => {
    if (!isList || !isMobile || !hasMounted || previewDismissed) {
      setListPinActive(false);
      return;
    }

    registerGsapScrollTrigger();

    const stage = pinRef.current;
    const list = tableRef.current;
    const rowsBySlug = rowRefs.current;
    const rows = visibleProjects
      .map((project) => rowsBySlug.get(project.slug))
      .filter((node): node is HTMLElement => Boolean(node));

    if (!stage || rows.length === 0) {
      return;
    }

    const slugs = visibleProjects.map((project) => project.slug);
    const lastIndex = Math.max(0, slugs.length - 1);
    const clampIndex = gsap.utils.clamp(0, lastIndex);
    const listTrack = () => list?.querySelector<HTMLElement>('[role="list"]') ?? null;
    const paging = { locked: false };
    let currentIndex = clampIndex(Math.max(0, slugs.indexOf(activeSlugRef.current)));

    const applyStageSize = () => {
      if (stage?.style.height) {
        stage.style.height = "";
      }
    };

    const applyIndex = (index: number, animate = true) => {
      if (pinFrozenRef.current || isBodyScrollLocked()) {
        return;
      }

      currentIndex = clampIndex(index);
      const slug = slugs[currentIndex];
      if (slug && activeSlugRef.current !== slug) {
        setActiveSlug(slug);
      }

      const track = listTrack();
      if (!list || !track) {
        return;
      }

      const toolbarH = Math.round(headerRef.current?.getBoundingClientRect().height ?? 48);
      const previewNode = dockedPreviewRef.current;
      const previewReserve = Math.round((previewNode?.getBoundingClientRect().height ?? 148) + 24);
      const available = Math.max(
        96,
        window.innerHeight - headerHeightPx() - toolbarH - previewReserve,
      );
      const overflow = Math.max(0, track.scrollHeight - available);
      if (overflow <= 8) {
        gsap.set(track, { y: 0 });
        return;
      }

      const row = rows[currentIndex] ?? rows[0];
      const y = gsap.utils.clamp(0, overflow, row.offsetTop);
      if (!animate || reducedMotion) {
        gsap.set(track, { y: -y });
        return;
      }

      gsap.to(track, { y: -y, duration: LIST_PAGE_LOCK_S, ease: "power2.inOut", overwrite: "auto" });
    };

    const goBy = (delta: number) => {
      if (paging.locked || pinFrozenRef.current || isBodyScrollLocked() || filterMenuOpenRef.current) {
        return;
      }

      const next = clampIndex(currentIndex + delta);
      if (next === currentIndex) {
        if (delta > 0 && currentIndex === lastIndex) {
          paging.locked = true;
          dismissPreview();
        }
        return;
      }

      paging.locked = true;
      applyIndex(next, true);
      gsap.delayedCall(reducedMotion ? 0.05 : LIST_PAGE_LOCK_S, () => {
        paging.locked = false;
      });
    };

    syncListFromPinRef.current = () => {
      applyIndex(currentIndex, false);
    };

    applyStageSize();
    applyIndex(currentIndex, false);
    setListPinActive(true);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        id: "work-list-pin",
        trigger: stage,
        start: () => `top ${headerHeightPx()}px`,
        end: "max",
        pin: true,
        pinSpacing: false,
        invalidateOnRefresh: true,
        onRefresh: (self) => {
          if (pinFrozenRef.current || isBodyScrollLocked()) {
            return;
          }

          applyStageSize();
          setListPinActive(self.isActive);
          if (self.isActive) {
            applyIndex(currentIndex, false);
          }
        },
        onToggle: (self) => {
          if (pinFrozenRef.current || isBodyScrollLocked()) {
            return;
          }

          setListPinActive(self.isActive);
          if (self.isActive) {
            applyIndex(currentIndex, false);
          }
        },
      });
    }, pinRef);

    const gesture = { x: 0, y: 0, active: false };
    const isPagingIgnoreTarget = (eventTarget: EventTarget | null) => {
      if (!(eventTarget instanceof Element)) {
        return false;
      }

      return Boolean(
        eventTarget.closest('[data-docked="true"]') ||
          eventTarget.closest("button") ||
          eventTarget.closest('[role="listbox"]') ||
          eventTarget.closest("[data-app-navbar='true']"),
      );
    };

    const onWheel = (event: WheelEvent) => {
      if (isPagingIgnoreTarget(event.target) || pinFrozenRef.current || isBodyScrollLocked()) {
        return;
      }

      event.preventDefault();
      goBy(event.deltaY > 0 ? 1 : -1);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || isPagingIgnoreTarget(event.target)) {
        gesture.active = false;
        return;
      }

      gesture.active = true;
      gesture.x = event.touches[0].clientX;
      gesture.y = event.touches[0].clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!gesture.active || event.touches.length !== 1) {
        return;
      }

      const dy = event.touches[0].clientY - gesture.y;
      const dx = event.touches[0].clientX - gesture.x;
      if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) {
        event.preventDefault();
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!gesture.active || event.changedTouches.length === 0) {
        gesture.active = false;
        return;
      }

      const dy = event.changedTouches[0].clientY - gesture.y;
      const dx = event.changedTouches[0].clientX - gesture.x;
      gesture.active = false;

      if (Math.abs(dy) < 36 || Math.abs(dy) < Math.abs(dx)) {
        return;
      }

      goBy(dy < 0 ? 1 : -1);
    };

    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchmove", onTouchMove, { passive: false });
    stage.addEventListener("touchend", onTouchEnd, { passive: true });

    const frame = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      getLenis()?.resize();
    });

    return () => {
      const shouldRelease = previewDismissedRef.current;
      const slug = activeSlugRef.current;
      const row = rowsBySlug.get(slug);
      const rowTop = releaseRowTopRef.current ?? row?.getBoundingClientRect().top ?? 0;
      releaseRowTopRef.current = null;
      window.cancelAnimationFrame(frame);
      syncListFromPinRef.current = () => {};
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchend", onTouchEnd);
      const track = listTrack();
      if (track) {
        gsap.set(track, { clearProps: "transform" });
      }
      applyStageSize();
      ctx.revert();

      if (!shouldRelease) {
        return;
      }

      window.requestAnimationFrame(() => {
        const node = rowsBySlug.get(slug);
        const top =
          window.scrollY +
          (node?.getBoundingClientRect().top ?? rowTop) -
          rowTop;
        const lenis = getLenis();
        lenis?.resize();
        if (lenis) {
          lenis.scrollTo(Math.max(0, top), { immediate: true, force: true });
        } else {
          window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "auto" });
        }
        ScrollTrigger.refresh();
      });
    };
  }, [dismissPreview, hasMounted, isList, isMobile, previewDismissed, reducedMotion, visibleProjects, visibleSlugs]);

  useEffect(() => {
    if (!isList || !isMobile || !hasMounted) {
      return;
    }

    const paused: ReturnType<typeof ScrollTrigger.getAll> = [];

    return onBodyScrollLock({
      beforeLock() {
        registerGsapScrollTrigger();
        pinFrozenRef.current = true;
        paused.length = 0;
        ScrollTrigger.getAll().forEach((trigger) => {
          trigger.disable(false);
          paused.push(trigger);
        });
      },
      afterUnlock() {
        paused.splice(0).forEach((trigger) => trigger.enable());
        window.requestAnimationFrame(() => {
          pinFrozenRef.current = false;
          syncListFromPinRef.current();
        });
      },
    });
  }, [hasMounted, isList, isMobile]);

  useEffect(() => {
    if (!pinList) {
      return;
    }

    syncListFromPinRef.current();
  }, [pinList, previewDismissed]);

  useEffect(() => {
    if (!isMobile || !hasMounted || isList) {
      setToolbarFaded(false);
      return;
    }

    registerGsapScrollTrigger();
    setToolbarFaded(false);

    const lastSlug = visibleProjects[visibleProjects.length - 1]?.slug;
    const lastNode = lastSlug
      ? isList
        ? rowRefs.current.get(lastSlug)
        : gridItemRefs.current.get(lastSlug)
      : null;

    if (!lastNode) {
      return;
    }

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        id: "work-toolbar-fade",
        trigger: lastNode,
        start: () => `top ${headerHeightPx() + 8}px`,
        end: "max",
        invalidateOnRefresh: true,
        onToggle: (self) => {
          const shouldFade = self.isActive && self.scroll() > 80;
          setToolbarFaded(shouldFade);
          if (shouldFade) {
            setFilterMenuOpen(false);
          }
        },
      });
    });

    const frame = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      ctx.revert();
    };
  }, [hasMounted, isList, isMobile, view, visibleProjects, visibleSlugs]);

  useEffect(() => {
    if (!isList || !isMobile) {
      return;
    }

    registerGsapScrollTrigger();
    ScrollTrigger.refresh();
  }, [isList, isMobile]);

  useLayoutEffect(() => {
    if (!hasMounted || !showDockedPreview || previewDismissed) {
      return;
    }

    const node = dockedPreviewRef.current;
    if (!node) {
      return;
    }

    if (previewIntroPlayedRef.current) {
      gsap.set(node, { x: 0, xPercent: 0, autoAlpha: 1 });
    }

    const release = (event: PointerEvent) => {
      const swipe = previewSwipeRef.current;
      if (!swipe || swipe.id !== event.pointerId) {
        return;
      }

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);

      try {
        if (node.hasPointerCapture(event.pointerId)) {
          node.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Synthetic or already-released pointers can throw.
      }

      node.removeAttribute("data-dragging");

      const dx = event.clientX - swipe.x;
      const dy = event.clientY - swipe.y;
      const dt = Math.max(16, performance.now() - swipe.t);
      const velocity = dx / dt;
      const width = node.getBoundingClientRect().width;
      const horizontal = swipe.dragging || Math.abs(dx) >= Math.abs(dy);
      const shouldDismiss =
        horizontal &&
        (dx > width * PREVIEW_SWIPE_RATIO || velocity > PREVIEW_SWIPE_VELOCITY);

      if (!swipe.dragging && !shouldDismiss) {
        previewSwipeRef.current = null;
        return;
      }

      swipe.suppressClick = true;
      swipe.dragging = false;

      if (shouldDismiss) {
        dismissPreview();
        return;
      }

      gsap.to(node, {
        x: 0,
        duration: reducedMotion ? 0.01 : 0.28,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || previewDismissedRef.current || previewDismissingRef.current) {
        return;
      }

      event.stopPropagation();
      gsap.killTweensOf(node);
      gsap.set(node, { xPercent: 0 });
      previewSwipeRef.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        t: performance.now(),
        dragging: false,
        suppressClick: false,
      };
      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);
    };

    const onPointerMove = (event: PointerEvent) => {
      const swipe = previewSwipeRef.current;
      if (!swipe || swipe.id !== event.pointerId) {
        return;
      }

      const dx = event.clientX - swipe.x;
      const dy = event.clientY - swipe.y;

      if (!swipe.dragging) {
        if (Math.abs(dx) < PREVIEW_SWIPE_LOCK && Math.abs(dy) < PREVIEW_SWIPE_LOCK) {
          return;
        }

        if (Math.abs(dy) >= Math.abs(dx)) {
          previewSwipeRef.current = null;
          return;
        }

        swipe.dragging = true;
        swipe.t = performance.now();
        try {
          node.setPointerCapture(event.pointerId);
        } catch {
          // Capture is optional; window listeners keep the gesture.
        }
        node.setAttribute("data-dragging", "true");
      }

      event.preventDefault();
      event.stopPropagation();
      gsap.set(node, { x: Math.max(0, dx) });
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!previewSwipeRef.current?.suppressClick) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      previewSwipeRef.current.suppressClick = false;
      previewSwipeRef.current = null;
    };

    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("click", onClickCapture, true);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("click", onClickCapture, true);
    };
  }, [dismissPreview, hasMounted, previewDismissed, reducedMotion, showDockedPreview]);

  useEffect(() => {
    if (!hasMounted || !showDockedPreview || previewDismissed || previewIntroDone) {
      return;
    }

    const finish = () => {
      previewIntroPlayedRef.current = true;
      setPreviewIntroDone(true);
      const node = dockedPreviewRef.current;
      if (node) {
        gsap.set(node, { x: 0, xPercent: 0, autoAlpha: 1 });
      }
    };

    if (reducedMotion) {
      finish();
      return;
    }

    const delayMs =
      Math.min(Math.max(visibleProjects.length - 1, 0), VIEW_ENTER_STAGGER_CAP) * VIEW_INDEX_STAGGER_MS +
      PREVIEW_INTRO_TAIL_MS +
      620;
    const timeout = window.setTimeout(finish, delayMs);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    hasMounted,
    previewDismissed,
    previewIntroDone,
    reducedMotion,
    showDockedPreview,
    visibleProjects.length,
  ]);

  useEffect(() => {
    if (!previewIntroDone || previewDismissed || !isList || !isMobile) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setActiveHighlightPending(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isList, isMobile, previewDismissed, previewIntroDone]);

  const applyPreviewTransform = useCallback(() => {
    const node = followPreviewRef.current;
    if (!node) {
      return;
    }

    node.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;
  }, []);

  const tickPreview = useCallback(() => {
    const lerp = reducedMotion ? 1 : PREVIEW_LERP;
    posRef.current.x += (targetRef.current.x - posRef.current.x) * lerp;
    posRef.current.y += (targetRef.current.y - posRef.current.y) * lerp;
    applyPreviewTransform();

    const settled =
      Math.abs(targetRef.current.x - posRef.current.x) < 0.4 &&
      Math.abs(targetRef.current.y - posRef.current.y) < 0.4;

    if (settled) {
      rafRef.current = 0;
      return;
    }

    // eslint-disable-next-line react-hooks/immutability -- Intentional self-scheduling animation loop.
    rafRef.current = window.requestAnimationFrame(tickPreview);
  }, [applyPreviewTransform, reducedMotion]);

  const movePreviewToward = useCallback(
    (clientX: number, clientY: number) => {
      const node = followPreviewRef.current;
      const width = node?.offsetWidth ?? 560;
      const height = node?.offsetHeight ?? 300;
      const maxX = Math.max(PREVIEW_VIEWPORT_PAD, window.innerWidth - width - PREVIEW_VIEWPORT_PAD);
      const maxY = Math.max(headerHeightPx(), window.innerHeight - height - PREVIEW_VIEWPORT_PAD);
      const x = Math.min(Math.max(PREVIEW_VIEWPORT_PAD, clientX + PREVIEW_CURSOR_OFFSET), maxX);
      const y = Math.min(Math.max(headerHeightPx(), clientY + PREVIEW_CURSOR_OFFSET), maxY);

      targetRef.current = { x, y };

      if (!hasPointerPosRef.current || reducedMotion) {
        hasPointerPosRef.current = true;
        posRef.current = { x, y };
        applyPreviewTransform();
        return;
      }

      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(tickPreview);
      }
    },
    [applyPreviewTransform, reducedMotion, tickPreview],
  );

  useLayoutEffect(() => {
    if (!showFollowPreview) {
      return;
    }

    applyPreviewTransform();
  }, [applyPreviewTransform, showFollowPreview]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const activateRow = (slug: string) => {
    setActiveSlug(slug);
    if (!isMobile) {
      setDesktopHovering(true);
    }
  };

  const handleDockedPreviewClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!previewSwipeRef.current?.suppressClick) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    previewSwipeRef.current.suppressClick = false;
    previewSwipeRef.current = null;
  };

  const handleTablePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isMobile || !isList || event.pointerType !== "mouse") {
      return;
    }

    movePreviewToward(event.clientX, event.clientY);
  };

  const handleTablePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isMobile || event.pointerType !== "mouse") {
      return;
    }

    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) {
      return;
    }

    setDesktopHovering(false);
    hasPointerPosRef.current = false;
  };

  const handleTableBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    if (isMobile) {
      return;
    }

    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) {
      return;
    }

    setDesktopHovering(false);
  };

  const handleRowFocus = (slug: string) => {
    if (isMobile) {
      return;
    }

    activateRow(slug);

    const node = rowRefs.current.get(slug);
    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    movePreviewToward(rect.right - 48, rect.top + rect.height / 2);
  };

  const selectedView = pendingView ?? view;
  const showList = isList || exitingView === "list";
  const showGrid = isGridView(view) || (exitingView !== null && isGridView(exitingView));
  const liveGridView = isGridView(view) ? view : exitingView !== null && isGridView(exitingView) ? exitingView : "wide";

  const requestIndexView = (next: IndexView) => {
    if (next === selectedView) {
      return;
    }

    writeProjectLayout(isGridView(next) ? { view: next, grid: next } : { view: next });

    if (isGridView(view) && isGridView(next) && exitingView === "list") {
      setExitingView(null);
      previousGridRectsRef.current = captureGridRects();
      startTransition(() => {
        setView(next);
      });
      return;
    }

    if (isGridView(view) && isGridView(next) && !exitingView) {
      previousGridRectsRef.current = captureGridRects();
      startTransition(() => {
        setView(next);
      });
      return;
    }

    if (reducedMotion) {
      pendingViewRef.current = null;
      setPendingView(null);
      setExitingView(null);
      setFilterMotion(false);
      setEntered(true);
      setView(next);
      return;
    }

    if (exitingView) {
      pendingViewRef.current = next;
      setPendingView(next);
      return;
    }

    pendingViewRef.current = null;
    setPendingView(null);
    setFilterMotion(false);
    setEntered(false);
    setLayoutEpoch((epoch) => epoch + 1);

    if (isList && isMobile) {
      registerGsapScrollTrigger();
      ScrollTrigger.getById("work-list-pin")?.kill();
      setListPinActive(false);
    }

    setExitingView(view);
    setView(next);
  };

  useLayoutEffect(() => {
    if (!exitingView) {
      return;
    }

    const lenis = getLenis();
    lenis?.resize();

    const toolbar = headerRef.current;
    if (!toolbar) {
      return;
    }

    const delta = toolbar.getBoundingClientRect().top - headerHeightPx();
    if (Math.abs(delta) < 1) {
      return;
    }

    const nextY = Math.max(0, window.scrollY + delta);
    window.scrollTo({ top: nextY, left: 0, behavior: "auto" });
    lenis?.scrollTo(nextY, { immediate: true, force: true });
  }, [exitingView, view]);

  useEffect(() => {
    if (!exitingView) {
      return;
    }

    const id = window.setTimeout(() => {
      const next = pendingViewRef.current;
      setExitingView(null);
      setPendingView(null);
      pendingViewRef.current = null;

      if (next && next !== view) {
        setEntered(false);
        setLayoutEpoch((epoch) => epoch + 1);
        setView(next);
      }
    }, VIEW_LEAVE_MS);

    return () => window.clearTimeout(id);
  }, [exitingView, view]);

  useEffect(() => {
    if (exitingView || reducedMotion) {
      return;
    }

    const id = window.setTimeout(() => {
      setEntered(true);
    }, VIEW_ENTER_DONE_MS);

    return () => window.clearTimeout(id);
  }, [view, layoutEpoch, exitingView, reducedMotion]);

  const applyFilter = (next: ProjectFilterId) => {
    if (next !== filter) {
      setFilterMotion(true);
      setFilter(next);
      writeFilterToUrl(next);
    }

    setFilterMenuOpen(false);
  };

  useLayoutEffect(() => {
    if (!filterMotion) {
      return;
    }

    const items = isList
      ? tableRef.current?.querySelectorAll(`.${styles.row}`)
      : gridRef.current?.querySelectorAll(`.${styles.staggerItem}`);

    if (!items?.length) {
      setFilterMotion(false);
      setEntered(true);
      return;
    }

    if (reducedMotion) {
      gsap.set(items, { autoAlpha: 1, clearProps: "transform" });
      setFilterMotion(false);
      setEntered(true);
      return;
    }

    const tween = gsap.fromTo(
      items,
      { autoAlpha: 0, y: 10 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.28,
        ease: "power2.out",
        stagger: 0.04,
        overwrite: true,
        onComplete: () => {
          gsap.set(items, { clearProps: "transform" });
          setFilterMotion(false);
          setEntered(true);
        },
      },
    );

    return () => {
      tween.kill();
      gsap.set(items, { autoAlpha: 1, clearProps: "transform" });
    };
  }, [filterMotion, isList, reducedMotion, visibleSlugs]);

  useEffect(() => {
    if (!filterMenuOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      const field = filterFieldRef.current;
      const panel = filterPanelRef.current;
      if ((field && field.contains(target)) || (panel && panel.contains(target))) {
        return;
      }

      setFilterMenuOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFilterMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [filterMenuOpen]);

  const syncFilterPanelBox = () => {
    const trigger = filterFieldRef.current?.querySelector("button");
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    setFilterPanelBox({
      top: Math.round(rect.bottom + 6),
      left: Math.round(Math.max(12, rect.left - 18)),
    });
  };

  useLayoutEffect(() => {
    if (!filterMenuOpen) {
      return;
    }

    syncFilterPanelBox();

    const onMove = () => {
      syncFilterPanelBox();
    };

    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { passive: true });
    const unsubscribeLenis = getLenis()?.on("scroll", onMove);

    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
      unsubscribeLenis?.();
    };
  }, [filterMenuOpen]);

  const filterTriggerLabel = filter === "all" ? "Filter" : projectFilterLabel(filter);

  const previewIntroDelayMs =
    Math.min(Math.max(visibleProjects.length - 1, 0), VIEW_ENTER_STAGGER_CAP) *
      VIEW_INDEX_STAGGER_MS +
    PREVIEW_INTRO_TAIL_MS;

  const toolbar = (
      <header
        ref={headerRef}
        className={styles.header}
        data-filter-open={filterMenuOpen ? "true" : undefined}
        data-faded={toolbarFaded ? "true" : undefined}
      >
        <h1 className="sr-only">Work</h1>
        <div ref={filterFieldRef} className={styles.filterField}>
          <button
            type="button"
            className={styles.filterTrigger}
            aria-haspopup="listbox"
            aria-expanded={filterMenuOpen}
            aria-label={filter === "all" ? "Filter projects" : `Filter: ${filterTriggerLabel}`}
            data-open={filterMenuOpen ? "true" : undefined}
            data-selected={filter !== "all" ? "true" : undefined}
            onClick={() => {
              if (toolbarFaded) {
                return;
              }

              setFilterMenuOpen((open) => {
                if (!open) {
                  syncFilterPanelBox();
                }

                return !open;
              });
            }}
          >
            <span className={styles.filterTriggerLabel}>{filterTriggerLabel}</span>
            <span className={styles.filterPlus} aria-hidden="true">
              <span className={styles.filterPlusBar} />
              <span className={styles.filterPlusBar} />
            </span>
          </button>
        </div>
        <div className={styles.filters} role="radiogroup" aria-label="Project type">
          {visibleFilters.map((option) => {
            const isActive = option.id === filter;

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                className={styles.filter}
                aria-checked={isActive}
                data-active={isActive}
                onClick={() => applyFilter(option.id)}
              >
                <span className={styles.filterLabel}>{option.label}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.viewSwitch} role="group" aria-label="Project layout">
          {viewOptions.map((option) => {
            const isActive = option.view === selectedView;

            return (
              <button
                key={option.view}
                type="button"
                className={styles.viewButton}
                data-layout={option.view}
                data-active={isActive}
                aria-pressed={isActive}
                aria-label={option.label}
                onClick={() => requestIndexView(option.view)}
              >
                <span className={styles.viewButtonFrame} aria-hidden="true">
                  <span
                    className={styles.viewGlyph}
                    data-variant={option.variant}
                    style={
                      {
                        "--icon-columns": option.columns,
                        "--icon-rows": option.rows,
                        "--icon-width-ratio": option.widthRatio,
                        "--icon-height-ratio": option.heightRatio,
                        "--icon-gap-ratio": option.gapRatio,
                      } as CSSProperties
                    }
                  >
                    {Array.from({ length: option.columns * option.rows }, (_, cellIndex) => (
                      <span key={`${option.view}-${cellIndex}`} className={styles.viewGlyphCell} />
                    ))}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </header>
  );

  return (
    <section
      className={`page-shell ${styles.page}`}
      data-work-index="true"
      data-crossfade={layoutEpoch > 0 ? "true" : undefined}
      data-entered={entered ? "true" : undefined}
      data-filter-motion={filterMotion ? "true" : undefined}
      data-list-layout={isList && !exitingView ? "true" : undefined}
      data-active-highlight-pending={activeHighlightPending && isList ? "true" : undefined}
      style={{ "--preview-intro-delay": `${previewIntroDelayMs / 1000}s` } as CSSProperties}
    >
      <div
        ref={pinRef}
        className={styles.pinStage}
        data-list-pin={pinList && listPinActive ? "true" : undefined}
        data-lenis-prevent={pinList && listPinActive ? "" : undefined}
      >
      {toolbar}
      {filterMenuOpen && hasMounted
        ? createPortal(
            <div
              ref={filterPanelRef}
              className={styles.filterPanel}
              role="listbox"
              aria-label="Project type"
              style={{ top: filterPanelBox.top, left: filterPanelBox.left }}
            >
              {visibleFilters.map((option) => {
                const isActive = option.id === filter;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    className={styles.filterOption}
                    aria-selected={isActive}
                    data-active={isActive}
                    onClick={() => applyFilter(option.id)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}

      {visibleProjects.length === 0 ? (
        <p className={styles.empty}>No projects in this type.</p>
      ) : (
        <div className={styles.indexBody}>
          {showList ? (
            <div
              key="list"
              ref={isList ? tableRef : undefined}
              className={styles.table}
              data-outgoing={!isList ? "true" : undefined}
              data-mobile-list={isMobile ? "true" : undefined}
              data-hovering={isList && desktopHovering ? "true" : undefined}
              onPointerMove={isList ? handleTablePointerMove : undefined}
              onPointerLeave={isList ? handleTablePointerLeave : undefined}
              onBlurCapture={isList ? handleTableBlur : undefined}
            >
              <div role="list" aria-label={`${projectFilterLabel(filter)} projects`}>
              {visibleProjects.map((project, index) => {
                const isActive = project.slug === activeSlug;

                return (
                  <IntentPrefetchLink
                    key={project.slug}
                    href={`/projects/${project.slug}`}
                    className={styles.row}
                    role="listitem"
                    style={{ "--item-index": Math.min(index, VIEW_ENTER_STAGGER_CAP) } as CSSProperties}
                    data-active={
                      isActive && (!isMobile || (pinList && listPinActive)) ? "true" : undefined
                    }
                    aria-label={`${project.title}, ${project.descriptor}`}
                    nativeNavigation
                    tabIndex={!isList ? -1 : undefined}
                    onPointerEnter={(event) => {
                      if (!isList || event.pointerType !== "mouse" || isMobile) {
                        return;
                      }

                      activateRow(project.slug);
                      movePreviewToward(event.clientX, event.clientY);
                    }}
                    onFocus={() => handleRowFocus(project.slug)}
                    ref={isList ? (node) => setRowNode(project.slug, node) : undefined}
                  >
                    <span className={styles.identity}>
                      <span className={styles.name}>{project.title}</span>
                      <span className={styles.descriptorMobile}>{project.descriptor}</span>
                    </span>
                    <span className={styles.descriptor}>{project.descriptor}</span>
                    <span className={styles.year}>{project.year}</span>
                  </IntentPrefetchLink>
                );
              })}
              </div>
            </div>
          ) : null}
          {showGrid ? (
            <div
              key="grid"
              ref={!isList ? gridRef : undefined}
              className={styles.grid}
              data-view={liveGridView}
              data-outgoing={isList ? "true" : undefined}
              aria-label={`${projectFilterLabel(filter)} projects`}
            >
              {visibleProjects.map((project, index) => (
                <div
                  key={project.slug}
                  className={styles.staggerItem}
                  style={{ "--item-index": Math.min(index, VIEW_ENTER_STAGGER_CAP) } as CSSProperties}
                >
                  <ProjectCard
                    project={project}
                    index={index}
                    immediate
                    visible
                    imagePreload={index === 0}
                    loading={index < 2 ? "eager" : "lazy"}
                    cardRef={!isList ? (node) => setGridItemNode(project.slug, node) : undefined}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
      </div>

      {hasMounted &&
      isMobile &&
      (isList || exitingView === "list") &&
      activeProject &&
      activeMedia
        ? createPortal(
            <IntentPrefetchLink
              key={isList ? "docked-list" : "docked-exit"}
              ref={dockedPreviewRef}
              href={`/projects/${activeProject.slug}`}
              className={styles.preview}
              data-docked="true"
              data-intro={!previewIntroDone && !previewDismissed ? "true" : undefined}
              data-outgoing={!isList ? "true" : undefined}
              data-hidden={previewDismissed ? "true" : undefined}
              aria-hidden={previewDismissed ? true : undefined}
              tabIndex={previewDismissed ? -1 : undefined}
              aria-label={`${activeProject.title}, explore project`}
              nativeNavigation
              onClick={handleDockedPreviewClick}
              style={
                {
                  "--preview-w": String(activeProject.thumbnail.desktop.width),
                  "--preview-h": String(activeProject.thumbnail.desktop.height),
                  "--preview-intro-delay": `${previewIntroDelayMs / 1000}s`,
                } as CSSProperties
              }
            >
              {previewIntroDone && !previewDismissed ? (
                <span className={styles.previewHint} aria-hidden="true">
                  <span className={styles.previewHintFrost} />
                  <span className={styles.previewHintBlend}>You can swipe right to hide the preview&nbsp; →</span>
                </span>
              ) : null}
              <span className={styles.previewFrame}>
                {previewPrevious && previousMedia ? (
                  <span className={styles.previewLayer} data-layer="out">
                    <ProjectMedia
                      media={previousMedia}
                      alt=""
                      className={styles.previewMedia}
                      fill
                      fit="contain"
                      sizes={PROJECT_INDEX_PREVIEW_IMAGE_SIZES}
                      loading="eager"
                      reveal="instant"
                    />
                  </span>
                ) : null}
                <span className={styles.previewLayer} data-layer={previewPrevious ? "in" : "static"}>
                  <ProjectMedia
                    media={activeMedia}
                    alt=""
                    className={styles.previewMedia}
                    fill
                    fit="contain"
                    sizes={PROJECT_INDEX_PREVIEW_IMAGE_SIZES}
                    imagePreload
                    loading="eager"
                    reveal="instant"
                  />
                </span>
              </span>
            </IntentPrefetchLink>,
            document.body,
          )
        : null}

      {hasMounted && showFollowPreview && activeProject && activeMedia
        ? createPortal(
            <div
              ref={followPreviewRef}
              className={styles.preview}
              data-docked="false"
              aria-hidden="true"
              style={
                {
                  "--preview-w": String(activeProject.thumbnail.desktop.width),
                  "--preview-h": String(activeProject.thumbnail.desktop.height),
                } as CSSProperties
              }
            >
              <ProjectMedia
                media={activeMedia}
                alt=""
                className={styles.previewMedia}
                fill
                fit="contain"
                sizes={PROJECT_INDEX_PREVIEW_IMAGE_SIZES}
                imagePreload
                loading="eager"
                reveal="instant"
              />
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
