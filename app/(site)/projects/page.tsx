import type { Metadata } from "next";
import { ProjectsIndex } from "@/components/projects/ProjectsIndex/ProjectsIndex";
import { parseProjectFilter, projects } from "@/content/projects";
import { clampMetaDescription, SITE_OG_IMAGE } from "@/lib/metadata";
import { SITE_LAST_UPDATED, SITE_URL } from "@/lib/site";

type ProjectsIndexRouteProps = {
  searchParams: Promise<{ type?: string | string[] }>;
};

const projectsDescription = clampMetaDescription(
  "Selected websites, product UI, and editorial work by Alexander Yansons — a full index of recent projects.",
);

export const metadata: Metadata = {
  title: "Work · Alexander Yansons",
  description: projectsDescription,
  alternates: {
    canonical: "/projects",
  },
  openGraph: {
    title: "Work · Alexander Yansons",
    description: projectsDescription,
    type: "website",
    url: `${SITE_URL}/projects`,
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Work · Alexander Yansons",
    description: projectsDescription,
    images: [SITE_OG_IMAGE.url],
  },
};

export default async function ProjectsIndexRoute({ searchParams }: ProjectsIndexRouteProps) {
  const params = await searchParams;
  const initialFilter = parseProjectFilter(params.type);
  const pageUrl = `${SITE_URL}/projects`;
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#work`,
    name: "Work · Alexander Yansons",
    url: pageUrl,
    description: projectsDescription,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    dateModified: SITE_LAST_UPDATED.toISOString(),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: projects.length,
      itemListElement: projects.map((project, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}/projects/${project.slug}`,
        name: project.title,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <ProjectsIndex projects={projects} initialFilter={initialFilter} />
    </>
  );
}
