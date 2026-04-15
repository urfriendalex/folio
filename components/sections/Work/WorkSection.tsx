"use client";

import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { RevealLines } from "@/components/motion/RevealLines/RevealLines";
import { ScrollReveal } from "@/components/motion/ScrollReveal/ScrollReveal";
import type { ProjectEntry } from "@/content/projects/types";
import { useHeroRevealComplete } from "@/lib/heroRevealComplete";
import { ProjectCard } from "@/components/ui/ProjectCard/ProjectCard";
import styles from "./WorkSection.module.scss";

type WorkSectionProps = {
  projects: ProjectEntry[];
};

type GridView = "wide" | "regular" | "compact";

const desktopViewOptions: Array<{
  view: GridView;
  label: string;
  columns: number;
  rows: number;
  variant: "bars" | "grid";
  widthRatio: number;
  heightRatio: number;
  gapRatio: number;
}> = [
  {
    view: "wide",
    label: "Two column grid",
    columns: 2,
    rows: 1,
    variant: "bars",
    widthRatio: 0.5,
    heightRatio: 0.48,
    gapRatio: 0.09,
  },
  {
    view: "regular",
    label: "Three column grid",
    columns: 2,
    rows: 2,
    variant: "grid",
    widthRatio: 0.5,
    heightRatio: 0.48,
    gapRatio: 0.092,
  },
  {
    view: "compact",
    label: "Four column grid",
    columns: 3,
    rows: 2,
    variant: "grid",
    widthRatio: 0.5,
    heightRatio: 0.48,
    gapRatio: 0.095,
  },
];

const mobileViewOptions: Array<{
  view: Extract<GridView, "wide" | "regular">;
  label: string;
  columns: number;
  rows: number;
  variant: "bars" | "grid";
  widthRatio: number;
  heightRatio: number;
  gapRatio: number;
}> = [
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

const workChromeRevealOptions = {
  rootMargin: "0px",
  threshold: 0,
} as const;

const WORK_CHROME_STAGGER_STEP_MS = 56;
const WORK_CARD_STAGGER_OFFSET = 2;
const WORK_TITLE = "Recent projects";

export function WorkSection({ projects }: WorkSectionProps) {
  const [view, setView] = useState<GridView>("wide");
  // Must match SSR: never read viewport in useState initializer or server/desktop
  // and client/mobile first paints diverge and React hydration fails.
  const [isMobile, setIsMobile] = useState(false);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const previousRectsRef = useRef(new Map<string, DOMRect>());
  const hasMountedRef = useRef(false);
  const viewOptions = isMobile ? mobileViewOptions : desktopViewOptions;
  const heroRevealComplete = useHeroRevealComplete();

  const setCardNode = (slug: string, node: HTMLElement | null) => {
    if (node) {
      cardRefs.current.set(slug, node);
      return;
    }

    cardRefs.current.delete(slug);
  };

  const captureRects = () => {
    const rects = new Map<string, DOMRect>();

    projects.forEach((project) => {
      const node = cardRefs.current.get(project.slug);
      if (node) {
        rects.set(project.slug, node.getBoundingClientRect());
      }
    });

    return rects;
  };

  useLayoutEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const previousRects = previousRectsRef.current;

    if (!previousRects.size || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      previousRects.clear();
      return;
    }

    projects.forEach((project) => {
      const node = cardRefs.current.get(project.slug);
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
  }, [projects, view]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 48rem)");

    const syncViewport = (matches: boolean) => {
      setIsMobile(matches);
      setView((currentView) => {
        if (!matches || currentView !== "compact") {
          return currentView;
        }

        return "regular";
      });
    };

    syncViewport(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncViewport(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return (
    <section id="work" className={styles.section}>
      <div className={`page-shell ${styles.inner}`}>
        <header className={styles.header}>
          <RevealLines
            as="h2"
            className={styles.title}
            text={WORK_TITLE}
            measureLines={false}
            visible={heroRevealComplete}
          />
          <ScrollReveal
            visible={heroRevealComplete}
            revealOptions={workChromeRevealOptions}
            staggerIndex={1}
            staggerStepMs={WORK_CHROME_STAGGER_STEP_MS}
          >
            <div className={styles.viewSwitch} role="group" aria-label="Project grid layout">
              {viewOptions.map((option) => {
                const isActive = option.view === view;

                return (
                  <button
                    key={option.view}
                    type="button"
                    className={styles.viewButton}
                    data-active={isActive}
                    aria-pressed={isActive}
                    aria-label={option.label}
                    onClick={() => {
                      if (isActive) {
                        return;
                      }

                      previousRectsRef.current = captureRects();
                      startTransition(() => {
                        setView(option.view);
                      });
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
          </ScrollReveal>
        </header>
        <div className={styles.grid} data-view={view} aria-label="Recent projects">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.slug}
              project={project}
              index={index}
              visible={heroRevealComplete}
              staggerIndexOffset={WORK_CARD_STAGGER_OFFSET}
              cardRef={(node) => setCardNode(project.slug, node)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
