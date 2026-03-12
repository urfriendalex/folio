import { archiveManifest } from "@/lib/generated/archive-manifest";

export type ProjectSection = {
  eyebrow: string;
  title: string;
  copy: string;
  tone: string;
  notes: string[];
};

export type Project = {
  slug: string;
  title: string;
  year: string;
  summary: string;
  routeLabel: string;
  studioLabel: string;
  accent: string;
  heroKicker: string;
  heroStatement: string;
  deck: string;
  tags: string[];
  overlayLabel: string;
  overlayBody: string;
  tech: string[];
  sections: ProjectSection[];
};

export const siteMeta = {
  name: "Alexander Y.",
  label: "web / motion",
  intro: "minimal websites, motion, frontend.",
  overlayBio: "designer + frontend developer. simple websites with motion.",
  email: "hello@alexandery.dev",
  instagram: "https://instagram.com",
  linkedin: "https://linkedin.com",
  location: "Warsaw / remote",
};

export type SiteMeta = typeof siteMeta;

export const orderedProjects: Project[] = [
  {
    slug: "kinoproby",
    title: "KINOPROBY",
    year: "2019",
    routeLabel: "Film production portfolio",
    studioLabel: "index / stills / type",
    accent: "#101010",
    heroKicker: "featured",
    heroStatement: "film duo portfolio.",
    summary: "project-first landing page.",
    deck: "stills first. explanation later.",
    tags: ["direction", "frontend", "motion"],
    overlayLabel: "about",
    overlayBody: "simple frame system for stills, short copy, and controlled motion.",
    tech: ["Next.js", "GSAP", "SCSS modules"],
    sections: [
      {
        eyebrow: "layout",
        title: "entry frame",
        copy: "still, title, route.",
        tone: "flat / black / white",
        notes: ["stills first", "short copy"],
      },
    ],
  },
  {
    slug: "diana-milkanova",
    title: "DIANA MILKANOVA",
    year: "2020",
    routeLabel: "Independent fashion e-commerce",
    studioLabel: "product / grid / calm",
    accent: "#101010",
    heroKicker: "selected",
    heroStatement: "fashion storefront.",
    summary: "quiet product pages.",
    deck: "clean structure with light motion.",
    tags: ["e-commerce", "art direction", "frontend"],
    overlayLabel: "about",
    overlayBody: "reduced layout for products and basic motion.",
    tech: ["Shopify", "Next.js", "Lenis"],
    sections: [
      {
        eyebrow: "layout",
        title: "product grid",
        copy: "big images. low noise.",
        tone: "flat / monochrome / clean",
        notes: ["product first", "minimal chrome"],
      },
    ],
  },
  {
    slug: "fujin-sushi",
    title: "FUJIN SUSHI",
    year: "2020",
    routeLabel: "Restaurant ordering experience",
    studioLabel: "service / menu / order",
    accent: "#101010",
    heroKicker: "selected",
    heroStatement: "restaurant ordering page.",
    summary: "fast access, low friction.",
    deck: "utility-led layout.",
    tags: ["ux", "frontend", "conversion"],
    overlayLabel: "about",
    overlayBody: "utility-led page with direct actions and sparse styling.",
    tech: ["React", "SCSS", "ordering integrations"],
    sections: [
      {
        eyebrow: "layout",
        title: "fast actions",
        copy: "menu and order controls stay close.",
        tone: "flat / direct / dark",
        notes: ["quick entry", "clear actions"],
      },
    ],
  },
  {
    slug: "lk-digital-course",
    title: "LK DIGITAL COURSE",
    year: "2021",
    routeLabel: "Learning product landing page",
    studioLabel: "course / landing / info",
    accent: "#101010",
    heroKicker: "selected",
    heroStatement: "course landing page.",
    summary: "short sections, clear order.",
    deck: "proof, details, offer.",
    tags: ["landing page", "conversion", "copy systems"],
    overlayLabel: "about",
    overlayBody: "conversion page with reduced styling and staged content.",
    tech: ["Next.js", "GSAP", "content systems"],
    sections: [
      {
        eyebrow: "layout",
        title: "reading order",
        copy: "proof, details, offer.",
        tone: "flat / modular / clear",
        notes: ["simple order", "low noise"],
      },
    ],
  },
];

export function getProjectBySlug(slug: string) {
  return orderedProjects.find((project) => project.slug === slug);
}

export function getProjectSiblings(slug: string) {
  const index = orderedProjects.findIndex((project) => project.slug === slug);

  if (index === -1) {
    return {
      previous: orderedProjects[orderedProjects.length - 1],
      next: orderedProjects[0],
    };
  }

  return {
    previous:
      orderedProjects[(index - 1 + orderedProjects.length) % orderedProjects.length],
    next: orderedProjects[(index + 1) % orderedProjects.length],
  };
}

export const archiveItems = archiveManifest;
