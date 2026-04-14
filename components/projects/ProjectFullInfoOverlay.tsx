"use client";

import { useMemo } from "react";
import { RevealLines } from "@/components/motion";
import type { ProjectEntry } from "@/content/projects/types";
import {
  buildProjectOverlayOffsets,
  formatProjectClient,
  formatProjectCollaboration,
  formatProjectStack,
} from "@/lib/projectOverlaySequence";
import styles from "./ProjectFullInfoOverlay.module.scss";

/** Stagger between line tokens — lower than About (dense case study copy). */
const PROJECT_OVERLAY_REVEAL_STEP_MS = 17;

type ProjectFullInfoOverlayProps = {
  project: ProjectEntry;
  contentVisible: boolean;
};

/** Minimal editorial list — no pill chrome; keeps emphasis for rare accents elsewhere. */
function DetailList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className={styles.detailList}>
      {items.map((text, index) => (
        <li key={`${index}-${text}`}>{text}</li>
      ))}
    </ul>
  );
}

export function ProjectFullInfoOverlay({ project, contentVisible }: ProjectFullInfoOverlayProps) {
  const { total, get } = useMemo(() => buildProjectOverlayOffsets(project), [project]);
  const techLine = project.technologies.join(", ");

  const linkList =
    project.links && project.links.length > 0
      ? project.links
      : project.optionalLink
        ? [{ label: "visit site", url: project.optionalLink }]
        : [];

  return (
    <div className={styles.root} data-content-visible={contentVisible}>
      <header className={styles.header}>
        <RevealLines
          as="p"
          className={styles.descriptor}
          text={project.descriptor}
          offset={get("descriptor")}
          stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
          total={total}
          visible={contentVisible}
        />
        <RevealLines
          as="h2"
          className={styles.title}
          text={project.title}
          measureLines={false}
          offset={get("title")}
          stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
          total={total}
          visible={contentVisible}
        />
      </header>

      <div className={styles.bodyScroll} data-lenis-prevent="">
        <div className={styles.sheetLayout}>
          <div className={styles.sheetIntro}>
            <RevealLines
              as="p"
              className={`${styles.lead} ${styles.leadDesktop}`}
              text={project.description}
              offset={get("lead")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />

            {project.overview?.trim() ? (
              <section className={styles.extra} aria-label="Overview">
                <RevealLines
                  as="p"
                  className={`section-label ${styles.extraLabel}`}
                  text="Overview"
                  measureLines={false}
                  offset={get("overviewL")}
                  stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
                  total={total}
                  visible={contentVisible}
                />
                <RevealLines
                  as="p"
                  className={`${styles.extraBody} ${styles.overviewDesktop}`}
                  text={project.overview.trim()}
                  offset={get("overviewBody")}
                  stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
                  total={total}
                  visible={contentVisible}
                />
              </section>
            ) : null}
          </div>

          <aside className={styles.sheetAside} aria-label="Project meta">
            <dl className={styles.meta}>
              <div className={styles.metaRow}>
                <div className={styles.metaCell}>
                  <RevealLines
                    as="dt"
                    className={`section-label ${styles.metaTitle}`}
                    text="Role"
                    measureLines={false}
                    offset={get("roleL")}
                    stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
                    total={total}
                    visible={contentVisible}
                  />
                  <RevealLines
                    as="dd"
                    className={styles.metaValue}
                    text={project.role}
                    measureLines={false}
                    offset={get("roleV")}
                    stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
                    total={total}
                    visible={contentVisible}
                  />
                </div>
                <div className={styles.metaCell}>
                  <RevealLines
                    as="dt"
                    className={`section-label ${styles.metaTitle}`}
                    text="Year"
                    measureLines={false}
                    offset={get("yearL")}
                    stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
                    total={total}
                    visible={contentVisible}
                  />
                  <RevealLines
                    as="dd"
                    className={styles.metaValue}
                    text={project.year}
                    measureLines={false}
                    offset={get("yearV")}
                    stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
                    total={total}
                    visible={contentVisible}
                  />
                </div>
                <div className={styles.metaCell}>
                  <RevealLines
                    as="dt"
                    className={`section-label ${styles.metaTitle}`}
                    text="Technologies"
                    measureLines={false}
                    offset={get("techL")}
                    stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
                    total={total}
                    visible={contentVisible}
                  />
                  <RevealLines
                    as="dd"
                    className={styles.metaValue}
                    text={techLine}
                    offset={get("techV")}
                    stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
                    total={total}
                    visible={contentVisible}
                  />
                </div>
              </div>
            </dl>

            {linkList.length > 0 ? (
              <div className={styles.asideLinks} role="group" aria-label="External links">
                {linkList.map((link, i) => (
                  <a
                    key={`${link.url}-${link.label}`}
                    href={link.url}
                    className={styles.visitSiteLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <RevealLines
                      as="span"
                      text={link.label}
                      measureLines={false}
                      offset={get(`link${i}`)}
                      stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
                      total={total}
                      visible={contentVisible}
                    />
                  </a>
                ))}
              </div>
            ) : null}
          </aside>

          <div className={styles.sheetBody}>
        {project.client ? (
          <section className={`${styles.extra} ${styles.extraGridHalf}`} aria-label="Client">
            <RevealLines
              as="p"
              className={`section-label ${styles.extraLabel}`}
              text="Client"
              measureLines={false}
              offset={get("clientL")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
            <RevealLines
              as="p"
              className={`${styles.extraBody} ${styles.proseDesktop}`}
              text={formatProjectClient(project.client)}
              offset={get("clientBody")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
          </section>
        ) : null}

        {project.roleSummary?.trim() ? (
          <section className={`${styles.extra} ${styles.extraGridHalf}`} aria-label="Role detail">
            <RevealLines
              as="p"
              className={`section-label ${styles.extraLabel}`}
              text="Summary"
              measureLines={false}
              offset={get("roleDetailL")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
            <RevealLines
              as="p"
              className={`${styles.extraBody} ${styles.proseDesktop}`}
              text={project.roleSummary.trim()}
              offset={get("roleDetailV")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
          </section>
        ) : null}

        {project.responsibilities?.length ? (
          <section className={`${styles.extra} ${styles.extraGridFull}`} aria-label="Responsibilities">
            <RevealLines
              as="p"
              className={`section-label ${styles.extraLabel}`}
              text="Responsibilities"
              measureLines={false}
              offset={get("respL")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
            <DetailList items={project.responsibilities} />
          </section>
        ) : null}

        {project.collaboration ? (
          <section className={`${styles.extra} ${styles.extraGridFull}`} aria-label="Collaboration">
            <RevealLines
              as="p"
              className={`section-label ${styles.extraLabel}`}
              text="Collaboration"
              measureLines={false}
              offset={get("collabL")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
            <RevealLines
              as="p"
              className={`${styles.extraBody} ${styles.proseDesktop}`}
              text={formatProjectCollaboration(project.collaboration)}
              offset={get("collabBody")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
          </section>
        ) : null}

        {project.stack ? (
          <section className={`${styles.extra} ${styles.extraGridHalf}`} aria-label="Stack">
            <RevealLines
              as="p"
              className={`section-label ${styles.extraLabel}`}
              text="Stack"
              measureLines={false}
              offset={get("stackL")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
            <RevealLines
              as="p"
              className={`${styles.extraBody} ${styles.proseDesktop}`}
              text={formatProjectStack(project.stack)}
              offset={get("stackBody")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
          </section>
        ) : null}

        {project.features?.length ? (
          <section className={`${styles.extra} ${styles.extraGridFull}`} aria-label="Features">
            <RevealLines
              as="p"
              className={`section-label ${styles.extraLabel}`}
              text="Features"
              measureLines={false}
              offset={get("featL")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
            <DetailList items={project.features} />
          </section>
        ) : null}

        {project.impact ? (
          <section className={`${styles.extra} ${styles.extraGridFull}`} aria-label="Impact">
            <RevealLines
              as="p"
              className={`section-label ${styles.extraLabel}`}
              text="Impact"
              measureLines={false}
              offset={get("impactL")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
            <RevealLines
              as="p"
              className={`${styles.extraBody} ${styles.proseDesktop}`}
              text={project.impact.summary}
              offset={get("impactSum")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
            {project.impact.highlights?.length ? (
              <DetailList items={project.impact.highlights} />
            ) : null}
          </section>
        ) : null}

        {project.tags?.length ? (
          <section className={`${styles.extra} ${styles.extraGridFull}`} aria-label="Tags">
            <RevealLines
              as="p"
              className={`section-label ${styles.extraLabel}`}
              text="Tags"
              measureLines={false}
              offset={get("tagsL")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
            <RevealLines
              as="p"
              className={`${styles.extraBody} ${styles.tagsInline}`}
              text={project.tags.join(" · ")}
              offset={get("tagsBody")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
          </section>
        ) : null}

        {project.status?.trim() ? (
          <section className={`${styles.extra} ${styles.extraGridHalf}`} aria-label="Status">
            <RevealLines
              as="p"
              className={`section-label ${styles.extraLabel}`}
              text="Status"
              measureLines={false}
              offset={get("statusL")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
            <RevealLines
              as="p"
              className={styles.extraBody}
              text={project.status.trim()}
              measureLines={false}
              offset={get("statusV")}
              stepMs={PROJECT_OVERLAY_REVEAL_STEP_MS}
              total={total}
              visible={contentVisible}
            />
          </section>
        ) : null}

          </div>
        </div>
      </div>
    </div>
  );
}
