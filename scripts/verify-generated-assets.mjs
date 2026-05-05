import { execSync } from "node:child_process";
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

run("pnpm run generate:project-media:clean");
run("pnpm run generate:archive-manifest");

const status = output(`git status --porcelain -- ${trackedPaths.join(" ")}`);

if (status) {
  console.error("\nGenerated assets are out of sync with sources. Git status:\n");
  console.error(status);
  console.error("\nFix: pnpm generate:project-media:clean && pnpm generate:archive-manifest");
  console.error("Then commit the updated files.\n");
  process.exit(1);
}
