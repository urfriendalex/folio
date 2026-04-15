import type { ProjectEntry } from "./types";

export const kinoprobyProject: ProjectEntry = {
  slug: "kinoproby",
  title: "KINOPROBY",
  descriptor: "Portfolio website for a bold visual production duo",
  year: "2019",
  role: "Solo Designer & Developer",
  technologies: ["Tilda", "HTML", "CSS", "JavaScript"],
  shortDescription:
    "Bold, image-led portfolio for a film/photo duo—magazine feel, built on Tilda + custom code.",
  description:
    "Solo design and build: Tilda as the base, extended with custom HTML/CSS/JS for a bespoke, editorial portfolio across film, photo, and art work.",
  overview: "Show a wide body of work without losing a strong visual POV or identity.",
  roleSummary: "End-to-end: direction, IA, development, and custom front-of-site details.",
  responsibilities: [
    "Design & development",
    "Information architecture",
    "Custom loaders & interactions",
    "Tilda + custom frontend",
  ],
  client: {
    name: "Kinoproby",
    type: "Filmmaking duo / production studio",
    industry: "Film, visual production, photography",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "Client supplied assets; I owned design and implementation.",
  },
  stack: {
    platform: ["Tilda"],
    frontend: ["HTML", "CSS", "JavaScript"],
    notes: "Heavy customization beyond typical Tilda output.",
  },
  features: [
    "Multi-page portfolio",
    "Editorial, image-first layout",
    "Custom loading & section browsing",
  ],
  impact: {
    summary: "Portfolio that reflects the studio’s character instead of reading as a template.",
    highlights: [
      "Identity carried into the web",
      "Custom code pushing a site-builder",
      "Flexible showcase across media types",
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
