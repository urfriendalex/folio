import type { ProjectEntry } from "./types";

export const pastelMuseProject: ProjectEntry = {
  slug: "pastel-muse",
  title: "PASTEL MUSE",
  descriptor: "Photo day experience website",
  year: "2026",
  role: "Design + Frontend",
  technologies: ["Next.js", "GSAP", "SCSS"],
  shortDescription:
    "Custom website for a photo day experience—registration, storytelling, and motion that sets the tone before the event.",
  description:
    "A bespoke marketing and registration site for Pastel Muse, a photo day experience. The site guides visitors through what the day is, why it matters, and how to sign up, with layered motion and typography that match the brand’s soft, editorial mood. A GSAP-driven preloader and multiple animation passes create a deliberate sense of arrival before the main content.",
  overview:
    "The focus was a calm, premium feel for a single-day photography experience: clear information hierarchy, a straightforward registration path, and enough motion to feel crafted without overwhelming the message.",
  roleSummary:
    "Owned layout, interaction design, and frontend implementation—including the preloader, scroll-linked animation, and text reveals.",
  responsibilities: [
    "Experience and page structure",
    "Registration flow and form integration",
    "GSAP preloader and timeline animation",
    "Scroll and text-reveal treatments",
    "Responsive layout and performance passes",
  ],
  client: {
    name: "Pastel Muse",
    type: "Photo day experience",
    industry: "Photography / events",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "Built with the host’s content and positioning; implementation and motion design by me.",
  },
  stack: {
    platform: ["Next.js"],
    frontend: ["React", "GSAP", "SCSS"],
    notes: "Heavy use of GSAP for the preloader, section transitions, and coordinated text reveals.",
  },
  features: [
    "Registration form for the photo day",
    "GSAP preloader for a branded load-in",
    "Multiple animation layers (scroll, section, and micro-interaction)",
    "Text reveals tied to layout and scroll",
    "Responsive, content-first presentation",
  ],
  impact: {
    summary:
      "Delivered a single destination that feels like part of the experience—not a generic landing page—while keeping signup clear and low-friction.",
    highlights: [
      "Registration and story live in one cohesive flow",
      "Motion supports the brand instead of distracting from it",
      "Preloader and reveals set expectations before the fold",
    ],
  },
  tags: ["Next.js", "GSAP", "Frontend", "Animation", "Events", "Photography"],
  links: [{ label: "Live Site", url: "https://pastelmuse.lizakarasiova.com/" }],
  status: "Live",
  featured: false,
  thumbnail: "/images/project-placeholder.svg",
  stills: ["/archive/frame-08.svg", "/archive/frame-04.svg", "/archive/frame-01.svg"],
};
