import type { ProjectEntry } from "./types";
import { generatedProjectMedia } from "./generated-media";

export const ohgotmiProject: ProjectEntry = {
  slug: "ohgotmi",
  orderIndex: 1,
  title: "OHGOTMI",
  descriptor: "Film producer / creative portfolio",
  year: "2026",
  role: "Solo Designer & Developer",
  technologies: ["Framer", "React", "JavaScript", "CSS"],
  shortDescription:
    "Portfolio site for a film producer and creative, with film pacing and stills up front.",
  description:
    "Framer plus custom React and CSS. I took it from concept through shipped frontend: layout, type, and the behaviors Framer couldn't quite own alone.",
  overview:
    "Browse it like you browse a film: rhythm and imagery first, ahead of stock portfolio patterns.",
  roleSummary: "Concept, design, Framer build, and the custom frontend pieces.",
  responsibilities: [
    "Design & Framer development",
    "Custom React components",
    "Interaction and layout",
  ],
  client: {
    name: "OhGotMi",
    type: "Film producer / creative",
    industry: "Film / creative work",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "Client on copy and selects; I owned design and build.",
  },
  stack: {
    platform: ["Framer"],
    frontend: ["React", "JavaScript", "CSS"],
    notes: "Framer plus React for the parts that needed tighter control.",
  },
  features: [
    "Image-led layout with film-style pacing",
    "React where Framer hit a wall",
    "Responsive presentation without sandblasting the mood",
  ],
  impact: {
    summary: "A web presence that matches the work it sells instead of default reel-page tropes.",
    highlights: [
      "Motion and layout that feel cinematic without gimmicks",
      "Custom code on a no-code base, not instead of one",
      "Close to how the producer actually talks",
    ],
  },
  tags: ["Framer", "React", "Frontend", "Portfolio", "Creative Development", "Film"],
  links: [{ label: "Live Site", url: "https://ohgotmi.com" }],
  ...generatedProjectMedia["ohgotmi"],
};
