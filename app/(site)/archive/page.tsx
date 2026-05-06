import type { Metadata } from "next";
import { ArchiveCanvas } from "@/components/Archive/ArchiveCanvas";
import { archiveEntries } from "@/content/archive/archive-data";
import { clampMetaDescription, SITE_OG_IMAGE } from "@/lib/metadata";
import { SITE_LAST_UPDATED, SITE_URL } from "@/lib/site";

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
    dateModified: SITE_LAST_UPDATED.toISOString(),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <ArchiveCanvas items={archiveEntries} />
    </>
  );
}
