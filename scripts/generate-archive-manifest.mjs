import { promises as fs } from "node:fs";
import path from "node:path";

const archiveDir = path.join(process.cwd(), "public", "archive");
const outputFile = path.join(process.cwd(), "lib", "generated", "archive-manifest.ts");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg"]);

async function main() {
  const directoryEntries = await fs.readdir(archiveDir, { withFileTypes: true });

  const items = directoryEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => supportedExtensions.has(path.extname(fileName).toLowerCase()))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => ({
      src: `/archive/${fileName}`,
      width: 1200,
      height: 1500,
      kind: "image",
    }));

  const fileContents = `export const archiveManifest = ${JSON.stringify(items, null, 2)} as const;\n`;
  await fs.writeFile(outputFile, fileContents, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
