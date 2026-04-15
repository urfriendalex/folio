import type { ProjectEntry } from "./types";

export const pastelMuseProject: ProjectEntry = {
  slug: "pastel-muse",
  title: "PASTEL MUSE",
  descriptor: "Photo day experience website",
  year: "2026",
  role: "Design + Frontend",
  technologies: ["Next.js", "GSAP", "SCSS"],
  shortDescription:
    "Marketing + registration for a photo day—soft editorial mood, GSAP preloader, clear signup.",
  description:
    "Next.js site for Pastel Muse: story, schedule, and registration with GSAP preloader and scroll-linked motion that match the brand’s quiet, editorial tone.",
  overview: "Premium feel for a one-day shoot: clear hierarchy, simple signup, motion that supports—not shouts.",
  roleSummary: "Structure, interaction design, and frontend—including preloader and reveals.",
  responsibilities: [
    "Page structure & flow",
    "Registration integration",
    "GSAP preloader & scroll animation",
    "Responsive polish",
  ],
  client: {
    name: "Pastel Muse",
    type: "Photo day experience",
    industry: "Photography / events",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "Host’s brief and copy; I built the experience and motion.",
  },
  stack: {
    platform: ["Next.js"],
    frontend: ["React", "GSAP", "SCSS"],
    notes: "GSAP for preloader, section transitions, and text reveals.",
  },
  features: [
    "Registration path",
    "Branded GSAP preloader",
    "Scroll-linked motion & reveals",
  ],
  impact: {
    summary: "One cohesive destination for the day—not a generic landing—with low-friction signup.",
    highlights: [
      "Story and form in one flow",
      "Motion aligned with the brand",
      "Preloader sets tone before content",
    ],
  },
  tags: ["Next.js", "GSAP", "Frontend", "Animation", "Events", "Photography"],
  links: [{ label: "Live Site", url: "https://pastelmuse.lizakarasiova.com/" }],
  featured: false,
  thumbnail: "/images/project-placeholder.svg",
  stills: ["/archive/frame-08.svg", "/archive/frame-04.svg", "/archive/frame-01.svg"],
};
