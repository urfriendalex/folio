import type { ProjectEntry } from "./types";

export const dianaMilkanovaProject: ProjectEntry = {
  slug: "diana-milkanova",
  title: "DIANA MILKANOVA",
  descriptor: "Independent fashion e-commerce",
  year: "2021",
  role: "Frontend Developer",
  technologies: ["Shopify", "Liquid", "HTML", "CSS", "JavaScript"],
  shortDescription:
    "Online store for an independent fashion label—a minimal, editorial presentation with the product at the center.",
  description:
    "An e-commerce website built on Shopify for Diana Milkanova. I implemented a fully custom frontend layer using Shopify Liquid, tailoring the visual experience beyond standard themes. The goal was to create a refined, minimal, and editorial-style storefront that highlights the product while maintaining a strong brand identity.",
  overview:
    "The project focused on building a Shopify-based e-commerce experience that feels more like a curated fashion/editorial site rather than a typical template-driven store.",
  roleSummary:
    "Implemented the storefront with custom styling and theme-level modifications using Shopify Liquid.",
  responsibilities: [
    "Custom Shopify theme development",
    "Liquid templating",
    "Frontend styling and layout",
    "UI refinement for e-commerce flows",
  ],
  client: {
    name: "Diana Milkanova",
    type: "Fashion / personal brand",
    industry: "E-commerce, fashion",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "Worked directly with the client; implementation and customization were done by me.",
  },
  stack: {
    platform: ["Shopify"],
    frontend: ["Liquid", "HTML", "CSS", "JavaScript"],
    notes: "Custom theme-level work using Shopify Liquid to override default theme behavior.",
  },
  features: [
    "Custom Shopify theme styling",
    "Editorial-style product presentation",
    "Refined product and collection pages",
    "Responsive e-commerce layouts",
    "Optimized shopping flow UX",
  ],
  impact: {
    summary:
      "Delivered a more premium and brand-aligned shopping experience compared to out-of-the-box Shopify themes.",
    highlights: [
      "Elevated visual identity beyond standard templates",
      "Improved clarity and focus on products",
      "Created a more cohesive and branded storefront",
    ],
  },
  tags: ["E-commerce", "Shopify", "Liquid", "Frontend", "Custom Theme", "Fashion"],
  links: [{ label: "Live Site", url: "https://dianamilkanova.com" }],
  status: "Live",
  featured: false,
  thumbnail: "/images/project-placeholder.svg",
  stills: ["/archive/frame-02.svg", "/archive/frame-04.svg", "/archive/frame-08.svg"],
};
