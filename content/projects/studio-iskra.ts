import type { ProjectEntry } from "./types";

export const studioIskraProject: ProjectEntry = {
  slug: "studio-iskra",
  title: "STUDIO ISKRA",
  descriptor: "Creative studio portfolio",
  year: "2025",
  role: "Solo Designer & Developer",
  technologies: ["Framer", "React", "JavaScript", "CSS"],
  shortDescription:
    "Portfolio for a creative studio—a clean, modern showcase with a flexible gallery for project work.",
  description:
    "A portfolio website for Studio Iskra built entirely in Framer, extended with a custom React-based gallery component. I handled the project end-to-end, combining Framer's visual development workflow with custom code to deliver a more flexible and dynamic content experience. The goal was to create a clean, modern, and highly visual platform for presenting the studio's work.",
  overview:
    "The project focused on building a visually refined website that balances speed of iteration (via Framer) with custom functionality where needed.",
  roleSummary:
    "Owned the project end-to-end, from design to development and custom React extensions.",
  responsibilities: [
    "Full website design",
    "Framer development",
    "Custom React component development",
    "Gallery system implementation",
    "UX and structure decisions",
  ],
  client: {
    name: "Studio Iskra",
    type: "Creative studio",
    industry: "Design / visual production",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "All design and development were done by me; worked with the client on content and direction.",
  },
  stack: {
    platform: ["Framer"],
    frontend: ["React", "JavaScript", "CSS"],
    notes: "Extended Framer with custom React components to go beyond native capabilities.",
  },
  features: [
    "Custom React-powered gallery",
    "Highly visual portfolio layout",
    "Smooth browsing experience for visual content",
    "Responsive design across devices",
    "Hybrid no-code + code approach",
  ],
  impact: {
    summary:
      "Combined speed of Framer with flexibility of custom React to deliver a more tailored and scalable portfolio experience.",
    highlights: [
      "Extended a no-code tool with custom engineering",
      "Improved flexibility of content presentation",
      "Delivered a modern, performant visual experience",
    ],
  },
  tags: ["Framer", "React", "Frontend", "Portfolio", "Creative Development", "Custom Components"],
  links: [{ label: "Live Site", url: "https://studioiskra.eu" }],
  status: "Live",
  featured: true,
  thumbnail: "/images/project-placeholder.svg",
  stills: ["/archive/frame-05.svg", "/archive/frame-06.svg", "/archive/frame-02.svg"],
};
