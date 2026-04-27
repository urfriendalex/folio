import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const archiveDir = path.join(process.cwd(), "public", "archive");
const MAX_PX = 1920;
const WEBP = { quality: 85, effort: 6, smartSubsample: true };
const INPUT_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".tiff",
  ".tif",
]);

function slugifyBase(name) {
  const base = name.replace(/\.[^.]+$/i, "");
  const s = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "image";
}

async function main() {
  const entries = await fs.readdir(archiveDir, { withFileTypes: true });
  const inputFiles = entries
    .filter((d) => d.isFile() && !d.name.startsWith(".") && !d.name.endsWith(".writing"))
    .map((d) => d.name)
    .filter((n) => INPUT_EXTS.has(path.extname(n).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  if (inputFiles.length === 0) {
    console.log("No raster images in public/archive/ to process.");
    return;
  }

  const used = new Set();
  let totalIn = 0;
  let totalOut = 0;

  for (const fileName of inputFiles) {
    const inPath = path.join(archiveDir, fileName);
    const stat = await fs.stat(inPath);
    totalIn += stat.size;

    let base = slugifyBase(fileName);
    let outName = `${base}.webp`;
    let n = 2;
    while (used.has(outName)) {
      outName = `${base}-${n}.webp`;
      n += 1;
    }
    used.add(outName);
    const outPath = path.join(archiveDir, outName);
    const tmpPath = path.join(archiveDir, `${outName}.writing`);

    await sharp(inPath)
      .rotate()
      .resize({
        width: MAX_PX,
        height: MAX_PX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp(WEBP)
      .toFile(tmpPath);

    await fs.rm(outPath, { force: true });
    await fs.rename(tmpPath, outPath);
    if (inPath !== outPath) {
      await fs.rm(inPath, { force: true });
    }

    const outStat = await fs.stat(outPath);
    totalOut += outStat.size;
    console.log(`${fileName} → ${outName} (${(outStat.size / 1024).toFixed(0)} KB)`);
  }

  console.log(
    `Done. ${(totalIn / (1024 * 1024)).toFixed(2)} MB → ${(totalOut / (1024 * 1024)).toFixed(2)} MB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
