import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/motion/ScrollReveal/ScrollReveal";
import type { ProjectEntry } from "@/content/projects/types";
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
  const externalUrl = project.optionalLink ?? project.links?.[0]?.url;

  return (
    <ScrollReveal
      immediate={immediate}
      visible={visible}
      revealOptions={projectCardRevealOptions}
      staggerIndex={staggerIndexOffset + index}
      staggerStepMs={72}
    >
      <article className={styles.card} ref={cardRef}>
        <Link href={projectHref} className={styles.media} aria-label={`${project.title} — explore project`}>
          <Image
            src={project.thumbnail}
            alt=""
            width={1920}
            height={1080}
            sizes="(max-width: 48rem) 100vw, 48rem"
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
