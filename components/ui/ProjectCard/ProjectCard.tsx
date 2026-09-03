import { ProjectMedia } from "@/components/media/ProjectMedia/ProjectMedia";
import { ScrollReveal } from "@/components/motion/ScrollReveal/ScrollReveal";
import { IntentPrefetchLink } from "@/components/navigation/IntentPrefetchLink";
import type { UseRevealOnViewOptions } from "@/components/motion/shared/useRevealOnView";
import type { ProjectEntry } from "@/content/projects/types";
import { thumbnailToMediaSlot } from "@/lib/projectMedia";
import { ExploreMediaLink } from "./ExploreMediaLink";
import styles from "./ProjectCard.module.scss";

/** Looser than `useRevealOnView` defaults: no bottom inset, any intersection ratio fires. */
const projectCardRevealOptions = {
  rootMargin: "0px",
  threshold: 0,
} as const;

type ProjectCardProps = {
  project: ProjectEntry;
  index: number;
  immediate?: boolean;
  visible?: boolean;
  staggerIndexOffset?: number;
  /** Overrides default card observer tuning (e.g. Work rootMargin/threshold). */
  revealOptions?: UseRevealOnViewOptions;
  cardRef?: (node: HTMLElement | null) => void;
};

function VisitArrowIcon() {
  return (
    <svg className={styles.visitIcon} viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M3.15 8.85 8.85 3.15M4.1 3.15h4.75V7.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function ProjectCard({
  project,
  index,
  immediate = false,
  visible,
  staggerIndexOffset = 0,
  revealOptions,
  cardRef,
}: ProjectCardProps) {
  const projectHref = `/projects/${project.slug}`;
  const externalUrl = project.links?.[0]?.url;
  const thumbnailMedia = thumbnailToMediaSlot(project.thumbnail);
  const displayTitle = `${project.title} | ${project.cardDescriptor}`;

  return (
    <ScrollReveal
      immediate={immediate}
      visible={visible}
      revealOptions={revealOptions ?? projectCardRevealOptions}
      staggerIndex={staggerIndexOffset + index}
      staggerStepMs={72}
    >
      <article className={styles.card} ref={cardRef}>
        <ExploreMediaLink href={projectHref} ariaLabel={`${project.title}, explore project`}>
          <ProjectMedia
            media={thumbnailMedia}
            alt={`${project.title} project preview`}
            className={styles.mediaAsset}
            fill
            fit="contain"
            imagePreload={index === 0}
            loading={index < 2 ? "eager" : "lazy"}
          />
        </ExploreMediaLink>
        <footer className={styles.meta}>
          <div className={styles.titleRow}>
            <div className={styles.titleCluster}>
              <h3 className={styles.title} aria-label={displayTitle}>
                <IntentPrefetchLink href={projectHref} className={styles.titleLink} nativeNavigation>
                  <span className={styles.titlePrimary}>{project.title}</span>
                  <span className={styles.titleSeparator} aria-hidden="true">
                    |
                  </span>
                  <span className={styles.titleSecondary}>{project.cardDescriptor}</span>
                </IntentPrefetchLink>
              </h3>
              {externalUrl ? (
                <a
                  href={externalUrl}
                  className={styles.visit}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit ${project.title} (opens in a new tab)`}
                >
                  <VisitArrowIcon />
                  <span className={styles.visitWordClip}>
                    <span className={styles.visitWord}>visit</span>
                  </span>
                </a>
              ) : null}
            </div>
            <span className={styles.year}>{project.year}</span>
          </div>
        </footer>
      </article>
    </ScrollReveal>
  );
}
