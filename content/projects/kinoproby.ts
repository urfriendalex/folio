import type { ProjectEntry } from "./types";
import { generatedProjectMedia } from "./generated-media";

export const kinoprobyProject: ProjectEntry = {
  slug: "kinoproby",
  orderIndex: 6,
  title: "KINOPROBY",
  descriptor: "Website for a production studio / creative duo",
  year: "2019",
  role: "Solo Designer & Developer",
  technologies: ["Tilda", "HTML", "CSS", "JavaScript"],
  shortDescription:
    "Website for a production studio and creative duo, built on Tilda with custom HTML, CSS, and JS.",
  description:
    "Solo design and build: Tilda underneath, custom code for loaders, sections, and an editorial pass across the studio's film work.",
  overview: "Show a deep archive without muting a clear visual point of view.",
  roleSummary: "Direction, IA, build, and the custom details at the top of the experience.",
  responsibilities: [
    "Design & development",
    "Information architecture",
    "Custom loaders & interactions",
    "Tilda + custom frontend",
  ],
  client: {
    name: "Kinoproby",
    type: "Production studio / creative duo",
    industry: "Film production",
  },
  collaboration: {
    team: "Solo",
    withClient: true,
    details: "They supplied assets; I owned design and implementation.",
  },
  stack: {
    platform: ["Tilda"],
    frontend: ["HTML", "CSS", "JavaScript"],
    notes: "Heavy customization past typical Tilda output.",
  },
  features: [
    "Multi-page portfolio",
    "Editorial, image-first layout",
    "Custom loading & section browsing",
  ],
  impact: {
    summary: "Reads like the studio, not like a stock builder template.",
    highlights: [
      "Identity carried into layout",
      "JS stretching a site builder instead of fighting it",
      "Single showcase across film and stills",
    ],
  },
  tags: [
    "Portfolio",
    "Web Design",
    "Web Development",
    "Creative Direction",
    "Tilda",
    "Custom Code",
    "JavaScript",
  ],
  links: [{ label: "Live Site", url: "https://kino-proby.com" }],
  ...generatedProjectMedia["kinoproby"],
};
