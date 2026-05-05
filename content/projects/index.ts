import { normalizeProjectMediaSlots } from "@/lib/projectMedia";

import { axirosAxfAxessProject } from "./axiros-axf-axess";
import { dianaMilkanovaProject } from "./diana-milkanova";
import { kinoprobyProject } from "./kinoproby";
import { ohgotmiProject } from "./ohgotmi";
import { pastelMuseProject } from "./pastel-muse";
import { portfolioV1YansonsProject } from "./portfolio-v1-yansons";
import { projectMediaOrderIndexBySlug } from "./project-media-order";
import { studioIskraProject } from "./studio-iskra";

const projectEntries = [
  axirosAxfAxessProject,
  dianaMilkanovaProject,
  kinoprobyProject,
  ohgotmiProject,
  pastelMuseProject,
  portfolioV1YansonsProject,
  studioIskraProject,
];

/** Sorted by each entry's `orderIndex` (see `content/projects/types.ts`). Gallery order: `project-media-order.ts`. */
export const projects = [...projectEntries]
  .sort((a, b) => a.orderIndex - b.orderIndex)
  .map((project) => ({
    ...project,
    media: normalizeProjectMediaSlots(project.media, projectMediaOrderIndexBySlug[project.slug]),
  }));

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}

export function getProjectSiblings(slug: string) {
  const index = projects.findIndex((project) => project.slug === slug);

  return {
    previous: projects[(index - 1 + projects.length) % projects.length],
    next: projects[(index + 1) % projects.length],
  };
}
