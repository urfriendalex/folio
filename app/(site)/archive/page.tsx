import type { Metadata } from "next";
import { ArchiveCanvas } from "@/components/Archive/ArchiveCanvas";
import { archiveEntries } from "@/content/archive/archive-data";
import { clampMetaDescription, SITE_NAME, SITE_OG_IMAGE } from "@/lib/metadata";
import { PAGE_LAST_MODIFIED, SITE_URL } from "@/lib/site";
import styles from "./page.module.scss";

const archiveDescription = clampMetaDescription(
  "Alexander Yansons archive: experiments, visuals, and side projects in one spatial canvas — sketches, tests, and studies between client work.",
);

export const metadata: Metadata = {
  title: "Archive · Alexander Yansons",
  description: archiveDescription,
  alternates: {
    canonical: "/archive",
  },
  openGraph: {
    siteName: SITE_NAME,
    title: "Archive · Alexander Yansons",
    description: archiveDescription,
    type: "website",
    url: `${SITE_URL}/archive`,
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Archive · Alexander Yansons",
    description: archiveDescription,
    images: [SITE_OG_IMAGE.url],
  },
};

export default function ArchiveRoute() {
  const pageUrl = `${SITE_URL}/archive`;
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#archive`,
    name: "Archive · Alexander Yansons",
    url: pageUrl,
    description: archiveDescription,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    dateModified: PAGE_LAST_MODIFIED.archive,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <ArchiveCanvas items={archiveEntries} />
      <section className={styles.index} aria-labelledby="archive-heading" data-archive-index="true">
        <header className={styles.header}>
          <h1 id="archive-heading">Archive</h1>
          <p>Experiments, visuals, and studies between client work.</p>
        </header>
        <details className={styles.catalogue}>
          <summary>
            <span>Browse the index</span>
            <span className={styles.count}>{archiveEntries.length} fragments</span>
            <span className={styles.toggle} aria-hidden="true">+</span>
          </summary>
          <div className={styles.catalogueBody} data-lenis-prevent>
            <p className={styles.introduction}>
              A collection of interface experiments, motion stills, material studies,
              and visual references by Alexander Yansons. Explore the canvas or open
              a fragment directly from the list below.
            </p>
            <ol className={styles.entries}>
              {archiveEntries.map((entry) => (
                <li key={entry.id}>
                  <span className={styles.entryNumber} aria-hidden="true">{entry.indexLabel}</span>
                  <div>
                    <h2>
                      <a href={entry.image}>{entry.title}<span aria-hidden="true"> ↗</span></a>
                    </h2>
                    <p className={styles.entryMeta}>
                      {entry.year} · {entry.medium} · {entry.kind === "video" ? "Video" : "Image"}
                    </p>
                    <p className={styles.entryNote}>{entry.note}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </details>
      </section>
      <noscript>
        <style>{'[data-archive-experience="true"] { display: none !important; }'}</style>
      </noscript>
    </>
  );
}
