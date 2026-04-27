import type { ProjectEntry } from "./types";

export const studioIskraProject: ProjectEntry = {
  slug: "studio-iskra",
  title: "STUDIO ISKRA",
  descriptor: "Creative studio portfolio",
  year: "2025",
  role: "Solo Designer & Developer",
  technologies: ["Framer", "React", "JavaScript", "CSS"],
  shortDescription:
    "Studio portfolio in Framer with a custom React gallery—fast iteration, flexible presentation.",
  description:
    "Framer-built portfolio extended with a custom React gallery. End-to-end: visual layout in Framer plus code where native tools stopped short.",
  overview: "Balance Framer speed with custom React for a flexible, image-led showcase.",
  roleSummary: "Design through build, including custom React for the gallery.",
  responsibilities: [
    "Design & Framer build",
    "Custom React gallery",
    "UX and site structure",
  ],
  client: {
    name: "Studio Iskra",
    type: "Creative studio",
    industry: "Design / visual production",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "Solo build; aligned with the client on content and direction.",
  },
  stack: {
    platform: ["Framer"],
    frontend: ["React", "JavaScript", "CSS"],
    notes: "Custom React layered on Framer for gallery behavior.",
  },
  features: [
    "Custom React gallery",
    "Visual portfolio layout",
    "Responsive, hybrid no-code + code",
  ],
  impact: {
    summary: "Framer velocity with custom React where the portfolio needed more control.",
    highlights: [
      "No-code base + targeted engineering",
      "Flexible project presentation",
      "Modern, fast-feeling experience",
    ],
  },
  tags: ["Framer", "React", "Frontend", "Portfolio", "Creative Development", "Custom Components"],
  links: [{ label: "Live Site", url: "https://studioiskra.eu" }],
  featured: true,
  thumbnail: "/images/project-placeholder.svg",
  stills: [
    "/archive/desktop-abstract.webp",
    "/archive/explore-2.webp",
    "/archive/banner-colored.webp",
  ],
};
