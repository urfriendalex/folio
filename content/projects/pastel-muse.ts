import type { ProjectEntry } from "./types";
import { generatedProjectMedia } from "./generated-media";

export const pastelMuseProject: ProjectEntry = {
  slug: "pastel-muse",
  orderIndex: 3,
  title: "PASTEL MUSE",
  descriptor: "One-day photo experience event site",
  year: "2026",
  role: "Design + Frontend",
  technologies: ["Next.js", "GSAP", "SCSS"],
  shortDescription:
    "Website for a one-day photo event, with editorial art direction and registration handled through email and a Telegram bot.",
  description:
    "Next.js site for Pastel Muse: story, schedule, and registration for a one-day photo event, with signups handled through email and a Telegram bot.",
  overview:
    "A one-day photo event site with a clear registration flow, plus motion and art direction that fit the tone.",
  roleSummary: "Structure, interaction design, and frontend work, including preloader and reveals.",
  responsibilities: [
    "Page structure & flow",
    "Registration via email and Telegram bot",
    "GSAP preloader & scroll animation",
    "Responsive polish",
  ],
  client: {
    name: "Pastel Muse",
    type: "One-day photo event",
    industry: "Photography / events",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "Brief and copy from the host; I built the experience and motion.",
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
    summary: "One destination for the day instead of a generic landing, with a straight path to sign up.",
    highlights: [
      "Story and form on one clean line",
      "Motion matches the brand instead of stealing focus",
      "Preloader sets tone before the first section lands",
    ],
  },
  tags: ["Next.js", "GSAP", "Frontend", "Animation", "Events", "Photography"],
  links: [{ label: "Live Site", url: "https://pastelmuse.lizakarasiova.com/" }],
  ...generatedProjectMedia["pastel-muse"],
};
