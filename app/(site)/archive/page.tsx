import type { Metadata } from "next";
import { ArchiveCanvas } from "@/components/Archive/ArchiveCanvas";
import { ArchiveIndexLink } from "@/components/Archive/ArchiveIndexLink";
import { ArchiveIndexScroll } from "@/components/Archive/ArchiveIndexScroll";
import { archiveEntries } from "@/content/archive/archive-data";
import { clampMetaDescription, SITE_NAME, SITE_OG_IMAGE } from "@/lib/metadata";
import { PAGE_LAST_MODIFIED, SITE_URL } from "@/lib/site";
import { breadcrumbEntity, jsonLd, PERSON_ID, WEBSITE_ID } from "@/lib/structuredData";
import styles from "./page.module.scss";

const archiveDescription = clampMetaDescription(
  "Alexander Yansons archive: experiments, visuals, and side projects in one spatial canvas — sketches, tests, and studies between client work.",
);

export const metadata: Metadata = {
  title: "Archive — Experiments & Visual Studies",
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
    "@type": "CollectionPage",
    "@id": `${pageUrl}#archive`,
    name: "Archive · Alexander Yansons",
    url: pageUrl,
    description: archiveDescription,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    author: { "@id": PERSON_ID },
    dateModified: PAGE_LAST_MODIFIED.archive,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: archiveEntries.length,
      itemListElement: archiveEntries.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": entry.kind === "video" ? "MediaObject" : "ImageObject",
          name: entry.title,
          description: entry.note,
          contentUrl: `${SITE_URL}${entry.image}`,
          dateCreated: entry.year,
          creator: { "@id": PERSON_ID },
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(collectionSchema, breadcrumbEntity([{ name: "Archive", path: "/archive" }])),
        }}
      />
      <ArchiveCanvas items={archiveEntries}>
        <section className={styles.index} aria-labelledby="archive-heading" data-archive-index="true">
          <header className="sr-only">
            <h1 id="archive-heading">Archive</h1>
            <p>Experiments, visuals, and studies between client work.</p>
          </header>
          <details className={styles.catalogue}>
            <summary>
              <span className="link-underline">Index</span>
            </summary>
            <ArchiveIndexScroll className={styles.catalogueBody}>
              <p className="sr-only">
                A collection of interface experiments, motion stills, material studies,
                and visual references by Alexander Yansons. Explore the canvas or open
                a fragment directly from the list below.
              </p>
              <ol className={styles.entries}>
                {archiveEntries.map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <h2>
                        <ArchiveIndexLink id={entry.id} href={entry.image} title={entry.title} />
                      </h2>
                      <p className={styles.entryDescription}>
                        {entry.year} · {entry.medium} · {entry.kind === "video" ? "Video" : "Image"}
                      </p>
                      <p className={styles.entryDescription}>{entry.note}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </ArchiveIndexScroll>
          </details>
        </section>
      </ArchiveCanvas>
      <noscript>
        <style>{'[data-archive-experience="true"] { position: static !important; height: auto !important; min-height: 0 !important; overflow: visible !important; } [data-archive-scene="true"], [data-archive-hud="true"] { display: none !important; }'}</style>
      </noscript>
    </>
  );
}
