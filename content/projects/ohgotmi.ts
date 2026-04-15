import type { ProjectEntry } from "./types";

export const ohgotmiProject: ProjectEntry = {
  slug: "ohgotmi",
  title: "OHGOTMI",
  descriptor: "Film producer portfolio",
  year: "2026",
  role: "Solo Designer & Developer",
  technologies: ["Framer", "React", "JavaScript", "CSS"],
  shortDescription:
    "Portfolio for a film producer—atmospheric and cinematic, built around pacing and imagery rather than a conventional résumé layout.",
  description:
    "A portfolio website for a film producer, built using Framer and extended with custom React components and bespoke styling. I handled the entire project end-to-end, focusing on creating a cinematic, immersive browsing experience that reflects the visual language of film. The site combines Framer's rapid iteration capabilities with custom engineering to achieve a more expressive and controlled frontend.",
  overview:
    "The goal was to create a portfolio that feels closer to a film experience than a traditional website, emphasizing pacing, visuals, and atmosphere.",
  roleSummary:
    "Owned the full lifecycle of the project, from concept and design to implementation and custom frontend logic.",
  responsibilities: [
    "Full website design",
    "Framer development",
    "Custom React component development",
    "Advanced styling and layout control",
    "UX and interaction design",
  ],
  client: {
    name: "OhGotMi",
    type: "Film producer",
    industry: "Film / creative production",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "Worked directly with the client on content and direction; all design and development executed by me.",
  },
  stack: {
    platform: ["Framer"],
    frontend: ["React", "JavaScript", "CSS"],
    notes: "Hybrid approach combining Framer with custom React components for extended control and flexibility.",
  },
  features: [
    "Cinematic, image-led layout",
    "Custom React-driven components",
    "Advanced styling beyond default Framer capabilities",
    "Immersive content presentation",
    "Responsive experience across devices",
  ],
  impact: {
    summary:
      "Delivered a portfolio that aligns closely with film aesthetics, creating a more immersive and differentiated digital presence.",
    highlights: [
      "Translated cinematic language into web interactions",
      "Extended no-code tooling with custom engineering",
      "Achieved a more expressive and brand-aligned frontend",
    ],
  },
  tags: ["Framer", "React", "Frontend", "Portfolio", "Creative Development", "Film"],
  links: [{ label: "Live Site", url: "https://ohgotmi.com" }],
  featured: true,
  thumbnail: "/images/project-placeholder.svg",
  stills: ["/archive/frame-07.svg", "/archive/frame-01.svg", "/archive/frame-04.svg"],
};
