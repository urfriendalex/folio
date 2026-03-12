import Link from "next/link";
import { RevealText } from "@/components/RevealText/RevealText";
import { StudioFrame } from "@/components/ui/StudioFrame";
import type { Project } from "@/lib/site-data";
import styles from "./ProjectDetailPage.module.scss";

type ProjectDetailPageProps = {
  nextProject: Project;
  overlayOpen: boolean;
  previousProject: Project;
  project: Project;
};

export function ProjectDetailPage({
  nextProject,
  overlayOpen,
  previousProject,
  project,
}: ProjectDetailPageProps) {
  return (
    <>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={`${styles.heroCopy} panel-surface`}>
            <span className={styles.routeLabel}>{project.routeLabel}</span>
            <RevealText as="h1" className={styles.title} mode="lines" text={project.title} />
            <p className={styles.summary}>{project.summary}</p>
            <div className={styles.tagRow}>
              {project.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <StudioFrame
            accent={project.accent}
            caption={project.studioLabel}
            eyebrow={project.heroKicker}
            title={project.heroStatement}
          />
        </section>

        <section className={styles.detailGrid}>
          <aside className={`${styles.rail} panel-surface`}>
            <div className={styles.railGroup}>
              <span className={styles.railLabel}>nav</span>
              <Link href="/" className="pill-button" data-cursor-hidden="true">
                back
              </Link>
              <Link
                href={`/projects/${previousProject.slug}`}
                className="pill-button"
                data-cursor-hidden="true"
              >
                prev
              </Link>
              <Link
                href={`/projects/${nextProject.slug}`}
                className="pill-button"
                data-cursor-hidden="true"
              >
                next
              </Link>
              <Link
                href={`/projects/${project.slug}?view=details`}
                className="pill-button"
                data-cursor-hidden="true"
              >
                About
              </Link>
            </div>

            <div className={styles.railGroup}>
              <span className={styles.railLabel}>deck</span>
              <p>{project.deck}</p>
            </div>
          </aside>

          <div className={styles.stack}>
            {project.sections.map((section) => (
              <article key={section.title} className={`${styles.sectionCard} panel-surface`}>
                <StudioFrame
                  accent={project.accent}
                  caption={section.tone}
                  eyebrow={section.eyebrow}
                  title={section.title}
                />
                <div className={styles.sectionHeader}>
                  <span className="section-eyebrow">{section.eyebrow}</span>
                  <h2>{section.title}</h2>
                  <p>{section.copy}</p>
                </div>
                <div className={styles.noteGrid}>
                  {section.notes.map((note) => (
                    <div key={note} className={styles.note}>
                      {note}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {overlayOpen ? (
        <div className={styles.overlay}>
          <div className={styles.overlayCard}>
            <div className={styles.overlayHeader}>
              <div>
                <span className="section-eyebrow">{project.overlayLabel}</span>
                <h3>{project.title}</h3>
              </div>
              <Link href={`/projects/${project.slug}`} className="pill-button" data-cursor-hidden="true">
                Close
              </Link>
            </div>
            <p className={styles.overlayBody}>{project.overlayBody}</p>
            <div className={styles.techList}>
              {project.tech.map((item) => (
                <span key={item} className={styles.tech}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
