import Link from "next/link";
import { RevealText } from "@/components/RevealText/RevealText";
import { StudioFrame } from "@/components/ui/StudioFrame";
import type { Project, SiteMeta } from "@/lib/site-data";
import styles from "./HomePage.module.scss";

type HomePageProps = {
  projects: Project[];
  siteMeta: SiteMeta;
};

export function HomePage({ projects, siteMeta }: HomePageProps) {
  const featuredProject = projects[0];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={`${styles.heroCopy} panel-surface`}>
          <div className={styles.heroText}>
            <span className="section-eyebrow">{siteMeta.label}</span>
            <RevealText
              as="h1"
              className={styles.title}
              mode="lines"
              text={`minimal\ninternet\nportfolio`}
            />
            <RevealText
              as="p"
              className={styles.manifesto}
              mode="words"
              text={siteMeta.intro}
            />
          </div>
          <div className={styles.quickGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>04</div>
              <div className={styles.statLabel}>projects</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>01</div>
              <div className={styles.statLabel}>archive</div>
            </div>
          </div>
        </div>
        <div className={styles.heroFeature}>
          <StudioFrame
            accent={featuredProject.accent}
            caption={featuredProject.routeLabel}
            eyebrow={featuredProject.heroKicker}
            title={featuredProject.title}
          />
          <div className={styles.featureMeta}>
            <p>{featuredProject.summary}</p>
            <Link
              href={`/projects/${featuredProject.slug}`}
              className="link-wavy"
              data-cursor-hidden="true"
            >
              enter
              <svg viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0,56.5c0,0,298.666,0,399.333,0C448.336,56.5,513.994,46,597,46c77.327,0,135,10.5,200.999,10.5c95.996,0,402.001,0,402.001,0" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <section id="selected-work" className={styles.works}>
        <div className={styles.worksHeader}>
          <div>
            <span className="section-eyebrow">work</span>
            <h2>projects</h2>
          </div>
          <Link href="/archive" className="pill-button" data-cursor-hidden="true">
            archive
          </Link>
        </div>

        <div className={styles.worksGrid}>
          {projects.map((project) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}`}
              className={`${styles.workCard} panel-surface`}
              data-cursor-hidden="true"
            >
              <div className={styles.cardHeader}>
                <strong>{project.title}</strong>
                <span>{project.year}</span>
              </div>
              <StudioFrame
                accent={project.accent}
                caption={project.routeLabel}
                eyebrow={project.studioLabel}
                title={project.heroStatement}
              />
              <p className={styles.cardSummary}>{project.deck}</p>
              <div className={styles.tags}>
                {project.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
