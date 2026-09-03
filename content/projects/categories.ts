import type { ProjectCategory, ProjectEntry } from "./types";

export type { ProjectCategory };

export type ProjectFilterId = "all" | ProjectCategory;

export const PROJECT_FILTERS: { id: ProjectFilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "portfolio", label: "Portfolios" },
  { id: "product", label: "Product UI" },
  { id: "event", label: "Events" },
];

const FILTER_ALIASES: Record<string, ProjectFilterId> = {
  all: "all",
  ecommerce: "ecommerce",
  "e-commerce": "ecommerce",
  shop: "ecommerce",
  shopify: "ecommerce",
  store: "ecommerce",
  portfolio: "portfolio",
  portfolios: "portfolio",
  creative: "portfolio",
  product: "product",
  "product-ui": "product",
  saas: "product",
  app: "product",
  event: "event",
  events: "event",
};

export function parseProjectFilter(value: string | string[] | undefined | null): ProjectFilterId {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return "all";
  }

  return FILTER_ALIASES[raw.trim().toLowerCase()] ?? "all";
}

export function projectFilterLabel(id: ProjectFilterId) {
  return PROJECT_FILTERS.find((filter) => filter.id === id)?.label ?? "All";
}

export function filterProjectsByType(projects: ProjectEntry[], filter: ProjectFilterId) {
  if (filter === "all") {
    return projects;
  }

  return projects.filter((project) => project.category === filter);
}

export function projectFilterCounts(projects: ProjectEntry[]) {
  const counts = {
    all: projects.length,
    ecommerce: 0,
    portfolio: 0,
    product: 0,
    event: 0,
  } satisfies Record<ProjectFilterId, number>;

  projects.forEach((project) => {
    counts[project.category] += 1;
  });

  return counts;
}
