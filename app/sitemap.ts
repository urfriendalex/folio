import type { MetadataRoute } from "next";
import { projects } from "@/content/projects";
import type { ProjectEntry } from "@/content/projects/types";
import { PAGE_LAST_MODIFIED, SITE_URL } from "@/lib/site";

/** Image sitemap entries: still images and video posters from the case-study gallery. */
function projectImages(project: ProjectEntry): string[] {
  const urls = project.media
    .map((slot) => (slot.kind === "video" ? slot.desktop.poster : slot.desktop.src))
    .filter((src): src is string => Boolean(src))
    .map((src) => `${SITE_URL}${src}`);
  return [...new Set(urls)];
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: PAGE_LAST_MODIFIED.home,
      images: [`${SITE_URL}/og.png`],
    },
    {
      url: `${SITE_URL}/projects`,
      lastModified: PAGE_LAST_MODIFIED.projects,
    },
    {
      url: `${SITE_URL}/archive`,
      lastModified: PAGE_LAST_MODIFIED.archive,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: PAGE_LAST_MODIFIED.faq,
    },
    ...projects.map((project) => ({
      url: `${SITE_URL}/projects/${project.slug}`,
      lastModified: project.lastModified,
      images: projectImages(project),
    })),
  ];

  return entries;
}
