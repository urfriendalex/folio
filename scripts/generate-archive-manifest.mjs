import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const archiveDir = path.join(process.cwd(), "public", "archive");
const outputFile = path.join(process.cwd(), "lib", "generated", "archive-manifest.ts");
const execFileAsync = promisify(execFile);
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg"]);
const videoExtensions = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const supportedExtensions = new Set([...imageExtensions, ...videoExtensions]);

function getArchiveKind(extension) {
  if (videoExtensions.has(extension)) {
    return "video";
  }

  return "image";
}

async function readDimensions(absolutePath) {
  const fallback = { width: 1200, height: 1500 };
  const extension = path.extname(absolutePath).toLowerCase();

  if (videoExtensions.has(extension)) {
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "csv=p=0:s=x",
        absolutePath,
      ]);
      const [widthToken, heightToken] = stdout.trim().split("x");
      const width = Number(widthToken);
      const height = Number(heightToken);

      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        return { width, height };
      }
    } catch {
      // ignore, use fallback
    }

    return fallback;
  }

  try {
    const metadata = await sharp(absolutePath).metadata();
    const width = metadata.width;
    const height = metadata.height;
    if (typeof width === "number" && typeof height === "number" && width > 0 && height > 0) {
      return { width, height };
    }
  } catch {
    // ignore, use fallback
  }
  return fallback;
}

async function main() {
  const directoryEntries = await fs.readdir(archiveDir, { withFileTypes: true });

  const fileNames = directoryEntries
    .filter(
      (entry) =>
        entry.isFile() &&
        !entry.name.startsWith(".") &&
        !entry.name.endsWith(".writing"),
    )
    .map((entry) => entry.name)
    .filter((name) => supportedExtensions.has(path.extname(name).toLowerCase()))
    .sort((left, right) => left.localeCompare(right));

  const items = await Promise.all(
    fileNames.map(async (fileName) => {
      const absolute = path.join(archiveDir, fileName);
      const extension = path.extname(fileName).toLowerCase();
      const { width, height } = await readDimensions(absolute);

      return {
        src: `/archive/${fileName}`,
        width,
        height,
        kind: getArchiveKind(extension),
      };
    }),
  );

  const fileContents = `export const archiveManifest = ${JSON.stringify(items, null, 2)} as const;\n`;
  await fs.writeFile(outputFile, fileContents, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
