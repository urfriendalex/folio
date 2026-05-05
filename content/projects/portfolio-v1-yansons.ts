import type { ProjectEntry } from "./types";
import { generatedProjectMedia } from "./generated-media";

export const portfolioV1YansonsProject: ProjectEntry = {
  slug: "portfolio-v1-yansons",
  orderIndex: 4,
  title: "PORTFOLIO V1",
  descriptor: "First portfolio site",
  year: "2020",
  role: "Solo Designer & Developer",
  technologies: ["React", "GSAP", "JavaScript", "CSS"],
  shortDescription:
    "My first portfolio site: React, GSAP, and a lot of motion experiments.",
  description:
    "My first portfolio site. Built in React with GSAP timelines, page transitions, and interaction-heavy sections, it became the place where I tested animation ideas before carrying them into client work.",
  overview: "First folio, built as both a personal site and a place to push motion and frontend craft further.",
  roleSummary:
    "Solo: motion systems, component architecture, deployment.",
  responsibilities: [
    "Design and frontend build",
    "GSAP timelines and transitions",
    "Interaction and UX polish",
    "Vercel hosting and routing",
  ],
  client: {
    name: "Personal",
    type: "Self-initiated",
    industry: "Portfolio / experimentation",
  },
  collaboration: {
    team: "Solo",
    withClient: false,
    details: "Self-initiated.",
  },
  stack: {
    platform: ["Vercel"],
    frontend: ["React", "JavaScript", "GSAP", "CSS"],
    notes: "Animation-first frontend; GSAP for page flow and micro-interactions.",
  },
  features: [
    "GSAP-heavy motion",
    "Custom page transitions",
    "Responsive UI with room for expression",
    "Layout built around interaction, not the other way around",
  ],
  impact: {
    summary:
      "Where I sharpened motion tooling and craft habits for the sites that came after.",
    highlights: [
      "Long, deliberate GSAP practice",
      "Clearer sense of choreography, performance, and when to stop",
      "Proof that React could carry a motion-heavy portfolio",
    ],
  },
  tags: ["React", "GSAP", "Frontend", "Portfolio", "Animation", "Creative Development"],
  links: [{ label: "Live Site", url: "https://v1.yansons.online" }],
  ...generatedProjectMedia["portfolio-v1-yansons"],
};
