import fs from "node:fs";

// Migrate further surfaces into this list after reviewing their optical / interaction constraints.
const governed = [
  "components/sections/Hero/HomeHero.module.scss",
  "components/sections/Work/WorkSection.module.scss",
  "components/sections/Contact/ContactSection.module.scss",
  "components/sections/Contact/ContactLayout.module.scss",
  "components/ui/ProjectCard/ProjectCard.module.scss",
  "components/projects/ProjectsIndex/ProjectsIndex.module.scss",
  "components/projects/ProjectCaseStudy.module.scss",
  "components/ui/Overlay/OverlayProvider.module.scss",
  "app/(site)/faq/page.module.scss",
];
const tokens = fs.readFileSync(new URL("../styles/_typography.scss", import.meta.url), "utf8");
const defined = new Set([...tokens.matchAll(/(--type-[\w-]+)\s*:/g)].map((match) => match[1]));
const failures = [];
for (const file of governed) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  for (const match of source.matchAll(/(?<![\w-])font-size\s*:\s*([^;{}]+)/g)) {
    const value = match[1].trim();
    // The project visit glyph inherits its surrounding text size, deliberately.
    if (value !== "1em" && !/^var\(--(?:type-[\w-]+|footer-brand-meta-font-size)\)$/.test(value)) {
      failures.push(`${file}: font-size ${value} must use a semantic type token`);
    }
  }
  for (const match of source.matchAll(/var\((--type-[\w-]+)/g)) {
    if (!defined.has(match[1])) failures.push(`${file}: undefined token ${match[1]}`);
  }
  for (const match of source.matchAll(/(?<![\w-])font\s*:\s*([^;{}]+)/g)) {
    if (match[1].trim() !== "inherit") failures.push(`${file}: use explicit font properties so type roles remain auditable`);
  }
  for (const match of source.matchAll(/(?<![\w-])font-family\s*:\s*([^;{}]+)/g)) {
    if (!/^var\(--font-(?:body|mono|pixel|pixel-square|system-95)-stack\)$/.test(match[1].trim())) {
      failures.push(`${file}: choose a documented shared font family`);
    }
  }
  if (/(?<![\w-])line-height\s*:\s*[\d.]+(?:px|rem|em)\b/.test(source)) {
    failures.push(`${file}: line-height must be unitless so it follows text zoom`);
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else console.log(`Typography: ${governed.length} governed stylesheets use defined semantic sizes and scalable line heights.`);
