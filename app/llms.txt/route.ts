import { faqContent } from "@/app/(site)/faq/content";
import { AboutOverlayContent } from "@/content/about";
import { contactContent } from "@/content/contact";
import { heroContent } from "@/content/hero";
import { projects } from "@/content/projects";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/** llms.txt (https://llmstxt.org) built from the same content as the pages, so it never drifts. */
function buildLlmsTxt(): string {
  const projectLines = projects.map((project) => {
    const summary = project.shortDescription ?? project.descriptor;
    return `- [${project.title}](${SITE_URL}/projects/${project.slug}): ${summary} (${project.year}; ${project.role}; ${project.technologies.join(", ")})`;
  });

  const faqLines = faqContent.flatMap(({ question, answer }) => [`### ${question}`, "", answer, ""]);

  return [
    `# ${heroContent.name}`,
    "",
    `> ${heroContent.name} — ${heroContent.position}, ${contactContent.location}. ${heroContent.description}`,
    "",
    `${AboutOverlayContent.intro} ${AboutOverlayContent.description}`,
    "",
    "## Pages",
    "",
    `- [Home](${SITE_URL}/): Introduction, recent work, and contact.`,
    `- [Work](${SITE_URL}/projects): Index of every case study, filterable by e-commerce, portfolio, product, and event work.`,
    `- [Archive](${SITE_URL}/archive): Experiments, motion stills, and visual studies between client work.`,
    `- [FAQ](${SITE_URL}/faq): Project types, technologies, getting in touch, and remote collaboration.`,
    "",
    "## Case studies",
    "",
    ...projectLines,
    "",
    "## Common questions",
    "",
    ...faqLines,
    "## Contact",
    "",
    `- [Email](mailto:${contactContent.email}): ${contactContent.email}. ${contactContent.responseTime}`,
    `- [LinkedIn](${contactContent.linkedin})`,
    `- [GitHub](${contactContent.github})`,
    `- [Instagram](${contactContent.instagram})`,
    "",
    "## Optional",
    "",
    `- [Sitemap](${SITE_URL}/sitemap.xml): Every indexable URL with its last editorial update.`,
    `- [Robots policy](${SITE_URL}/robots.txt): Crawler access rules, including AI search and training agents.`,
    "",
  ].join("\n");
}

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
