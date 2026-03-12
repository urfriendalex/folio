import type { ProjectEntry } from "@/content/projects/types";
import { ProjectCard } from "@/components/ui/ProjectCard/ProjectCard";
import styles from "./WorkSection.module.scss";

type WorkSectionProps = {
  projects: ProjectEntry[];
};

export function WorkSection({ projects }: WorkSectionProps) {
  return (
    <section id="work" className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <span className="section-label">Work</span>
          <h2>Selected projects.</h2>
        </header>
        <div className={styles.grid}>
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
