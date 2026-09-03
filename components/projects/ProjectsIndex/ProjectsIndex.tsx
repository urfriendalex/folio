"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal, flushSync } from "react-dom";
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
import { useClientMounted } from "@/lib/useClientMounted";
import { thumbnailToMediaSlot } from "@/lib/projectMedia";
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

const mobileGridOptions: ViewOption[] = [
  {
    view: "wide",
    label: "One column grid",
    columns: 1,
    rows: 2,
    variant: "grid",
    widthRatio: 0.5,
    heightRatio: 0.48,
    gapRatio: 0.09,
  },
  {
    view: "regular",
    label: "Two column grid",
    columns: 2,
    rows: 2,
    variant: "grid",
    widthRatio: 0.5,
    heightRatio: 0.48,
    gapRatio: 0.092,
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
const LIST_PIN_VIEWPORT_STEP = 0.42;
const LIST_PIN_END_PAD = 0.24;
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

function projectViewTransitionName(slug: string) {
  return `work-${slug}`;
}

const WORK_TOOLBAR_SLOT = "[data-work-toolbar-slot]";
const WORK_TOOLBAR_STICK_SLACK_PX = 8;

function syncWorkToolbarBlur(stuck: boolean, toolbarHeight: number) {
  const html = document.documentElement;

  if (!stuck) {
    html.classList.remove("is-work-toolbar-stuck");
    html.style.removeProperty("--work-toolbar-blur-extra");
    return;
  }

  html.style.setProperty("--work-toolbar-blur-extra", `${Math.round(Math.max(toolbarHeight, 0))}px`);
  html.classList.add("is-work-toolbar-stuck");
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

function switchIndexView(apply: (didTransition: boolean) => void, reducedMotion: boolean) {
  const canTransition =
    !reducedMotion && typeof document.startViewTransition === "function";

  if (!canTransition) {
    apply(false);
    return;
  }

  const root = document.documentElement;
  if (root.classList.contains("work-index-vt")) {
    apply(true);
    return;
  }

  root.classList.add("work-index-vt");

  try {
    const transition = document.startViewTransition(() => {
      flushSync(() => apply(true));
    });
    void transition.finished.finally(() => {
      root.classList.remove("work-index-vt");
    });
  } catch {
    root.classList.remove("work-index-vt");
    apply(false);
  }
}

type ProjectsIndexProps = {
  projects: ProjectEntry[];
  initialFilter?: ProjectFilterId;
};

export function ProjectsIndex({ projects, initialFilter = "all" }: ProjectsIndexProps) {
  const [view, setView] = useState<IndexView>("list");
  const [filter, setFilter] = useState<ProjectFilterId>(initialFilter);
  const [isSuperWide, setIsSuperWide] = useState(false);
  const [pageEnter, setPageEnter] = useState(false);
  const [usedViewTransition, setUsedViewTransition] = useState(false);
  const [toolbarStuck, setToolbarStuck] = useState(false);
  const [toolbarSlot, setToolbarSlot] = useState<Element | null>(null);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [filterMotion, setFilterMotion] = useState(false);
  const [toolbarFaded, setToolbarFaded] = useState(false);
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const [listPinActive, setListPinActive] = useState(true);
  const [filterPanelBox, setFilterPanelBox] = useState({ top: 0, left: 0 });
  const headerRef = useRef<HTMLElement | null>(null);
  const filterFieldRef = useRef<HTMLDivElement | null>(null);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const stickSentinelRef = useRef<HTMLDivElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const pinListRef = useRef(false);
  const toolbarStuckRef = useRef(false);
  const visibleProjects = filterProjectsByType(projects, filter);
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
  const previewSwipeRef = useRef<{
    id: number;
    x: number;
    y: number;
    t: number;
    dragging: boolean;
    suppressClick: boolean;
  } | null>(null);
  const syncListFromPinRef = useRef<() => void>(() => {});
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
  const gridOptions = isMobile
    ? mobileGridOptions
    : isSuperWide
      ? desktopGridOptions.filter((option) => option.view !== "stack")
      : desktopGridOptions;
  const viewOptions: ViewOption[] = [LIST_OPTION, ...gridOptions];
  const isList = view === "list";
  pinListRef.current = isMobile && isList;
  const pinList = pinListRef.current;
  previewDismissedRef.current = previewDismissed;
  const showFollowPreview = isList && !isMobile && desktopHovering;
  const showDockedPreview = isList && isMobile;
  const activeProject =
    visibleProjects.find((project) => project.slug === activeSlug) ?? visibleProjects[0];
  const activeMedia = activeProject ? previewSlot(activeProject, reducedMotion) : null;

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
  }, [view, visibleSlugs]);

  useEffect(() => {
    setToolbarSlot(document.querySelector(WORK_TOOLBAR_SLOT));
  }, []);

  useLayoutEffect(() => {
    const node = headerRef.current;

    if (!node) {
      return;
    }

    const applyHeight = () => {
      const next = Math.round(node.getBoundingClientRect().height);
      setToolbarHeight((current) => (current === next ? current : next));
    };

    applyHeight();

    const observer = new ResizeObserver(applyHeight);
    observer.observe(node);

    return () => observer.disconnect();
  }, [isMobile, toolbarStuck]);

  useEffect(() => {
    const sentinel = stickSentinelRef.current;

    if (!sentinel) {
      return;
    }

    const updateStuck = () => {
      if (pinListRef.current) {
        if (toolbarStuckRef.current) {
          toolbarStuckRef.current = false;
          setToolbarStuck(false);
        }
        return;
      }

      const line = headerHeightPx();
      const top = sentinel.getBoundingClientRect().top;
      const next = toolbarStuckRef.current
        ? top < line + WORK_TOOLBAR_STICK_SLACK_PX
        : top < line;

      if (next === toolbarStuckRef.current) {
        return;
      }

      toolbarStuckRef.current = next;
      setToolbarStuck(next);
    };

    updateStuck();

    const lenis = getLenis();
    const unsubscribeLenis = lenis?.on("scroll", updateStuck);
    window.addEventListener("scroll", updateStuck, { passive: true });
    window.addEventListener("resize", updateStuck);

    return () => {
      unsubscribeLenis?.();
      window.removeEventListener("scroll", updateStuck);
      window.removeEventListener("resize", updateStuck);
    };
  }, []);

  useLayoutEffect(() => {
    const pinned = toolbarStuck && !toolbarFaded;
    syncWorkToolbarBlur(pinned, toolbarHeight);

    return () => {
      if (!pinned) {
        return;
      }

      syncWorkToolbarBlur(false, 0);
    };
  }, [toolbarFaded, toolbarHeight, toolbarStuck]);

  useEffect(() => {
    return () => {
      syncWorkToolbarBlur(false, 0);
    };
  }, []);

  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_MQ);
    const superWideQuery = window.matchMedia(SUPER_WIDE_QUERY);

    const syncViewport = () => {
      const mobile = mobileQuery.matches;
      const superWide = superWideQuery.matches;

      setIsSuperWide(superWide);
      if (!mobile) {
        setFilterMenuOpen(false);
      }
      setView((currentView) => {
        if (currentView === "stack" && (mobile || superWide)) {
          return "wide";
        }

        return currentView;
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

    setPreviewDismissed(false);
    previewSwipeRef.current = null;
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

  useEffect(() => {
    if (!isList || !isMobile || !hasMounted) {
      setListPinActive(false);
      return;
    }

    registerGsapScrollTrigger();

    const stage = pinRef.current;
    const list = tableRef.current;
    const rows = visibleProjects
      .map((project) => rowRefs.current.get(project.slug))
      .filter((node): node is HTMLElement => Boolean(node));

    if (!stage || rows.length === 0) {
      return;
    }

    const slugs = visibleProjects.map((project) => project.slug);
    const lastIndex = Math.max(0, slugs.length - 1);
    const mapIndex = gsap.utils.mapRange(0, 1, 0, lastIndex);
    const clampIndex = gsap.utils.clamp(0, lastIndex);
    const snapProgress = lastIndex === 0 ? () => 0 : gsap.utils.snap(1 / lastIndex);
    const listTrack = () => list?.querySelector<HTMLElement>('[role="list"]') ?? null;

    const pinMetrics = () => {
      const rowH = rows[0]?.offsetHeight ?? 72;
      const step = Math.max(rowH * 1.85, window.innerHeight * LIST_PIN_VIEWPORT_STEP);
      const travel = Math.max(step, lastIndex * step);
      const pad = window.innerHeight * LIST_PIN_END_PAD;
      return { travel, pad, ratio: travel / (travel + pad) };
    };

    const applyStageSize = (active: boolean) => {
      if (!stage) {
        return;
      }

      const next = active ? `${Math.max(0, window.innerHeight - headerHeightPx())}px` : "";
      if (stage.style.height !== next) {
        stage.style.height = next;
      }
    };

    const applyActive = (progress: number) => {
      const { ratio } = pinMetrics();
      const contentProgress = gsap.utils.clamp(0, 1, progress / Math.max(ratio, 0.001));
      const index = Math.round(clampIndex(mapIndex(contentProgress)));
      const slug = slugs[index];
      if (slug && activeSlugRef.current !== slug) {
        setActiveSlug(slug);
      }

      const track = listTrack();
      if (!list || !track) {
        return;
      }

      const toolbarH = Math.round(headerRef.current?.getBoundingClientRect().height ?? 48);
      const previewNode = dockedPreviewRef.current;
      const previewReserve = previewDismissedRef.current
        ? 16
        : Math.round((previewNode?.getBoundingClientRect().height ?? 148) + 24);
      const available = Math.max(
        96,
        window.innerHeight - headerHeightPx() - toolbarH - previewReserve,
      );
      const overflow = Math.max(0, track.scrollHeight - available);
      if (overflow <= 8) {
        gsap.set(track, { y: 0 });
        return;
      }

      const row = rows[index] ?? rows[0];
      const y = gsap.utils.clamp(0, overflow, row.offsetTop);
      gsap.to(track, { y: -y, duration: 0.32, ease: "power2.out", overwrite: "auto" });
    };

    syncListFromPinRef.current = () => {
      const current = ScrollTrigger.getById("work-list-pin");
      applyActive(current?.progress ?? 0);
    };

    applyStageSize(true);

    const slidePreview = (show: boolean, immediate = false) => {
      const preview = dockedPreviewRef.current;
      if (!preview || previewDismissedRef.current) {
        return;
      }

      gsap.killTweensOf(preview);
      gsap.set(preview, { x: 0, autoAlpha: 1 });

      if (immediate || reducedMotion) {
        gsap.set(preview, { xPercent: show ? 0 : 118 });
        return;
      }

      gsap.to(preview, {
        xPercent: show ? 0 : 118,
        duration: show ? 0.48 : 0.36,
        ease: show ? "power3.out" : "power2.in",
        overwrite: "auto",
      });
    };

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        id: "work-list-pin",
        trigger: stage,
        start: () => `top ${headerHeightPx()}px`,
        end: () => {
          const { travel, pad } = pinMetrics();
          return `+=${travel + pad}`;
        },
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
        snap:
          lastIndex === 0 || reducedMotion
            ? undefined
            : {
                snapTo: (value) => {
                  const { ratio } = pinMetrics();
                  if (value > ratio) {
                    return value;
                  }

                  return snapProgress(ratio <= 0 ? 0 : value / ratio) * ratio;
                },
                duration: { min: 0.16, max: 0.4 },
                delay: 0.05,
                ease: "power2.out",
              },
        onUpdate: (self) => {
          if (!self.isActive) {
            return;
          }

          applyActive(self.progress);
        },
        onRefresh: (self) => {
          applyStageSize(self.isActive);
          setListPinActive(self.isActive);
          if (self.isActive) {
            applyActive(self.progress);
            return;
          }

          const track = listTrack();
          if (track) {
            gsap.set(track, { y: 0 });
          }
          slidePreview(false, true);
        },
        onToggle: (self) => {
          applyStageSize(self.isActive);
          setListPinActive(self.isActive);
          const track = listTrack();
          if (!self.isActive && track) {
            gsap.set(track, { y: 0 });
          } else if (self.isActive) {
            applyActive(self.progress);
          }
        },
        onLeave: () => {
          slidePreview(false);
        },
        onEnterBack: () => {
          slidePreview(true);
        },
      });
    }, pinRef);

    const frame = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      getLenis()?.resize();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      syncListFromPinRef.current = () => {};
      const track = listTrack();
      if (track) {
        gsap.set(track, { clearProps: "transform" });
      }
      applyStageSize(false);
      ctx.revert();
    };
  }, [hasMounted, isList, isMobile, reducedMotion, visibleSlugs]);

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
  }, [hasMounted, isList, isMobile, visibleSlugs, visibleProjects.length]);

  useEffect(() => {
    if (!isList || !isMobile) {
      return;
    }

    registerGsapScrollTrigger();
    ScrollTrigger.refresh();
  }, [isList, isMobile, toolbarHeight, toolbarStuck]);

  useLayoutEffect(() => {
    if (!hasMounted || !isMobile || !isList) {
      setPageEnter(false);
      return;
    }

    const items = gsap.utils.toArray<HTMLElement>(
      tableRef.current?.querySelectorAll(`.${styles.row}`) ?? [],
    );
    const preview = previewDismissedRef.current ? null : dockedPreviewRef.current;
    const header = headerRef.current;
    const targets = [header, preview, ...items].filter((node): node is HTMLElement => Boolean(node));

    if (reducedMotion) {
      gsap.set(targets, { autoAlpha: 1, x: 0, xPercent: 0, y: 0, clearProps: "transform" });
      setPageEnter(false);
      return;
    }

    setPageEnter(true);

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: "power2.out" },
        onComplete: () => {
          setPageEnter(false);
          gsap.set(items, { clearProps: "transform" });
        },
      });

      if (header) {
        gsap.set(header, { autoAlpha: 0, y: 8 });
        timeline.to(header, { autoAlpha: 1, y: 0, duration: 0.28 }, 0);
      }

      if (items.length) {
        gsap.set(items, { autoAlpha: 0, y: 12 });
        timeline.to(items, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.042 }, 0.06);
      }

      if (preview) {
        gsap.set(preview, { autoAlpha: 0, xPercent: 118 });
        timeline.to(
          preview,
          { autoAlpha: 1, xPercent: 0, duration: 0.52, ease: "power3.out" },
          items.length ? ">-0.02" : 0.12,
        );
      }
    });

    return () => {
      ctx.revert();
      setPageEnter(false);
    };
  }, [hasMounted, isList, isMobile, reducedMotion]);

  useLayoutEffect(() => {
    if (!hasMounted || !showDockedPreview || previewDismissed) {
      return;
    }

    const node = dockedPreviewRef.current;
    if (!node) {
      return;
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
        gsap.to(node, {
          x: width + 48,
          autoAlpha: 0,
          duration: reducedMotion ? 0.01 : 0.28,
          ease: "power2.in",
          overwrite: "auto",
          onComplete: () => {
            setPreviewDismissed(true);
            gsap.set(node, { x: 0 });
          },
        });
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
      if (event.button !== 0 || previewDismissedRef.current) {
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
  }, [hasMounted, previewDismissed, reducedMotion, showDockedPreview]);

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
    activateRow(slug);

    if (isMobile) {
      return;
    }

    const node = rowRefs.current.get(slug);
    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    movePreviewToward(rect.right - 48, rect.top + rect.height / 2);
  };

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
      return;
    }

    if (reducedMotion) {
      gsap.set(items, { autoAlpha: 1, clearProps: "transform" });
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
        },
      },
    );

    return () => {
      tween.kill();
      gsap.set(items, { autoAlpha: 1, clearProps: "transform" });
    };
  }, [filterMotion, reducedMotion, visibleSlugs]);

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
      top: Math.round(rect.bottom - 2),
      left: Math.round(Math.max(12, rect.left - 11)),
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

  useLayoutEffect(() => {
    if (!filterMenuOpen) {
      return;
    }

    const options = gsap.utils.toArray<HTMLElement>(
      filterPanelRef.current?.querySelectorAll(`.${styles.filterOption}`) ?? [],
    );
    if (!options.length) {
      return;
    }

    if (reducedMotion) {
      gsap.set(options, { autoAlpha: 1, clearProps: "transform" });
      return;
    }

    const tween = gsap.fromTo(
      options,
      { autoAlpha: 0, y: 8 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.24,
        ease: "power2.out",
        stagger: { each: 0.045 },
        overwrite: true,
        immediateRender: true,
      },
    );

    return () => {
      tween.kill();
    };
  }, [filterMenuOpen, reducedMotion]);

  const filterTriggerLabel = filter === "all" ? "Filter" : projectFilterLabel(filter);

  const toolbar = (
      <header
        ref={headerRef}
        className={`${styles.header}${toolbarStuck ? ` ${styles.headerStuck}` : ""}`}
        data-stuck={toolbarStuck ? "true" : undefined}
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
            const isActive = option.view === view;

            return (
              <button
                key={option.view}
                type="button"
                className={styles.viewButton}
                data-layout={option.view}
                data-active={isActive}
                aria-pressed={isActive}
                aria-label={option.label}
                onClick={() => {
                  if (isActive) {
                    return;
                  }

                  if (isGridView(view) && isGridView(option.view)) {
                    previousGridRectsRef.current = captureGridRects();
                    startTransition(() => {
                      setView(option.view);
                    });
                    return;
                  }

                  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                  switchIndexView((didTransition) => {
                    if (didTransition) {
                      setUsedViewTransition(true);
                    }

                    setView(option.view);
                  }, reduced);
                }}
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
      data-vt={usedViewTransition ? "true" : undefined}
      data-filter-motion={filterMotion ? "true" : undefined}
      data-page-enter={pageEnter ? "true" : undefined}
    >
      <div ref={stickSentinelRef} className={styles.stickSentinel} aria-hidden="true" />
      <div
        ref={pinRef}
        className={styles.pinStage}
        data-list-pin={pinList && listPinActive ? "true" : undefined}
      >
      <div className={styles.headerMount} style={toolbarHeight ? { minHeight: toolbarHeight } : undefined}>
        {toolbarStuck && toolbarSlot && hasMounted && !pinList ? createPortal(toolbar, toolbarSlot) : toolbar}
      </div>
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
      ) : isList ? (
        <div
          key="list"
          ref={tableRef}
          className={styles.table}
          data-mobile-list={isMobile ? "true" : undefined}
          onPointerMove={handleTablePointerMove}
          onPointerLeave={handleTablePointerLeave}
          onBlurCapture={handleTableBlur}
        >
          <div role="list" aria-label={`${projectFilterLabel(filter)} projects`}>
          {visibleProjects.map((project, index) => {
            const isActive = project.slug === activeSlug && (isMobile ? listPinActive : desktopHovering);

            return (
              <IntentPrefetchLink
                key={project.slug}
                href={`/projects/${project.slug}`}
                className={styles.row}
                role="listitem"
                style={
                  {
                    "--item-index": index,
                    viewTransitionName: projectViewTransitionName(project.slug),
                  } as CSSProperties
                }
                data-active={isActive ? "true" : undefined}
                aria-label={`${project.title}, ${project.descriptor}`}
                nativeNavigation
                onPointerEnter={(event) => {
                  if (event.pointerType !== "mouse" || isMobile) {
                    return;
                  }

                  activateRow(project.slug);
                  movePreviewToward(event.clientX, event.clientY);
                }}
                onFocus={() => handleRowFocus(project.slug)}
                ref={(node) => setRowNode(project.slug, node)}
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
      ) : (
        <div
          key="grid"
          ref={gridRef}
          className={styles.grid}
          data-view={view}
          aria-label={`${projectFilterLabel(filter)} projects`}
        >
          {visibleProjects.map((project, index) => (
            <div
              key={project.slug}
              className={styles.staggerItem}
              style={
                {
                  "--item-index": index,
                  viewTransitionName: projectViewTransitionName(project.slug),
                } as CSSProperties
              }
            >
              <ProjectCard
                project={project}
                index={index}
                immediate
                visible
                cardRef={(node) => setGridItemNode(project.slug, node)}
              />
            </div>
          ))}
        </div>
      )}
      </div>

      {hasMounted && showDockedPreview && activeProject && activeMedia
        ? createPortal(
            <IntentPrefetchLink
              ref={dockedPreviewRef}
              href={`/projects/${activeProject.slug}`}
              className={styles.preview}
              data-docked="true"
              data-hidden={previewDismissed ? "true" : undefined}
              aria-hidden={previewDismissed || !listPinActive ? true : undefined}
              tabIndex={previewDismissed || !listPinActive ? -1 : undefined}
              aria-label={`${activeProject.title}, explore project`}
              nativeNavigation
              onClick={handleDockedPreviewClick}
              style={
                {
                  "--preview-w": String(activeProject.thumbnail.desktop.width),
                  "--preview-h": String(activeProject.thumbnail.desktop.height),
                } as CSSProperties
              }
            >
              <span className={styles.previewFrame}>
                <ProjectMedia
                  media={activeMedia}
                  alt=""
                  className={styles.previewMedia}
                  fill
                  fit="contain"
                  imagePreload
                  loading="eager"
                  reveal="instant"
                />
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
