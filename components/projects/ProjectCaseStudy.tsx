import type { ReactNode } from "react";
import type { ProjectEntry } from "@/content/projects/types";
import {
  formatProjectClient,
  formatProjectCollaboration,
  formatProjectStack,
} from "@/lib/projectOverlaySequence";
import styles from "./ProjectCaseStudy.module.scss";

function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.note}>
      <h3 className="section-label">{title}</h3>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className={styles.list}>
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

/** Server-rendered project text; the native disclosure also works without JavaScript. */
export function ProjectCaseStudy({ project }: { project: ProjectEntry }) {
  return (
    <section className={`page-shell ${styles.root}`} aria-labelledby="project-notes-title">
      <div className={styles.intro}>
        <p className="section-label">{project.title} / {project.year}</p>
        <p className={styles.lead}>{project.description}</p>
      </div>

      <details className={styles.details}>
        <summary className={styles.summary}>
          <h2 id="project-notes-title">Project notes</h2>
          <span className={styles.summaryHint}>Role, process & outcomes</span>
          <span className={styles.glyph} aria-hidden="true" />
        </summary>

        <div className={styles.body}>
          <dl className={styles.facts}>
            <div><dt className="section-label">Role</dt><dd>{project.role}</dd></div>
            <div><dt className="section-label">Year</dt><dd>{project.year}</dd></div>
            <div><dt className="section-label">Technologies</dt><dd>{project.technologies.join(", ")}</dd></div>
          </dl>

          <div className={styles.notes}>
            {project.overview?.trim() ? <Note title="Overview"><p>{project.overview}</p></Note> : null}
            {project.client ? <Note title="Client"><p>{formatProjectClient(project.client)}</p></Note> : null}
            {project.roleSummary?.trim() ? <Note title="My contribution"><p>{project.roleSummary}</p></Note> : null}
            {project.responsibilities?.length ? <Note title="Responsibilities"><List items={project.responsibilities} /></Note> : null}
            {project.collaboration ? <Note title="Collaboration"><p>{formatProjectCollaboration(project.collaboration)}</p></Note> : null}
            {project.stack ? <Note title="Stack"><p>{formatProjectStack(project.stack)}</p></Note> : null}
            {project.features?.length ? <Note title="Features"><List items={project.features} /></Note> : null}
            {project.impact ? (
              <Note title="Outcomes">
                <p>{project.impact.summary}</p>
                {project.impact.highlights.length ? <List items={project.impact.highlights} /> : null}
              </Note>
            ) : null}
            {project.links?.length ? (
              <Note title="Explore the project">
                <ul className={styles.links}>
                  {project.links.map((link) => (
                    <li key={link.url}><a className="link-underline" href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a></li>
                  ))}
                </ul>
              </Note>
            ) : null}
          </div>
        </div>
      </details>
    </section>
  );
}
