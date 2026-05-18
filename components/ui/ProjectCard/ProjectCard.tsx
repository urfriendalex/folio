import { ProjectMedia } from "@/components/media/ProjectMedia/ProjectMedia";
import { ScrollReveal } from "@/components/motion/ScrollReveal/ScrollReveal";
import { IntentPrefetchLink } from "@/components/navigation/IntentPrefetchLink";
import type { UseRevealOnViewOptions } from "@/components/motion/shared/useRevealOnView";
import type { ProjectEntry } from "@/content/projects/types";
import { thumbnailToMediaSlot } from "@/lib/projectMedia";
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

  return (
    <ScrollReveal
      immediate={immediate}
      visible={visible}
      revealOptions={revealOptions ?? projectCardRevealOptions}
      staggerIndex={staggerIndexOffset + index}
      staggerStepMs={72}
    >
      <article className={styles.card} ref={cardRef}>
        <IntentPrefetchLink
          href={projectHref}
          className={styles.media}
          aria-label={`${project.title}, explore project`}
          nativeNavigation
        >
          <ProjectMedia
            media={thumbnailMedia}
            alt={`${project.title} project preview`}
            className={styles.mediaAsset}
            fill
            fit="contain"
            imagePreload={index === 0}
            loading={index < 2 ? "eager" : "lazy"}
          />
        </IntentPrefetchLink>
        <footer className={styles.meta}>
          <div className={styles.identity}>
            <div className={styles.titleRow}>
              <h3 className={styles.title}>{project.title}</h3>
              <span className={styles.year}>{project.year}</span>
            </div>
          </div>
          <div className={styles.actions} aria-label="Project links">
            <span className={styles.linksLeft}>
              {externalUrl ? (
                <a
                  href={externalUrl}
                  className={`link-underline ${styles.actionLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  visit
                </a>
              ) : null}
            </span>
            <IntentPrefetchLink href={projectHref} className={`link-underline ${styles.actionLink}`} nativeNavigation>
              explore project
            </IntentPrefetchLink>
          </div>
        </footer>
      </article>
    </ScrollReveal>
  );
}
