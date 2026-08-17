import type { ProjectEntry } from "./types";
import { generatedProjectMedia } from "./generated-media";

export const linaTsapovaProject: ProjectEntry = {
  slug: "lina-tsapova",
  orderIndex: 8,
  title: "LINA TSAPOVA",
  cardDescriptor: "PHOTO PORTFOLIO",
  descriptor: "Image-led Svelte portfolio with browser-native view transitions",
  year: "2026",
  role: "Solo Designer & Developer",
  technologies: ["Svelte", "View Transitions API", "JavaScript", "CSS"],
  shortDescription:
    "Svelte portfolio with app-level transitions powered by the View Transitions API.",
  description:
    "Creative portfolio for Lina Tsapova, built in Svelte with View Transitions API motion between app states, plus a visual-first presentation of work, biography, and contact.",
  overview:
    "A personal portfolio built to feel direct and image-led, giving the work room to speak while still making biography and contact easy to reach. Svelte handles the app structure, while the View Transitions API gives route and state changes a continuous feel.",
  roleSummary:
    "Design direction, Svelte frontend, View Transitions API motion, and responsive interaction polish.",
  responsibilities: [
    "Portfolio structure and art direction",
    "Svelte frontend build",
    "View Transitions API app transitions",
    "Gallery and content presentation",
    "Domain-ready launch setup",
  ],
  client: {
    name: "Lina Tsapova",
    type: "Personal portfolio",
    industry: "Creative work",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "Built and launched the site on Lina's public domain.",
  },
  stack: {
    platform: ["Svelte"],
    frontend: ["JavaScript", "CSS", "View Transitions API"],
    notes:
      "Svelte app with browser-native View Transitions API motion for page and state changes.",
  },
  features: [
    "Image-led portfolio structure",
    "View Transitions API route and state motion",
    "Clean biography and contact path",
    "Production domain launch",
  ],
  impact: {
    summary:
      "A live portfolio that gives the photography a focused, continuous browsing experience.",
    highlights: [
      "Work and identity share one clear visual line",
      "App transitions make navigation feel continuous",
      "Simple route from browsing to contact",
      "Launched on the final public domain",
    ],
  },
  tags: ["Svelte", "View Transitions API", "Frontend", "Portfolio", "Creative Development"],
  links: [{ label: "Live Site", url: "https://www.linatsapova.com/" }],
  ...generatedProjectMedia["lina-tsapova"],
};
