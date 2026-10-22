import type { ProjectEntry } from "./types";
import { generatedProjectMedia } from "./generated-media";

export const fullCourseStudioProject: ProjectEntry = {
  slug: "full-course-studio",
  orderIndex: 1,
  title: "FULL COURSE STUDIO",
  cardDescriptor: "STUDIO SITE",
  category: "portfolio",
  descriptor: "Custom site for a Warsaw restaurant studio",
  year: "2026",
  lastModified: "2026-10-22",
  role: "Design + Development",
  technologies: ["Next.js", "React", "GSAP", "Lenis", "Tailwind CSS"],
  shortDescription:
    "Custom site for Full Course Studio, launched 20 October 2026, with an ASCII figure, hover motion, and English, Polish, and Russian.",
  description:
    "A custom site for Full Course Studio, a Warsaw practice for marketing, content, websites, and ordering for cafés, bakeries, and restaurants. Launched 20 October 2026.",
  overview:
    "The page opens on an ASCII figure and the line \"Digital solutions and marketing for cafés and restaurants.\" Services, two published projects, the studio, and contact follow on the same page. A six-dot control on the figure opens colour, detail, size, pause, and next form. Dark mode remaps the atmosphere gradients. The footer wordmark is a canvas: a pointer over it scatters the glyphs, and a press changes the pose. A tap does the same on a phone. The footer also switches English, Polish, and Russian. Search and answer-engine files on the live site include a canonical URL, hreflang, JSON-LD, a sitemap, robots.txt, and llms.txt.",
  roleSummary: "Design and development of the studio site.",
  responsibilities: [
    "Design and frontend build",
    "ASCII figure and its controls",
    "Hover states and service motion",
    "Light and dark atmosphere gradients",
    "English, Polish, and Russian",
    "Metadata, structured data, sitemap, and llms.txt",
  ],
  client: {
    name: "Full Course Studio",
    type: "Studio website",
    industry: "Restaurant marketing",
  },
  collaboration: {
    team: "Solo",
    details:
      "Alexander designed and built the site. The studio page also names Ivan, who coordinates partners.",
  },
  stack: {
    platform: ["Next.js", "Vercel"],
    frontend: ["React", "GSAP", "Lenis", "Tailwind CSS"],
    notes:
      "The response is served by Next.js on Vercel. The client bundle includes GSAP, ScrollTrigger, and Lenis. Styling is Tailwind utilities with CSS modules. The hero figure, founder tiles, contact field, and footer wordmark are canvas. English and Polish text uses Host Grotesk; Russian uses Golos Text. Newsreader, DM Mono, and Doto are loaded for serif lines, labels, and numerals.",
  },
  features: [
    "ASCII hero figure with colour, detail, size, pause, and next form",
    "Hover on navigation, service rows, arrow links, and a liquid button",
    "Optional dark mode with a separate atmosphere palette",
    "Drifting gradients on the contact stage",
    "Footer wordmark that scatters under the pointer and changes pose on press",
    "English, Polish, and Russian",
    "Short motion pieces for ads, content, and websites",
    "Canonical URL, hreflang, JSON-LD, sitemap, robots.txt, and llms.txt",
  ],
  impact: {
    summary:
      "One page for the studio's services, published work, and a direct way to book a call or write.",
    highlights: [
      "Services can be taken one at a time or as the full package",
      "The same page is published in English, Polish, and Russian",
      "llms.txt names the services, Mon Nom Bakery, Foca Loca, and how to get in touch",
    ],
  },
  tags: ["Next.js", "GSAP", "Lenis", "Tailwind CSS", "ASCII", "Motion"],
  links: [{ label: "Live site", url: "https://fullcourse.studio" }],
  ...generatedProjectMedia["full-course-studio"],
};
