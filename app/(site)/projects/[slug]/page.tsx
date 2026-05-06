import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProjectBySlug, getProjectSiblings, projects } from "@/content/projects";
import { projectShareDescription, projectShareOgImage } from "@/lib/metadata";
import { SITE_LAST_UPDATED, SITE_URL } from "@/lib/site";

const ProjectPage = dynamic(() =>
  import("@/components/projects/ProjectPage").then((mod) => ({ default: mod.ProjectPage })),
);

type RouteProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

export function generateStaticParams() {
  return projects.map((project) => ({
    slug: project.slug,
  }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const project = getProjectBySlug(resolvedParams.slug);

  if (!project) {
    return {};
  }

  const canonical = `/projects/${project.slug}`;
  const description = projectShareDescription(project);
  const og = projectShareOgImage(project);

  return {
    title: `${project.title} | Alexander Y.`,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${project.title} | Alexander Y.`,
      description,
      type: "article",
      url: `${SITE_URL}${canonical}`,
      images: [og],
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.title} | Alexander Y.`,
      description,
      images: [og.url],
    },
  };
}

export default async function ProjectRoute({ params }: RouteProps) {
  const resolvedParams = await Promise.resolve(params);
  const project = getProjectBySlug(resolvedParams.slug);

  if (!project) {
    notFound();
  }

  const { previous, next } = getProjectSiblings(project.slug);
  const pageUrl = `${SITE_URL}/projects/${project.slug}`;
  const og = projectShareOgImage(project);

  const creativeWorkSchema = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${pageUrl}#project`,
    name: project.title,
    url: pageUrl,
    headline: project.title,
    description: projectShareDescription(project),
    image: og.url,
    dateModified: SITE_LAST_UPDATED.toISOString(),
    author: {
      "@type": "Person",
      name: "Alexander Yansons",
      url: SITE_URL,
    },
    keywords: project.technologies.join(", "),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: project.title,
        item: pageUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([creativeWorkSchema, breadcrumbSchema]) }}
      />
      <ProjectPage project={project} previousProject={previous} nextProject={next} />
    </>
  );
}
