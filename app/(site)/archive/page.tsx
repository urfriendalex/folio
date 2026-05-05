import type { Metadata } from "next";
import { ArchiveCanvas } from "@/components/Archive/ArchiveCanvas";
import { archiveEntries } from "@/content/archive/archive-data";
import { SITE_LAST_UPDATED, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Archive · Alexander Yansons",
  description: "An infinite spatial archive of experiments, concepts, and supporting visual work.",
  alternates: {
    canonical: "/archive",
  },
  openGraph: {
    title: "Archive · Alexander Yansons",
    description: "An infinite spatial archive of experiments, concepts, and supporting visual work.",
    type: "website",
    url: `${SITE_URL}/archive`,
    images: [
      {
        url: "/archive/desktop.webp",
        alt: "Collage of archive experiments and visual studies",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Archive · Alexander Yansons",
    description: "An infinite spatial archive of experiments, concepts, and supporting visual work.",
    images: ["/archive/desktop.webp"],
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
    description:
      "Spatial archive of experiments, concepts, and supporting visual work by Alexander Yansons.",
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
