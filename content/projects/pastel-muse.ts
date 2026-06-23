import type { ProjectEntry } from "./types";
import { generatedProjectMedia } from "./generated-media";

export const pastelMuseProject: ProjectEntry = {
  slug: "pastel-muse",
  orderIndex: 3,
  title: "PHOTO DAY EXPERIENCE",
  descriptor: "WEBSITES SERIES",
  year: "2026",
  role: "Design + Frontend",
  technologies: ["Next.js", "GSAP", "SCSS"],
  shortDescription:
    "Event-site system for photo-day experiences, spanning Pastel Muse, Blooming Diva, and Wild Grace with grid switching and gallery zoom interactions.",
  description:
    "Next.js event-site system for photo-day experiences: story, schedule, and registration for Pastel Muse, then expanded into Blooming Diva and Wild Grace with newer gallery and grid interactions.",
  overview:
    "A reusable editorial direction for one-day photo events, with a clear registration flow, motion, and art direction adapted across Pastel Muse, Blooming Diva, and Wild Grace.",
  roleSummary:
    "Structure, interaction design, and frontend work across the original site and two related event variants.",
  responsibilities: [
    "Page structure & flow",
    "Registration via email and Telegram bot",
    "GSAP preloader & scroll animation",
    "Grid switcher interaction for newer variants",
    "Gallery zoom behavior for Blooming Diva and Wild Grace",
    "Responsive polish",
  ],
  client: {
    name: "Photo Day Experience",
    type: "One-day photo events",
    industry: "Photography / events",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details:
      "Brief and copy from the host; I built the first experience for Pastel Muse, then extended the system into Blooming Diva and Wild Grace.",
  },
  stack: {
    platform: ["Next.js"],
    frontend: ["React", "GSAP", "SCSS"],
    notes:
      "GSAP for preloader, section transitions, and text reveals, plus custom gallery and grid interactions on the newer sites.",
  },
  features: [
    "Registration path",
    "Branded GSAP preloader",
    "Scroll-linked motion & reveals",
    "Grid switcher for Blooming Diva and Wild Grace",
    "Image zoom on Blooming Diva and Wild Grace gallery items",
  ],
  impact: {
    summary:
      "One destination for each photo day instead of a generic landing, with a reusable direction flexible enough for multiple visual identities.",
    highlights: [
      "Story and form on one clean line",
      "Motion matches the brand instead of stealing focus",
      "Newer variants add gallery browsing modes without losing the editorial mood",
    ],
  },
  tags: ["Next.js", "GSAP", "Frontend", "Animation", "Events", "Photography", "Gallery"],
  links: [
    { label: "Pastel Muse", url: "https://pastelmuse.lizakarasiova.com/" },
    { label: "Blooming Diva", url: "https://bloomingdiva.lizakarasiova.com/" },
    { label: "Wild Grace", url: "https://wildgrace.lizakarasiova.com/" },
  ],
  ...generatedProjectMedia["pastel-muse"],
};
