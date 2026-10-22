import type { Metadata } from "next";
import { ProjectsIndex } from "@/components/projects/ProjectsIndex/ProjectsIndex";
import { parseProjectFilter, projects } from "@/content/projects";
import { clampMetaDescription, SITE_NAME, SITE_OG_IMAGE } from "@/lib/metadata";
import { PAGE_LAST_MODIFIED, SITE_URL } from "@/lib/site";
import { breadcrumbEntity, jsonLd, PERSON_ID, WEBSITE_ID } from "@/lib/structuredData";

type ProjectsIndexRouteProps = {
  searchParams: Promise<{ type?: string | string[] }>;
};

const projectsDescription = clampMetaDescription(
  "Case studies by Alexander Yansons: Shopify e-commerce stores, film and photo portfolios, Next.js websites, and enterprise product UI built from Warsaw.",
);

export const metadata: Metadata = {
  title: "Work — Websites, E-commerce & Product UI Case Studies",
  description: projectsDescription,
  alternates: {
    canonical: "/projects",
  },
  openGraph: {
    siteName: SITE_NAME,
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
    "@type": "CollectionPage",
    "@id": `${pageUrl}#work`,
    name: "Work · Alexander Yansons",
    url: pageUrl,
    description: projectsDescription,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    author: { "@id": PERSON_ID },
    dateModified: PAGE_LAST_MODIFIED.projects,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: projects.length,
      itemListElement: projects.map((project, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_URL}/projects/${project.slug}`,
        name: project.title,
        description: project.descriptor,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(collectionSchema, breadcrumbEntity([{ name: "Work", path: "/projects" }])),
        }}
      />
      <ProjectsIndex projects={projects} initialFilter={initialFilter} />
    </>
  );
}
