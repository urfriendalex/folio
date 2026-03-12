import Image from "next/image";
import Link from "next/link";
import { ScrollReveal } from "@/components/motion/ScrollReveal/ScrollReveal";
import type { ProjectEntry } from "@/content/projects/types";
import styles from "./ProjectCard.module.scss";

type ProjectCardProps = {
  project: ProjectEntry;
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <ScrollReveal>
      <Link href={`/projects/${project.slug}`} className={styles.card}>
        <div className={styles.media}>
          <Image
            src={project.thumbnail}
            alt={`${project.title} project thumbnail`}
            width={1200}
            height={1500}
            sizes="(max-width: 48rem) 100vw, 48rem"
          />
        </div>
        <div className={styles.meta}>
          <h3>{project.title}</h3>
          <p>{project.descriptor}</p>
        </div>
      </Link>
    </ScrollReveal>
  );
}
