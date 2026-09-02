import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const trackedPaths = [
  "lib/generated/archive-manifest.ts",
  "content/projects/generated-media.ts",
  "public/projects",
];

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function output(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trimEnd();
}

function verifyCheckedInProjectMedia() {
  const definitionPaths = [
    "content/projects/curated-media.ts",
    "content/projects/generated-media.ts",
  ];
  const referencedAssets = new Set();

  for (const definitionPath of definitionPaths) {
    const source = fs.readFileSync(definitionPath, "utf8");
    for (const match of source.matchAll(/["'](\/projects\/[^"']+)["']/g)) {
      referencedAssets.add(match[1]);
    }
  }

  const invalidAssets = [];
  for (const publicPath of referencedAssets) {
    const filePath = path.join(process.cwd(), "public", publicPath);
    try {
      if (fs.statSync(filePath).size === 0) {
        invalidAssets.push(`${publicPath} (empty)`);
      }
    } catch {
      invalidAssets.push(`${publicPath} (missing)`);
    }
  }

  if (invalidAssets.length) {
    console.error("\nInvalid checked-in project media:\n");
    console.error(invalidAssets.join("\n"));
    process.exit(1);
  }
}

if (fs.existsSync("media/project-sources")) {
  run("pnpm run generate:project-media:clean");
} else {
  console.log("Skipping project media regeneration: media/project-sources is not available.");
}
verifyCheckedInProjectMedia();
run("pnpm run generate:archive-manifest");

const status = output(`git status --porcelain -- ${trackedPaths.join(" ")}`);

if (status) {
  console.error("\nGenerated assets are out of sync with sources. Git status:\n");
  console.error(status);
  console.error("\nFix: pnpm generate:project-media:clean && pnpm generate:archive-manifest");
  console.error("Then commit the updated files.\n");
  process.exit(1);
}
