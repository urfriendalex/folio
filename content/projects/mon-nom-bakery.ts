import type { ProjectEntry } from "./types";
import { generatedProjectMedia } from "./generated-media";

export const monNomBakeryProject: ProjectEntry = {
  slug: "mon-nom-bakery",
  orderIndex: 0,
  title: "MON NOM BAKERY",
  cardDescriptor: "DIGITAL MENU",
  descriptor: "Brand-led bakery website, digital menu, and custom content platform",
  year: "2026",
  role: "Design + Frontend",
  technologies: ["Next.js", "Sanity", "React", "SCSS"],
  shortDescription:
    "Next.js bakery website with a custom Sanity admin panel, branded QR codes, and close alignment between the interface, content model, and brand identity.",
  description:
    "Brand-forward Next.js website for Mon Nom Bakery, with a custom Sanity admin panel behind the content and a public experience tuned to the bakery's visual identity.",
  overview:
    "A compact site for a bakery where the product needs to feel immediate: food, tone, menu, and ordering without overexplaining the brand. The CMS side was shaped around the same brand logic, so updates stay clear for the team.",
  roleSummary:
    "Design direction, Next.js frontend, custom Sanity admin setup, branded QR codes, and responsive polish for the public site.",
  responsibilities: [
    "Website structure and visual direction",
    "Next.js frontend build",
    "Custom Sanity admin panel",
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
    "Branded QR codes",
    "Direct menu and order paths",
    "Responsive layouts for quick mobile browsing",
  ],
  impact: {
    summary:
      "A bakery site that lets the product lead, while keeping practical actions easy to find.",
    highlights: [
      "Food-first visual rhythm",
      "Admin content structure that matches day-to-day bakery updates",
      "QR codes that stay aligned with the visual identity",
      "Low-friction browsing on mobile",
      "Brand tone carried through layout and interaction",
    ],
  },
  tags: ["Next.js", "Sanity", "React", "Frontend", "Food", "Bakery", "CMS", "QR Codes"],
  links: [{ label: "Live Site", url: "https://www.monnombakery.com/" }],
  ...generatedProjectMedia["mon-nom-bakery"],
};
