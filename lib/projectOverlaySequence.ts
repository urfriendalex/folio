import type {
  ProjectClient,
  ProjectCollaboration,
  ProjectEntry,
  ProjectImpact,
  ProjectStack,
} from "@/content/projects/types";

/**
 * Upper bound on wrapped lines for stagger `total` / offsets (real tokens from Pretext may be fewer;
 * underestimating would overlap the next block).
 */
export function estimateWrappedLines(text: string, minCharsPerLine: number, buffer = 3): number {
  const raw = text.trim();
  if (!raw) {
    return 1;
  }

  const hardSegments = raw.split(/\n/).filter((l) => l.trim().length > 0);
  const hardBreaks = Math.max(1, hardSegments.length);
  const collapsed = hardSegments.join(" ");
  const softWrap = Math.ceil(collapsed.length / minCharsPerLine);

  return Math.max(hardBreaks, softWrap) + buffer;
}

export function formatProjectClient(client: ProjectClient): string {
  const sub = [client.type, client.industry].filter(Boolean).join(" · ");
  return sub ? `${client.name}\n${sub}` : client.name;
}

export function formatProjectCollaboration(c: ProjectCollaboration): string {
  const head = c.withClient ? `${c.team} · Client project` : c.team;
  return c.details?.trim() ? `${head}\n${c.details}` : head;
}

export function formatProjectStack(s: ProjectStack): string {
  const lines: string[] = [];
  if (s.platform.length) {
    lines.push(`Platform: ${s.platform.join(", ")}`);
  }
  if (s.frontend?.length) {
    lines.push(`Frontend: ${s.frontend.join(", ")}`);
  }
  if (s.notes?.trim()) {
    lines.push(s.notes.trim());
  }
  return lines.join("\n");
}

export function formatBulletLines(items: string[], bullet = "·"): string {
  return items.map((item) => `${bullet} ${item}`).join("\n");
}

export type ProjectOverlayOffsets = {
  total: number;
  get(key: string): number | undefined;
};

/**
 * Builds global line offsets for `RevealLines` in `ProjectFullInfoOverlay`. Keys are only registered
 * when the corresponding block is rendered — use `get(key)` only for blocks you conditionally show.
 * Bullet lists register one offset per row (`resp0`, `feat0`, `impactH0`, …); tags register one index per pill for whole-pill fade timing.
 */
export function buildProjectOverlayOffsets(project: ProjectEntry): ProjectOverlayOffsets {
  const techLine = project.technologies.join(", ");
  const map = new Map<string, number>();
  let total = 0;

  const reg = (key: string, lines: number) => {
    map.set(key, total);
    total += lines;
  };

  const regText = (key: string, text: string | undefined, charsPerLine: number, buffer: number) => {
    if (!text?.trim()) {
      return;
    }
    reg(key, estimateWrappedLines(text, charsPerLine, buffer));
  };

  /* Generous buffers so global `--token-index` never collides with the next block (mixed stagger). */
  regText("descriptor", project.descriptor, 24, 5);
  reg("title", 1);
  regText("lead", project.description, 26, 5);

  if (project.overview?.trim()) {
    reg("overviewL", 1);
    regText("overviewBody", project.overview, 26, 4);
  }

  reg("roleL", 1);
  reg("roleV", 1);
  reg("yearL", 1);
  reg("yearV", 1);
  reg("techL", 1);
  regText("techV", techLine, 20, 4);

  const linkList =
    project.links && project.links.length > 0
      ? project.links
      : project.optionalLink
        ? [{ label: "visit site", url: project.optionalLink }]
        : [];

  linkList.forEach((_, i) => {
    reg(`link${i}`, 1);
  });

  if (project.client) {
    reg("clientL", 1);
    regText("clientBody", formatProjectClient(project.client), 24, 4);
  }

  if (project.roleSummary?.trim()) {
    reg("roleDetailL", 1);
    regText("roleDetailV", project.roleSummary, 26, 4);
  }

  if (project.responsibilities?.length) {
    reg("respL", 1);
    project.responsibilities.forEach((item, i) => regText(`resp${i}`, item, 32, 3));
  }

  if (project.collaboration) {
    reg("collabL", 1);
    regText("collabBody", formatProjectCollaboration(project.collaboration), 26, 4);
  }

  if (project.stack) {
    reg("stackL", 1);
    regText("stackBody", formatProjectStack(project.stack), 24, 4);
  }

  if (project.features?.length) {
    reg("featL", 1);
    project.features.forEach((item, i) => regText(`feat${i}`, item, 32, 3));
  }

  if (project.impact) {
    const imp: ProjectImpact = project.impact;
    reg("impactL", 1);
    regText("impactSum", imp.summary, 26, 4);
    imp.highlights?.forEach((line, i) => regText(`impactH${i}`, line, 32, 3));
  }

  if (project.tags?.length) {
    reg("tagsL", 1);
    project.tags.forEach((_, i) => {
      reg(`tag${i}`, 1);
    });
  }

  /* Keeps exit / inverse delays sane if Pretext yields more line tokens than estimates. */
  const paddedTotal = total + 32;

  return {
    total: paddedTotal,
    get: (key: string) => map.get(key),
  };
}
