import { dianaMilkanovaProject } from "./diana-milkanova";
import { fujinSushiProject } from "./fujin-sushi";
import { kinoprobyProject } from "./kinoproby";
import { lkDigitalCourseProject } from "./lk-digital-course";

export const projects = [
  kinoprobyProject,
  dianaMilkanovaProject,
  fujinSushiProject,
  lkDigitalCourseProject,
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
