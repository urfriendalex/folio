import type { ProjectEntry } from "./types";
import { generatedProjectMedia } from "./generated-media";

export const axirosAxfAxessProject: ProjectEntry = {
  slug: "axiros-axf-axess",
  orderIndex: 7,
  title: "AXIROS: AXF / AXESS",
  descriptor: "Telecom device-management platform (AXF JS framework / component library + AXESS)",
  year: "2019–2026",
  role: "Lead UI Engineer · Frontend Architect",
  technologies: ["JavaScript", "SCSS", "Handlebars", "Vite"],
  shortDescription:
    "Frontend architecture for a telecom web app: AXF as the internal framework and component library, AXESS as the main product.",
  description:
    "I led frontend architecture for ACS-backed device management, at telecom scale. AXF was the internal framework and component library. AXESS was the main web app: layouts, workflows, RBAC, and dashboards fed by declarative configs and live data.",
  overview:
    "Operator tooling with heavy data, long workflows, and many product surfaces. One frontend had to stretch across teams without turning into copy-paste soup.",
  roleSummary:
    "AXF stewardship, AXESS delivery, mentorship, and keeping design (Airnauts) and backend pointed at the same problems.",
  responsibilities: [
    "Frontend architecture and technical direction",
    "AXF framework work (routing, layouts, plugins, JSON-driven UI)",
    "AXESS web app dashboards and day-to-day operator UI",
    "Team leadership and mentorship",
    "Partnership with design (Airnauts) and backend engineers",
    "UI patterns for RBAC and reuse across applications",
  ],
  collaboration: {
    team: "Frontend (lead)",
    withClient: false,
    details: "Design partnership with Airnauts; I was tech lead on the frontend codebase.",
  },
  stack: {
    platform: ["AXF", "AXESS"],
    frontend: ["JavaScript", "SCSS", "Handlebars", "Vite"],
    notes:
      "Custom AXF framework and component library, built with Vite. AXESS is the main web app, with config-driven screens plus websockets and polling for live feeds.",
  },
  features: [
    "AXF: components, routing, layouts, plugins, declarative UI from JSON",
    "AXESS: device ops, filtering, live updates, RBAC-aware UI",
    "Runtime theming via CSS variables (several light/dark variants)",
    "Multi-language UI",
    "Plugins so framework code and product code stay separated",
  ],
  impact: {
    summary:
      "A frontend spine teams could share: configs and patterns instead of greenfielding every screen.",
    highlights: [
      "Same architecture reused across products",
      "Config-heavy UI that kept pace with backend payloads",
      "Full redesign with matching multi-theme rollout",
      "Operator workflows that stayed usable under real data volume",
    ],
  },
  tags: [
    "Frontend Architecture",
    "Design System",
    "Framework",
    "Dashboard",
    "Telecom",
    "RBAC",
    "Real-time",
    "Scalable Systems",
  ],
  ...generatedProjectMedia["axiros-axf-axess"],
};
