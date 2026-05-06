import Link from "next/link";
import { ProjectMedia } from "@/components/media/ProjectMedia/ProjectMedia";
import { ScrollReveal } from "@/components/motion/ScrollReveal/ScrollReveal";
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
  cardRef?: (node: HTMLElement | null) => void;
};

export function ProjectCard({
  project,
  index,
  immediate = false,
  visible,
  staggerIndexOffset = 0,
  cardRef,
}: ProjectCardProps) {
  const projectHref = `/projects/${project.slug}`;
  const externalUrl = project.links?.[0]?.url;
  const thumbnailMedia = thumbnailToMediaSlot(project.thumbnail);

  return (
    <ScrollReveal
      immediate={immediate}
      visible={visible}
      revealOptions={projectCardRevealOptions}
      staggerIndex={staggerIndexOffset + index}
      staggerStepMs={72}
    >
      <article className={styles.card} ref={cardRef}>
        <Link href={projectHref} className={styles.media} aria-label={`${project.title}, explore project`}>
          <ProjectMedia
            media={thumbnailMedia}
            alt={`${project.title} project preview`}
            className={styles.mediaAsset}
            fill
            fit="contain"
            imagePreload={index === 0}
            loading={index < 2 ? "eager" : "lazy"}
          />
        </Link>
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
            <Link href={projectHref} className={`link-underline ${styles.actionLink}`}>
              explore project
            </Link>
          </div>
        </footer>
      </article>
    </ScrollReveal>
  );
}
