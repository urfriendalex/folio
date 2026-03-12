import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectPage } from "@/components/projects/ProjectPage";
import { getProjectBySlug, getProjectSiblings, projects } from "@/content/projects";

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

  return {
    title: `${project.title} | Alexander Y.`,
    description: project.description,
  };
}

export default async function ProjectRoute({ params }: RouteProps) {
  const resolvedParams = await Promise.resolve(params);
  const project = getProjectBySlug(resolvedParams.slug);

  if (!project) {
    notFound();
  }

  const { previous, next } = getProjectSiblings(project.slug);

  return <ProjectPage project={project} previousProject={previous} nextProject={next} />;
}
