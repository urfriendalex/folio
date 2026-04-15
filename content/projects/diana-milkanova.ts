import type { ProjectEntry } from "./types";

export const dianaMilkanovaProject: ProjectEntry = {
  slug: "diana-milkanova",
  title: "DIANA MILKANOVA",
  descriptor: "Independent fashion e-commerce",
  year: "2021",
  role: "Frontend Developer",
  technologies: ["Shopify", "Liquid", "HTML", "CSS", "JavaScript"],
  shortDescription:
    "Minimal Shopify storefront for an independent fashion label—editorial layout, product-first.",
  description:
    "Custom Shopify frontend using Liquid: a refined, editorial-style store beyond default themes, with the product and brand identity at the center.",
  overview: "Shopify e-commerce shaped to read more like a fashion site than a generic template.",
  roleSummary: "Custom theme work in Liquid, layout, and UI for core shop flows.",
  responsibilities: [
    "Custom theme & Liquid",
    "Frontend layout and styling",
    "E-commerce UI refinement",
  ],
  client: {
    name: "Diana Milkanova",
    type: "Fashion / personal brand",
    industry: "E-commerce, fashion",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "Directly with the client; I owned implementation.",
  },
  stack: {
    platform: ["Shopify"],
    frontend: ["Liquid", "HTML", "CSS", "JavaScript"],
    notes: "Theme-level Liquid to override default behavior where needed.",
  },
  features: [
    "Custom theme styling",
    "Editorial product presentation",
    "Responsive shop layouts",
  ],
  impact: {
    summary: "A more premium, brand-aligned storefront than out-of-the-box Shopify themes.",
    highlights: [
      "Stronger visual identity vs templates",
      "Clearer product focus",
      "Cohesive branded experience",
    ],
  },
  tags: ["E-commerce", "Shopify", "Liquid", "Frontend", "Custom Theme", "Fashion"],
  links: [{ label: "Live Site", url: "https://dianamilkanova.com" }],
  featured: false,
  thumbnail: "/images/project-placeholder.svg",
  stills: ["/archive/frame-02.svg", "/archive/frame-04.svg", "/archive/frame-08.svg"],
};
