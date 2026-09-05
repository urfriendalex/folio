import type { ProjectEntry } from "./types";
import { generatedProjectMedia } from "./generated-media";

export const monNomBakeryProject: ProjectEntry = {
  slug: "mon-nom-bakery",
  orderIndex: 4,
  title: "MON NOM BAKERY",
  cardDescriptor: "WEBSITE + MENU",
  category: "product",
  descriptor: "Custom bilingual restaurant website and interactive menu experience",
  year: "2026",
  role: "Solo Designer & Developer",
  technologies: ["Next.js", "Sanity", "React", "SCSS", "Technical SEO"],
  shortDescription:
    "Custom restaurant website and interactive menu with two fully Sanity-managed languages and AI-ready SEO.",
  description:
    "A custom Next.js website and menu experience for Mon Nom Bakery, built around the restaurant's identity, bilingual content, subtle food-focused interactions, and strong technical and AI-search SEO foundations.",
  overview:
    "A mobile-first restaurant experience that connects the landing page, menu, food imagery, practical information, and location choices in one focused flow. Polish and English are both fully managed in Sanity, giving the team direct control over every public-facing version without code changes.",
  roleSummary:
    "Solo design and development: experience direction, custom Next.js frontend, interactive menu, bilingual Sanity architecture, AI-ready SEO, location configuration, branded QR codes, and launch polish.",
  responsibilities: [
    "Website structure and visual direction",
    "Next.js frontend build",
    "Custom Sanity admin panel",
    "Two fully CMS-managed language versions",
    "Configurable multi-location options",
    "Technical and AI-search SEO implementation",
    "Custom QR code design",
    "Interactive menu with contextual image previews",
    "Brand identity alignment across content and interface",
    "Interaction polish across desktop and mobile",
  ],
  client: {
    name: "Mon Nom Bakery",
    type: "Restaurant website and digital menu",
    industry: "Hospitality / restaurant",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "Worked from the brand direction and product needs into a finished public website.",
  },
  stack: {
    platform: ["Next.js", "Sanity"],
    frontend: ["React", "SCSS"],
    notes:
      "Next.js for the public experience, with a custom Sanity setup controlling both language versions, menu content, restaurant information, and location options.",
  },
  features: [
    "Custom brand-aligned restaurant website",
    "Interactive menu with animated image previews",
    "Polish and English content fully managed in Sanity",
    "Sanity-managed location configuration",
    "Technical SEO and AI-search discoverability",
    "Branded QR codes",
    "Direct menu and order paths",
    "Responsive layouts for quick mobile browsing",
  ],
  impact: {
    summary:
      "A distinctive restaurant website that lets the food and identity lead while keeping the menu, location details, and practical actions immediate.",
    highlights: [
      "Food-first visual rhythm",
      "One Sanity workflow for day-to-day content across both languages",
      "Search foundations designed for conventional and AI-assisted discovery",
      "Interactive menu imagery that adds detail without slowing browsing",
      "QR codes that stay aligned with the visual identity",
      "Low-friction browsing on mobile",
      "Brand tone carried through layout and interaction",
    ],
  },
  tags: ["Next.js", "Sanity", "React", "Restaurant", "Interactive Menu", "Bilingual", "SEO", "AI SEO", "CMS", "QR Codes"],
  links: [{ label: "Live Site", url: "https://www.monnombakery.com/" }],
  ...generatedProjectMedia["mon-nom-bakery"],
};
