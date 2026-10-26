import { normalizeProjectMediaSlots } from "@/lib/projectMedia";
import type { ProjectMediaAsset, ProjectThumbnailVariant } from "./types";
import { projectMediaTones } from "./media-tones";

export type { ProjectCategory, ProjectFilterId } from "./categories";
export {
  filterProjectsByType,
  parseProjectFilter,
  PROJECT_FILTERS,
  projectFilterCounts,
  projectFilterLabel,
} from "./categories";

import { axirosAxfAxessProject } from "./axiros-axf-axess";
import { dianaMilkanovaProject } from "./diana-milkanova";
import { fullCourseStudioProject } from "./full-course-studio";
import { kinoprobyProject } from "./kinoproby";
import { linaTsapovaProject } from "./lina-tsapova";
import { lumanoProject } from "./lumano";
import { monNomBakeryProject } from "./mon-nom-bakery";
import { ohgotmiProject } from "./ohgotmi";
import { pastelMuseProject } from "./pastel-muse";
import { portfolioV1YansonsProject } from "./portfolio-v1-yansons";
import { projectMediaOrderIndexBySlug } from "./project-media-order";
import { studioIskraProject } from "./studio-iskra";
import { y2kWarsawProject } from "./y2k-warsaw";

const projectEntries = [
  y2kWarsawProject,
  fullCourseStudioProject,
  lumanoProject,
  monNomBakeryProject,
  linaTsapovaProject,
  axirosAxfAxessProject,
  dianaMilkanovaProject,
  kinoprobyProject,
  ohgotmiProject,
  pastelMuseProject,
  portfolioV1YansonsProject,
  studioIskraProject,
];

/* Tone previews are attached here, server-side, so a page only serializes the ones its media uses
   (client code imports `./categories` / types, never this module). */
function withAssetTone<T extends ProjectMediaAsset | undefined>(asset: T): T {
  if (!asset) return asset;
  const tone = projectMediaTones[asset.poster ?? asset.src];
  return tone ? { ...asset, tone } : asset;
}

function withPosterTone<T extends ProjectThumbnailVariant | undefined>(variant: T): T {
  if (!variant) return variant;
  const tone = projectMediaTones[variant.poster];
  return tone ? { ...variant, tone } : variant;
}

/** Sorted by each entry's `orderIndex` (see `content/projects/types.ts`). Gallery order: `project-media-order.ts`. */
export const projects = [...projectEntries]
  .sort((a, b) => a.orderIndex - b.orderIndex)
  .map((project) => ({
    ...project,
    thumbnail: {
      ...project.thumbnail,
      desktop: withPosterTone(project.thumbnail.desktop),
      mobile: withPosterTone(project.thumbnail.mobile),
    },
    media: normalizeProjectMediaSlots(project.media, projectMediaOrderIndexBySlug[project.slug]).map((slot) => ({
      ...slot,
      desktop: withAssetTone(slot.desktop),
      mobile: withAssetTone(slot.mobile),
    })),
  }));

/** Home Work section teaser; full list lives on `/projects`. */
export const HOME_RECENT_PROJECT_COUNT = 6;

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
