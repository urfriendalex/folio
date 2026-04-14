import { dianaMilkanovaProject } from "./diana-milkanova";
import { kinoprobyProject } from "./kinoproby";
import { ohgotmiProject } from "./ohgotmi";
import { pastelMuseProject } from "./pastel-muse";
import { studioIskraProject } from "./studio-iskra";

/** Featured entries first, then the rest in a stable order. */
export const projects = [
  studioIskraProject,
  ohgotmiProject,
  kinoprobyProject,
  dianaMilkanovaProject,
  pastelMuseProject,
];

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
