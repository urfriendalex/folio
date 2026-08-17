import type { ProjectEntry } from "./types";
import { generatedProjectMedia } from "./generated-media";

export const monNomBakeryProject: ProjectEntry = {
  slug: "mon-nom-bakery",
  orderIndex: 4,
  title: "MON NOM BAKERY",
  cardDescriptor: "BAKERY PLATFORM",
  descriptor: "Localized bakery platform with configurable content and locations",
  year: "2026",
  role: "Solo Designer & Developer",
  technologies: ["Next.js", "Sanity", "React", "SCSS"],
  shortDescription:
    "Localized Next.js bakery experience with configurable locations, language switching, and a custom Sanity admin.",
  description:
    "Brand-forward Next.js experience for Mon Nom Bakery, now expanded with a landing flow, complete language switching, configurable location options, and a custom Sanity admin behind every operational detail.",
  overview:
    "A mobile-first bakery experience where landing content, language, location choices, menu details, and ordering paths stay coherent. The full setup is managed in Sanity so the team can adjust the experience without code changes.",
  roleSummary:
    "Solo design and development: visual direction, Next.js frontend, custom Sanity admin, localization, location configuration, branded QR codes, and launch polish.",
  responsibilities: [
    "Website structure and visual direction",
    "Next.js frontend build",
    "Custom Sanity admin panel",
    "Full-site language switching",
    "Configurable multi-location options",
    "Custom QR code design",
    "Menu and order-oriented user flow",
    "Brand identity alignment across content and interface",
    "Interaction polish across desktop and mobile",
  ],
  client: {
    name: "Mon Nom Bakery",
    type: "Bakery website",
    industry: "Food / bakery",
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
      "Next.js for the public site, with a custom Sanity admin panel designed around the bakery's content and brand needs.",
  },
  features: [
    "Warm editorial product presentation",
    "Custom Sanity admin workflow",
    "Localized landing and menu experience",
    "Sanity-managed location configuration",
    "Branded QR codes",
    "Direct menu and order paths",
    "Responsive layouts for quick mobile browsing",
  ],
  impact: {
    summary:
      "A bakery site that lets the product lead, while keeping practical actions easy to find.",
    highlights: [
      "Food-first visual rhythm",
      "Admin controls for day-to-day content, language, and location updates",
      "QR codes that stay aligned with the visual identity",
      "Low-friction browsing on mobile",
      "Brand tone carried through layout and interaction",
    ],
  },
  tags: ["Next.js", "Sanity", "React", "Frontend", "Food", "Bakery", "CMS", "QR Codes"],
  links: [{ label: "Live Site", url: "https://www.monnombakery.com/" }],
  ...generatedProjectMedia["mon-nom-bakery"],
};
