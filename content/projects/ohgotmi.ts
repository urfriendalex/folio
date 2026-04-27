import type { ProjectEntry } from "./types";

export const ohgotmiProject: ProjectEntry = {
  slug: "ohgotmi",
  title: "OHGOTMI",
  descriptor: "Film producer portfolio",
  year: "2026",
  role: "Solo Designer & Developer",
  technologies: ["Framer", "React", "JavaScript", "CSS"],
  shortDescription:
    "Producer portfolio—cinematic pacing and imagery instead of a résumé-style site.",
  description:
    "Framer site with custom React and styling: immersive, film-forward browsing. Full ownership from concept to shipped frontend.",
  overview: "Read as a film experience—pacing, visuals, and atmosphere over generic portfolio patterns.",
  roleSummary: "Concept, design, Framer build, and custom frontend behavior.",
  responsibilities: [
    "Design & Framer development",
    "Custom React components",
    "Interaction and layout",
  ],
  client: {
    name: "OhGotMi",
    type: "Film producer",
    industry: "Film / creative production",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "Client on content; I handled design and build.",
  },
  stack: {
    platform: ["Framer"],
    frontend: ["React", "JavaScript", "CSS"],
    notes: "Framer plus React for parts that needed more control.",
  },
  features: [
    "Image-led, cinematic layout",
    "Custom React where Framer ended",
    "Responsive, immersive presentation",
  ],
  impact: {
    summary: "A digital presence that matches film aesthetics instead of default portfolio tropes.",
    highlights: [
      "Cinematic feel in layout and motion",
      "Custom code on a no-code base",
      "Tighter alignment with the producer’s voice",
    ],
  },
  tags: ["Framer", "React", "Frontend", "Portfolio", "Creative Development", "Film"],
  links: [{ label: "Live Site", url: "https://ohgotmi.com" }],
  featured: true,
  thumbnail: "/images/project-placeholder.svg",
  stills: ["/archive/explore-wall.webp", "/archive/artboard-1.webp", "/archive/desktop.webp"],
};
