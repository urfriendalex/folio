import type { ProjectEntry } from "./types";
import { generatedProjectMedia } from "./generated-media";

export const studioIskraProject: ProjectEntry = {
  slug: "studio-iskra",
  orderIndex: 2,
  title: "STUDIO ISKRA",
  descriptor: "Warsaw photo studio website",
  year: "2025",
  role: "Solo Designer & Developer",
  technologies: ["Framer", "React", "JavaScript", "CSS"],
  shortDescription:
    "Framer website for a Warsaw photo studio, with a React gallery where the native setup stopped being enough.",
  description:
    "Most of the site lives in Framer. The gallery is custom React: layout stayed in Framer, grid behavior did not.",
  overview: "Website for a Warsaw photo studio, built in Framer with custom React where the gallery needed more control.",
  roleSummary: "Design through build, including the React gallery.",
  responsibilities: [
    "Design & Framer build",
    "Custom React gallery",
    "UX and site structure",
  ],
  client: {
    name: "Studio Iskra",
    type: "Photo studio",
    industry: "Photography / studio",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "Solo build; checked in with the client on content and direction.",
  },
  stack: {
    platform: ["Framer"],
    frontend: ["React", "JavaScript", "CSS"],
    notes: "React layered on Framer for gallery behavior.",
  },
  features: [
    "Custom React gallery",
    "Visual portfolio layout",
    "Hybrid no-code shell plus targeted code",
  ],
  impact: {
    summary: "Framer carries most of the site; code shows up once, where control actually mattered.",
    highlights: [
      "Fast iteration in Framer, one surgical React island",
      "Room to reshuffle how work is presented",
      "Lightweight in the browser day to day",
    ],
  },
  tags: ["Framer", "React", "Frontend", "Portfolio", "Creative Development", "Custom Components"],
  links: [{ label: "Live Site", url: "https://studioiskra.eu" }],
  ...generatedProjectMedia["studio-iskra"],
};
