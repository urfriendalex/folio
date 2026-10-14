import type { MetadataRoute } from "next";
import { projects } from "@/content/projects";
import { PAGE_LAST_MODIFIED, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: PAGE_LAST_MODIFIED.home,
    },
    {
      url: `${SITE_URL}/archive`,
      lastModified: PAGE_LAST_MODIFIED.archive,
    },
    {
      url: `${SITE_URL}/projects`,
      lastModified: PAGE_LAST_MODIFIED.projects,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: PAGE_LAST_MODIFIED.faq,
    },
    ...projects.map((project) => ({
      url: `${SITE_URL}/projects/${project.slug}`,
      lastModified: project.lastModified,
    })),
  ];

  return entries;
}
