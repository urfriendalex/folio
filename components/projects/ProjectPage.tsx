"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ImageReveal } from "@/components/motion/ImageReveal/ImageReveal";
import { Overlay } from "@/components/ui/Overlay/Overlay";
import type { ProjectEntry } from "@/content/projects/types";
import styles from "./ProjectPage.module.scss";

type ProjectPageProps = {
  nextProject: ProjectEntry;
  previousProject: ProjectEntry;
  project: ProjectEntry;
};

export function ProjectPage({ nextProject, previousProject, project }: ProjectPageProps) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
      <article className={styles.page}>
        <header className={styles.header}>
          <div className={styles.copy}>
            <span className="section-label">Project</span>
            <h1>{project.title}</h1>
            <p>{project.descriptor}</p>
          </div>
          <div className={styles.links}>
            <Link href="/" className="pill-button">
              Back
            </Link>
            <Link href={`/projects/${previousProject.slug}`} className="pill-button">
              Previous
            </Link>
            <Link href={`/projects/${nextProject.slug}`} className="pill-button">
              Next
            </Link>
            <button type="button" className="pill-button" onClick={() => setInfoOpen(true)}>
              Info
            </button>
          </div>
        </header>

        <section className={styles.stills}>
          {project.stills.map((still, index) => (
            <ImageReveal key={`${still}-${index}`} className={styles.still}>
              <Image
                src={still}
                alt={`${project.title} visual ${index + 1}`}
                width={1200}
                height={1500}
                sizes="(max-width: 48rem) 100vw, 72rem"
              />
            </ImageReveal>
          ))}
        </section>
      </article>

      {infoOpen ? (
        <Overlay onClose={() => setInfoOpen(false)} title="Project information">
          <div className={styles.overlayContent}>
            <h2>{project.title}</h2>
            <p>{project.description}</p>
            <dl className={styles.details}>
              <div>
                <dt>Role</dt>
                <dd>{project.role}</dd>
              </div>
              <div>
                <dt>Year</dt>
                <dd>{project.year}</dd>
              </div>
              <div>
                <dt>Technologies</dt>
                <dd>{project.technologies.join(", ")}</dd>
              </div>
            </dl>
            {project.optionalLink ? (
              <a href={project.optionalLink} className="text-link">
                Visit project
              </a>
            ) : null}
          </div>
        </Overlay>
      ) : null}
    </>
  );
}
