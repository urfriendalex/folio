"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useMemo,
  useState,
  useSyncExternalStore,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ImageReveal, RevealLines } from "@/components/motion";
import { useOverlay } from "@/components/ui/Overlay/OverlayProvider";
import type { ProjectEntry } from "@/content/projects/types";
import { estimateWrappedLines } from "@/lib/projectOverlaySequence";
import styles from "./ProjectPage.module.scss";

/** Line stagger for toolbar copy — aligned with immersive overlays (~28ms), slightly tighter for this bar. */
const TOOLBAR_LINE_STEP_MS = 26;

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

type ProjectPageProps = {
  nextProject: ProjectEntry;
  previousProject: ProjectEntry;
  project: ProjectEntry;
};

export function ProjectPage({ nextProject, previousProject, project }: ProjectPageProps) {
  const { openProjectFullInfo } = useOverlay();
  const [toolbarPinnedOpen, setToolbarPinnedOpen] = useState(false);
  const [toolbarHovered, setToolbarHovered] = useState(false);
  const toolbarExpanded = toolbarPinnedOpen || toolbarHovered;
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServerSnapshot,
  );
  const overviewLabel = "show full overview";
  const visitLabel = "visit site";
  const primaryProjectUrl = project.links?.[0]?.url ?? project.optionalLink;

  const lineStepMs = reducedMotion ? 8 : TOOLBAR_LINE_STEP_MS;

  const { total, descriptorOffset, visitOffset, overviewOffset } = useMemo(() => {
    const hasVisit = Boolean(project.links?.[0]?.url ?? project.optionalLink);
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

  return (
    <article className={`page-shell ${styles.page}`}>
      <section className={styles.stills}>
        {project.stills.map((still, index) => (
          <ImageReveal key={`${still}-${index}`} className={styles.still}>
            <Image
              src={still}
              alt={`${project.title} visual ${index + 1}`}
              width={1200}
              height={1500}
              sizes="(max-width: 48rem) 100vw, 72rem"
            />
          </ImageReveal>
        ))}
      </section>

      <div className={styles.toolbarShell} data-expanded={toolbarExpanded}>
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
