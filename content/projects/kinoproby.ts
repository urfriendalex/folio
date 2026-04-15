import type { ProjectEntry } from "./types";

export const kinoprobyProject: ProjectEntry = {
  slug: "kinoproby",
  title: "KINOPROBY",
  descriptor: "Portfolio website for a bold visual production duo",
  year: "2019",
  role: "Solo Designer & Developer",
  technologies: ["Tilda", "HTML", "CSS", "JavaScript"],
  shortDescription:
    "Portfolio for a visual duo working in film, photography, and art. A bold, image-led site that feels closer to a magazine than a template.",
  description:
    "A portfolio website for Kinoproby, a visual production duo working across commercial films, photography, art projects, and experimental visual work. I designed and developed the entire site solo, using Tilda as the foundation and extending it with custom HTML, CSS, and JavaScript to achieve a much more bespoke and expressive result. The goal was to create a bold, image-led experience that felt immersive, editorial, and true to the studio's visual language.",
  overview:
    "Kinoproby is a creative duo producing commercial videos, fashion films, music videos, photography, and art projects. The website needed to showcase a broad body of work while preserving a strong point of view and a distinct visual identity.",
  roleSummary:
    "I handled the project end-to-end, from design direction to development and custom frontend implementation.",
  responsibilities: [
    "Full web design",
    "Full web development",
    "Information architecture",
    "Custom interactions and loaders",
    "Frontend customization on top of Tilda",
  ],
  client: {
    name: "Kinoproby",
    type: "Filmmaking duo / production studio",
    industry: "Film, visual production, photography",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "The client provided content and project materials; all design and implementation work was done by me.",
  },
  stack: {
    platform: ["Tilda"],
    frontend: ["HTML", "CSS", "JavaScript"],
    notes: "Built on Tilda with substantial custom code to go beyond standard site-builder limitations.",
  },
  features: [
    "Multi-page portfolio structure",
    "Highly visual, editorial-style presentation",
    "Custom frontend enhancements",
    "Custom loading experience",
    "Sectioned project browsing across different content types",
  ],
  impact: {
    summary:
      "Created a distinctive portfolio presence that matched the studio's visual character instead of feeling template-based.",
    highlights: [
      "Translated a strong creative identity into web form",
      "Used custom code to push a no-code platform further",
      "Built a flexible showcase for multiple types of visual work",
    ],
  },
  tags: [
    "Portfolio",
    "Web Design",
    "Web Development",
    "Creative Direction",
    "Tilda",
    "Custom Code",
    "JavaScript",
  ],
  links: [{ label: "Live Site", url: "https://kino-proby.com" }],
  featured: false,
  thumbnail: "/images/project-placeholder.svg",
  stills: ["/archive/frame-01.svg", "/archive/frame-03.svg", "/archive/frame-07.svg"],
};
