import styles from "@/components/projects/ProjectPage.module.scss";

const SKELETON_ITEMS = Array.from({ length: 5 }, (_, index) => index);

export default function ProjectLoading() {
  return (
    <article className={`page-shell ${styles.page}`} aria-busy="true" aria-label="Loading project">
      <section className={`${styles.stills} ${styles.loadingStills}`}>
        {SKELETON_ITEMS.map((item) => (
          <div key={item} className={styles.loadingStill} aria-hidden="true">
            <span />
          </div>
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
