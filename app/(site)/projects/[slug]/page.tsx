import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProjectBySlug, getProjectSiblings, projects } from "@/content/projects";
import { projectPageTitle, projectShareDescription, projectShareOgImage, SITE_NAME } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import { breadcrumbEntity, jsonLd, PERSON_ID, WEBSITE_ID } from "@/lib/structuredData";
import { ProjectCaseStudy } from "@/components/projects/ProjectCaseStudy";
import { ProjectPage } from "@/components/projects/ProjectPage";

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
    notFound();
  }

  const canonical = `/projects/${project.slug}`;
  const description = projectShareDescription(project);
  const og = projectShareOgImage(project);

  const title = projectPageTitle(project);
  const shareTitle = `${title} · ${SITE_NAME}`;

  return {
    title,
    description,
    keywords: project.tags ?? project.technologies,
    alternates: {
      canonical,
    },
    openGraph: {
      siteName: SITE_NAME,
      title: shareTitle,
      description,
      type: "article",
      modifiedTime: project.lastModified,
      authors: [SITE_URL],
      tags: project.tags ?? project.technologies,
      url: `${SITE_URL}${canonical}`,
      images: [og],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
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

  const liveSite = project.links?.[0]?.url;
  const creativeWorkSchema = {
    "@type": "CreativeWork",
    "@id": `${pageUrl}#project`,
    name: project.title,
    alternativeHeadline: project.descriptor,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    headline: projectPageTitle(project),
    description: projectShareDescription(project),
    abstract: project.overview ?? project.description,
    genre: project.cardDescriptor,
    inLanguage: "en",
    image: {
      "@type": "ImageObject",
      url: og.url,
      width: og.width,
      height: og.height,
      caption: og.alt,
    },
    dateCreated: project.year.slice(0, 4),
    dateModified: project.lastModified,
    author: { "@id": PERSON_ID },
    creator: { "@id": PERSON_ID },
    isPartOf: { "@id": WEBSITE_ID },
    ...(project.client && project.client.name !== "Personal"
      ? { sourceOrganization: { "@type": "Organization", name: project.client.name } }
      : {}),
    ...(liveSite ? { sameAs: liveSite } : {}),
    keywords: (project.tags ?? project.technologies).join(", "),
    about: project.technologies.map((name) => ({ "@type": "Thing", name })),
  };

  const breadcrumbSchema = breadcrumbEntity([
    { name: "Work", path: "/projects" },
    { name: project.title, path: `/projects/${project.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(creativeWorkSchema, breadcrumbSchema) }}
      />
      <ProjectPage project={project} previousProject={previous} nextProject={next} />
      {/* The overview is the single interactive presentation. Keep readable project
          details available only when scripts cannot open it. */}
      <noscript><ProjectCaseStudy project={project} /></noscript>
    </>
  );
}
