import type { ProjectEntry } from "./types";
import { generatedProjectMedia } from "./generated-media";

export const dianaMilkanovaProject: ProjectEntry = {
  slug: "diana-milkanova",
  orderIndex: 5,
  title: "DIANA MILKANOVA",
  descriptor: "Independent fashion e-commerce",
  year: "2021",
  role: "Frontend Developer",
  technologies: ["Shopify", "Liquid", "HTML", "CSS", "JavaScript"],
  shortDescription:
    "Sparse Shopify storefront for a small fashion label: editorial layout, products first.",
  description:
    "Liquid-heavy Shopify front, closer to a fashion site than a stock theme, with the product and brand at the center.",
  overview: "Commerce that reads editorial instead of default Shopify chrome.",
  roleSummary: "Theme work in Liquid, layout, and UI across the main shop flows.",
  responsibilities: [
    "Custom theme & Liquid",
    "Frontend layout and styling",
    "E-commerce UI refinement",
  ],
  client: {
    name: "Diana Milkanova",
    type: "E-commerce shop",
    industry: "Fashion e-commerce",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "Worked direct with the client; I shipped the implementation.",
  },
  stack: {
    platform: ["Shopify"],
    frontend: ["Liquid", "HTML", "CSS", "JavaScript"],
    notes: "Theme-level Liquid wherever defaults got in the way.",
  },
  features: [
    "Custom theme styling",
    "Editorial product presentation",
    "Responsive shop layouts",
  ],
  impact: {
    summary: "Feels more intentional than an off-the-shelf Shopify skin.",
    highlights: [
      "Visual voice that beats generic themes",
      "Product reads before chrome does",
      "One consistent brand line through checkout",
    ],
  },
  tags: ["E-commerce", "Shopify", "Liquid", "Frontend", "Custom Theme", "Fashion"],
  links: [{ label: "Live Site", url: "https://dianamilkanova.com" }],
  ...generatedProjectMedia["diana-milkanova"],
};
