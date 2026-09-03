import type { ProjectEntry } from "./types";
import { generatedProjectMedia } from "./generated-media";

export const lumanoProject: ProjectEntry = {
  slug: "lumano",
  orderIndex: 0,
  title: "LUMANO",
  cardDescriptor: "E-COMMERCE STORE",
  category: "ecommerce",
  descriptor: "Custom Shopify storefront and configurable theme system",
  year: "2026",
  role: "Solo Designer & Developer",
  technologies: ["Shopify", "Liquid", "JavaScript", "CSS"],
  shortDescription:
    "Custom Shopify store with configurable components and complete theme control for Lumano's identity.",
  description:
    "I designed and built Lumano's storefront as a fully customized Shopify theme, with configurable editorial and commerce components that the client can manage without diluting the brand.",
  overview:
    "A dark, product-led commerce experience for handmade silver jewelry. The theme turns Shopify into a flexible brand system across landing pages, collections, products, information pages, localization, and checkout-oriented flows.",
  roleSummary:
    "Solo design and development: creative direction, Shopify architecture, Liquid components, frontend behavior, and launch.",
  responsibilities: [
    "Brand-led storefront design",
    "Custom Shopify theme architecture",
    "Configurable Liquid sections and components",
    "Collection and product-page systems",
    "Localization and market-aware storefront UI",
    "Responsive interaction and launch polish",
  ],
  client: {
    name: "Lumano",
    type: "E-commerce store",
    industry: "Jewelry / fashion",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "I owned the complete design and development process, working directly with the client.",
  },
  stack: {
    platform: ["Shopify"],
    frontend: ["Liquid", "JavaScript", "CSS"],
    notes:
      "A deeply customized Shopify theme with reusable, merchant-configurable components rather than fixed page templates.",
  },
  features: [
    "Configurable editorial homepage",
    "Custom collection and product layouts",
    "Theme-wide identity controls",
    "Market, currency, and localization support",
    "Reusable information and navigation components",
  ],
  impact: {
    summary:
      "A commerce system that looks specific to Lumano while remaining practical for the client to operate.",
    highlights: [
      "Brand identity carried through every Shopify surface",
      "Flexible content without developer-only updates",
      "Product-first browsing across desktop and mobile",
      "One coherent theme across commerce and editorial content",
    ],
  },
  tags: ["Shopify", "Liquid", "E-commerce", "Frontend", "Theme Development", "JavaScript", "Fashion"],
  links: [{ label: "Live Site", url: "https://lumano.eu/" }],
  ...generatedProjectMedia["lumano"],
};
