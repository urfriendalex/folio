import { ProjectMediaPlaceholderGrid } from "@/components/media/ProjectMediaPlaceholderGrid";
import styles from "@/components/projects/ProjectPage.module.scss";
import { projects } from "@/content/projects";
import { projectMediaPlaceholderGridForAsset } from "@/lib/projectMedia";

const projectWithMostMedia = projects.reduce((largest, project) => (
  project.media.length > largest.media.length ? project : largest
), projects[0]!);

const SKELETON_ITEMS = projectWithMostMedia.media.map((media, index) => ({
  grid: projectMediaPlaceholderGridForAsset(media.desktop),
  id: `${media.desktop.src}-${index}`,
}));

export default function ProjectLoading() {
  return (
    <article className={`page-shell ${styles.page}`} aria-busy="true" aria-label="Loading project">
      <section className={`${styles.stills} ${styles.loadingStills}`}>
        {SKELETON_ITEMS.map((item) => (
          <ProjectMediaPlaceholderGrid
            key={item.id}
            grid={item.grid}
            className={styles.loadingStill}
          />
        ))}
      </section>

      <div className={`${styles.toolbarShell} ${styles.loadingToolbar}`} data-overlay-chrome-conceal="true">
        <div className={styles.toolbarTrack}>
          <div className={`${styles.navButton} ${styles.previousButton}`} aria-hidden="true" />
          <div className={styles.toolbarCore}>
            <section className={styles.toolbarPanel} aria-hidden="true">
              <div className={styles.toolbarHeader}>
                <div className={styles.toolbarCopy}>
                  <h1>Loading project</h1>
                </div>
              </div>
            </section>
          </div>
          <div className={`${styles.navButton} ${styles.nextButton}`} aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}
