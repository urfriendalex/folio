import fs from "node:fs/promises";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";

const execFile = promisify(execFileCallback);

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "media/project-sources");
const outputDir = path.join(rootDir, "public/projects");
const generatedContentPath = path.join(rootDir, "content/projects/generated-media.ts");

/** When source duration exceeds this (seconds), encode a trimmed segment only (optional start/end; omitted → start 0, length DEFAULT_TRIM_SEGMENT_SEC). Shorter clips encode in full. */
const FULL_VIDEO_TRIM_THRESHOLD_SEC = 12;

/** Default excerpt length (seconds) when trimming long sources without an explicit end time. */
const DEFAULT_TRIM_SEGMENT_SEC = 12;

/** libx264 + yuv420p needs even dimensions; this adjusts by at most 1px per axis when odd. */
const FFMPEG_EVEN_YUV420 = "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p";

/**
 * Lossless PNG — zlib level 9 with encoder effort just shy of maximum (marginal extra bytes vs effort 10, faster builds).
 */
const PNG_OUTPUT = {
  compressionLevel: 9,
  adaptiveFiltering: true,
  effort: 9,
};

/**
 * x264: lower CRF = higher quality / fewer artefacts (larger files). Gallery uses a slower preset for cleaner UI footage.
 */
const H264_PRESET_CARD = "slow";
const H264_PRESET_GALLERY = "slower";
/** Card hover clip — thumbnail.mov output. */
const H264_CRF_CARD = 17;
/** Inner gallery clips — prioritize fidelity over size. */
const H264_CRF_GALLERY = 16;

/** ffmpeg filter: decode frame index 0 (accurate first frame, not keyframe-seek). */
const FFMPEG_FIRST_FRAME = "select=eq(n\\,0)";

const projectSlugs = [
  "studio-iskra",
  "ohgotmi",
  "axiros-axf-axess",
  "portfolio-v1-yansons",
  "kinoproby",
  "diana-milkanova",
  "pastel-muse",
];

const thumbnailPosterPositionBySlug = {
  "studio-iskra": "top",
  "ohgotmi": "centre",
  "axiros-axf-axess": "top",
  "portfolio-v1-yansons": "centre",
  "kinoproby": "centre",
  "diana-milkanova": "centre",
  "pastel-muse": "top",
};

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const VIDEO_EXTENSIONS = new Set([".mov", ".mp4"]);

/** Reserved for project cards only — never duplicated into the gallery strip. */
const GALLERY_SKIP_FILENAMES = new Set(["thumbnail.mov", "thumbnail.png"]);

/** True if this filename is a gallery-eligible image or video extension. */
function isGalleryMediaFilename(name) {
  const ext = path.extname(name).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext);
}

/** Human-readable alt text from filename (basename without heavy punctuation). */
function altFromFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  const spaced = base.replace(/[-_]+/g, " ").trim();
  return spaced.length ? spaced : filename;
}

/**
 * Gallery = every supported image/video in `media/project-sources/<slug>/` except thumbnail.* (card-only).
 * Sorted by filename (`localeCompare`) so order is stable and git-friendly. Override display order in
 * `content/projects/project-media-order.ts` if needed.
 */
async function discoverGalleryMedia(slug) {
  const dir = path.join(sourceDir, slug);
  const entries = await fs.readdir(dir);

  const unsupported = [];
  const mediaNames = [];

  for (const name of entries) {
    if (name.startsWith(".") || name === ".DS_Store") continue;
    if (GALLERY_SKIP_FILENAMES.has(name)) continue;
    if (isGalleryMediaFilename(name)) {
      mediaNames.push(name);
    } else {
      unsupported.push(name);
    }
  }

  mediaNames.sort((a, b) => a.localeCompare(b));

  if (unsupported.length > 0) {
    const useColor = stdoutSupportsAnsi();
    const msg = `${slug}: skipping non-gallery files (${unsupported.join(", ")})`;
    console.warn(useColor ? `  ${paint(useColor, ansi.dim, msg)}` : `  ${msg}`);
  }

  if (mediaNames.length === 0) {
    throw new Error(
      `Project "${slug}": no gallery media in ${dir}. Add .png/.jpg/.webp/.mov/.mp4 files (thumbnail.mov/png are card-only and excluded from the strip).`,
    );
  }

  return mediaNames.map((source) => {
    const ext = path.extname(source).toLowerCase();
    const kind = VIDEO_EXTENSIONS.has(ext) ? "video" : "image";

    return {
      kind,
      alt: altFromFilename(source),
      desktop: { source },
    };
  });
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Ensures `public/projects` exists. With `--clean-public-projects`, deletes that folder entirely first
 * (e.g. orphaned dirs after removing a slug). Otherwise each project build clears only its own subfolder.
 */
async function prepareOutputDir({ cleanPublicProjects }) {
  if (cleanPublicProjects) {
    await fs.rm(outputDir, { recursive: true, force: true });
  }
  await ensureDir(outputDir);
}

function parseCliArgs(argv) {
  const filtered = argv.slice(2);
  const cleanPublicProjects = filtered.includes("--clean-public-projects");
  const wantsHelp = filtered.includes("--help") || filtered.includes("-h");
  const unknown = filtered.filter(
    (a) => !["--clean-public-projects", "--help", "-h"].includes(a),
  );

  return { cleanPublicProjects, wantsHelp, unknown };
}

function encodeStepTotal(project) {
  let n = 0;
  n += 1;
  if (project.thumbnail.desktop.video) {
    n += 1;
  }
  if (project.thumbnail.mobile) {
    n += 1;
    if (project.thumbnail.mobile.video) {
      n += 1;
    }
  }

  for (const slot of project.media) {
    if (slot.reuseThumbnail) {
      n += 1;
      continue;
    }
    const variantSteps = slot.kind === "video" ? 2 : 1;
    n += variantSteps;
    if (slot.mobile) {
      n += slot.kind === "video" ? 2 : 1;
    }
  }

  return n;
}

function stderrSupportsAnsi() {
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "") {
    return false;
  }
  if (process.env.FORCE_COLOR === "1" || process.env.FORCE_COLOR === "true") {
    return true;
  }
  return Boolean(process.stderr.isTTY);
}

/** Respect https://no-color.org/ and common FORCE_COLOR usage (pnpm/npm/Vercel-style). */
function stdoutSupportsAnsi() {
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "") {
    return false;
  }
  if (process.env.FORCE_COLOR === "1" || process.env.FORCE_COLOR === "true") {
    return true;
  }
  return Boolean(process.stdout.isTTY);
}

const ansi = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  brightCyan: "\x1b[96m",
  green: "\x1b[32m",
  brightGreen: "\x1b[92m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
};

function paint(enabled, code, text) {
  return enabled ? `${code}${text}${ansi.reset}` : text;
}

function divider(enabled) {
  const cols = typeof process.stdout.columns === "number" ? process.stdout.columns : 56;
  const len = Math.max(28, Math.min(cols - 2, 72));
  console.log(enabled ? `${ansi.dim}${"─".repeat(len)}${ansi.reset}` : "-".repeat(len));
}

const PROGRESS_BAR_FILLED = "█";
const PROGRESS_BAR_EMPTY = "░";
const PROGRESS_BAR_WIDTH = 24;

function createProgressState(total) {
  let i = 0;
  const w = String(Math.max(total, 1)).length;
  const color = stdoutSupportsAnsi();

  return {
    tick(label) {
      i += 1;
      const pct = total ? Math.min(100, Math.round((100 * i) / total)) : 100;

      let filledSeg = total ? Math.round((PROGRESS_BAR_WIDTH * i) / total) : PROGRESS_BAR_WIDTH;
      if (i > 0 && i < total && filledSeg === 0) {
        filledSeg = 1;
      }
      if (i >= total) {
        filledSeg = PROGRESS_BAR_WIDTH;
      }

      const filledStr = PROGRESS_BAR_FILLED.repeat(filledSeg);
      const emptyStr = PROGRESS_BAR_EMPTY.repeat(PROGRESS_BAR_WIDTH - filledSeg);
      const bar =
        color && filledSeg > 0
          ? `${ansi.brightCyan}${filledStr}${ansi.gray}${emptyStr}${ansi.reset}`
          : `${filledStr}${emptyStr}`;

      const idx = `${String(i).padStart(w, " ")}/${total}`;
      const bullet = color ? `${ansi.cyan}❯${ansi.reset}` : ">";
      const countPart = color ? `${ansi.bold}${idx}${ansi.reset}` : idx;

      console.log(
        `  ${bullet} ${bar}  ${paint(color, ansi.dim, `${String(pct).padStart(3)}%`)}  ${countPart}  ${paint(color, ansi.dim, label)}`,
      );
    },
  };
}

const { cleanPublicProjects, wantsHelp, unknown } = parseCliArgs(process.argv);

if (wantsHelp) {
  console.log(`Usage: node scripts/generate-project-media.mjs [options]

Options:
  --clean-public-projects   Delete ${path.relative(rootDir, outputDir) || outputDir} entirely first (removes orphaned project folders too).
  --help, -h                Show this message.

By default each project folder (public/projects/<slug>/) is removed and recreated so outputs exactly match this run — no leftover media-* or thumbnails for that slug.

Gallery inputs: all supported images/videos in each media/project-sources/<slug>/ folder except thumbnail.mov / thumbnail.png (card-only). Sorted by filename; reorder on the site via content/projects/project-media-order.ts.

Progress styling uses Unicode (█░ ❯ ✓ …) and ANSI colors when stdout is a TTY; set NO_COLOR to disable colors. FORCE_COLOR=1 forces colors (e.g. when piping to tools that support ANSI).
`);
  process.exit(0);
}

if (unknown.length) {
  const errColor = stderrSupportsAnsi();
  console.error(`  ${paint(errColor, ansi.red, "✖")} Unknown argument(s): ${unknown.join(", ")}`);
  console.error(`  ${paint(errColor, ansi.dim, "Try --help for usage.")}`);
  process.exit(1);
}

function sourcePath(projectSlug, file) {
  return path.join(sourceDir, projectSlug, file);
}

function publicPath(projectSlug, file) {
  return `/projects/${projectSlug}/${file}`;
}

async function pathExists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Expects `thumbnail.png` next to `thumbnail.mov` (mirroring project-media-organized).
 * If `thumbnail.png` is missing but `thumbnail.mov` exists, writes `thumbnail.png` from its first decoded frame (same rule as gallery posters).
 */
async function ensureThumbnailPng(slug) {
  const dir = path.join(sourceDir, slug);
  const pngPath = path.join(dir, "thumbnail.png");
  if (await pathExists(pngPath)) return;

  const movPath = path.join(dir, "thumbnail.mov");
  if (!(await pathExists(movPath))) {
    throw new Error(
      `Project "${slug}": missing thumbnail.png (card poster). Add it next to thumbnail.mov under media/project-sources/${slug}/.`,
    );
  }

  const tmp = `${pngPath}.derive.tmp.png`;
  const useColor = stdoutSupportsAnsi();
  const slugTag = useColor ? `${ansi.dim}(${slug})${ansi.reset}` : `(${slug})`;
  const arrow = useColor ? `${ansi.dim}↳${ansi.reset}` : ">";
  console.log(`  ${arrow} deriving thumbnail.png ← thumbnail.mov  ${slugTag}`);
  await execFile("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    movPath,
    "-vf",
    FFMPEG_FIRST_FRAME,
    "-frames:v",
    "1",
    tmp,
  ]);
  try {
    await sharp(tmp, { limitInputPixels: false }).png(PNG_OUTPUT).toFile(pngPath);
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}

async function resolveProjects() {
  const projects = [];
  for (const slug of projectSlugs) {
    await ensureThumbnailPng(slug);
    const media = await discoverGalleryMedia(slug);
    projects.push({
      slug,
      thumbnail: {
        desktop: {
          poster: {
            source: "thumbnail.png",
            position: thumbnailPosterPositionBySlug[slug] ?? "centre",
          },
          video: { source: "thumbnail.mov" },
        },
      },
      media,
    });
  }
  return projects;
}

function rasterPipeline(projectSlug, file) {
  return sharp(sourcePath(projectSlug, file), { limitInputPixels: false }).rotate().withMetadata();
}

function toDurationSeconds(start, end) {
  return Math.max(0.4, Number((end - start).toFixed(3)));
}

function resolvedTrimSegment(start, end) {
  const s = typeof start === "number" && Number.isFinite(start) ? start : 0;
  let e = typeof end === "number" && Number.isFinite(end) ? end : s + DEFAULT_TRIM_SEGMENT_SEC;
  if (!(e > s)) {
    e = s + DEFAULT_TRIM_SEGMENT_SEC;
  }
  return { start: s, end: e };
}

async function ffprobeFormatDurationSeconds(filePath) {
  const { stdout } = await execFile("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);

  const parsed = parseFloat(String(stdout).trim());
  return Number.isFinite(parsed) ? parsed : NaN;
}

async function ffprobeVideoDimensions(filePath) {
  const { stdout } = await execFile("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "json",
    filePath,
  ]);

  const payload = JSON.parse(stdout);
  return {
    width: payload.streams?.[0]?.width,
    height: payload.streams?.[0]?.height,
  };
}

async function buildThumbnailImage(projectSlug, file, outputPath) {
  const output = await rasterPipeline(projectSlug, file).png(PNG_OUTPUT).toFile(outputPath);

  return {
    width: output.width,
    height: output.height,
  };
}

async function buildGalleryImage(projectSlug, file, outputPath) {
  const output = await rasterPipeline(projectSlug, file).png(PNG_OUTPUT).toFile(outputPath);

  return {
    width: output.width,
    height: output.height,
  };
}

async function extractVideoFirstFramePoster(projectSlug, sourceRelativePath, outputPath) {
  const inputPath = sourcePath(projectSlug, sourceRelativePath);
  const tmp = `${outputPath}.frame.tmp.png`;
  await execFile("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-vf",
    FFMPEG_FIRST_FRAME,
    "-frames:v",
    "1",
    tmp,
  ]);
  try {
    const output = await sharp(tmp, { limitInputPixels: false }).png(PNG_OUTPUT).toFile(outputPath);
    return {
      width: output.width,
      height: output.height,
    };
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}

async function encodeMp4Clip(projectSlug, file, outputPath, start, end, { preset, crf }) {
  const inputPath = sourcePath(projectSlug, file);
  const sourceDurationSec = await ffprobeFormatDurationSeconds(inputPath);
  const trim =
    Number.isFinite(sourceDurationSec) && sourceDurationSec > FULL_VIDEO_TRIM_THRESHOLD_SEC;

  const args = ["-y"];
  if (trim) {
    const { start: ss, end: ee } = resolvedTrimSegment(start, end);
    args.push("-ss", `${ss}`, "-i", inputPath, "-t", `${toDurationSeconds(ss, ee)}`);
  } else {
    args.push("-i", inputPath);
  }

  args.push(
    "-an",
    "-vf",
    FFMPEG_EVEN_YUV420,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    preset,
    "-crf",
    `${crf}`,
    "-movflags",
    "+faststart",
    "-map_metadata",
    "-1",
    outputPath,
  );

  await execFile("ffmpeg", args);
  return ffprobeVideoDimensions(outputPath);
}

async function buildThumbnailVideo(projectSlug, file, outputPath, start, end) {
  return encodeMp4Clip(projectSlug, file, outputPath, start, end, {
    preset: H264_PRESET_CARD,
    crf: H264_CRF_CARD,
  });
}

async function buildGalleryVideo(projectSlug, file, outputPath, start, end) {
  return encodeMp4Clip(projectSlug, file, outputPath, start, end, {
    preset: H264_PRESET_GALLERY,
    crf: H264_CRF_GALLERY,
  });
}

async function buildThumbnailVariant(project, projectDir, variant, suffix = "", progress) {
  const cardLabel = suffix ? "card mobile" : "card desktop";
  const posterName = `thumbnail${suffix}.png`;
  const posterOutputPath = path.join(projectDir, posterName);
  progress.tick(`${project.slug} · ${cardLabel} · poster PNG`);
  const posterMeta = await buildThumbnailImage(
    project.slug,
    variant.poster.source,
    posterOutputPath,
  );

  let videoMeta;
  if (variant.video) {
    const videoName = `thumbnail${suffix}.mp4`;
    progress.tick(`${project.slug} · ${cardLabel} · hover MP4`);
    videoMeta = await buildThumbnailVideo(
      project.slug,
      variant.video.source,
      path.join(projectDir, videoName),
      variant.video.start,
      variant.video.end,
    );
  }

  return {
    poster: publicPath(project.slug, posterName),
    video: videoMeta ? publicPath(project.slug, `thumbnail${suffix}.mp4`) : undefined,
    width: posterMeta.width,
    height: posterMeta.height,
  };
}

async function buildMediaVariant(project, projectDir, slot, index, variantName, variant, kind, progress) {
  const suffix = variantName === "mobile" ? "-mobile" : "";
  const baseName = `media-${String(index + 1).padStart(2, "0")}${suffix}`;
  const variantLabel = variantName === "mobile" ? "mobile" : "desktop";

  if (kind === "image") {
    const fileName = `${baseName}.png`;
    const outputPath = path.join(projectDir, fileName);
    progress.tick(`${project.slug} · ${baseName} · ${variantLabel} · image → PNG`);
    const meta = await buildGalleryImage(project.slug, variant.source, outputPath);

    return {
      src: publicPath(project.slug, fileName),
      width: meta.width,
      height: meta.height,
    };
  }

  const fileName = `${baseName}.mp4`;
  const outputPath = path.join(projectDir, fileName);
  const posterName = `${baseName}-poster.png`;
  const posterPath = path.join(projectDir, posterName);

  progress.tick(`${project.slug} · ${baseName} · ${variantLabel} · poster frame`);
  const posterMeta = await extractVideoFirstFramePoster(project.slug, variant.source, posterPath);
  const poster = {
    src: publicPath(project.slug, posterName),
    width: posterMeta.width,
    height: posterMeta.height,
  };

  progress.tick(`${project.slug} · ${baseName} · ${variantLabel} · video → MP4`);
  const meta = await buildGalleryVideo(project.slug, variant.source, outputPath, variant.start, variant.end);

  return {
    src: publicPath(project.slug, fileName),
    poster: poster?.src,
    width: meta.width,
    height: meta.height,
  };
}

async function buildProjectMedia(project, progress) {
  const projectDir = path.join(outputDir, project.slug);
  await fs.rm(projectDir, { recursive: true, force: true });
  await ensureDir(projectDir);

  const thumbnail = {
    desktop: await buildThumbnailVariant(project, projectDir, project.thumbnail.desktop, "", progress),
    mobile: project.thumbnail.mobile
      ? await buildThumbnailVariant(project, projectDir, project.thumbnail.mobile, "-mobile", progress)
      : undefined,
  };

  const media = [];

  for (let index = 0; index < project.media.length; index += 1) {
    const slot = project.media[index];
    const slotLabel = `media-${String(index + 1).padStart(2, "0")}`;

    if (slot.reuseThumbnail) {
      progress.tick(`${project.slug} · ${slotLabel} · reuse card thumbnail`);
      media.push({
        kind: "video",
        alt: slot.alt,
        loop: slot.loop ?? true,
        desktop: {
          src: thumbnail.desktop.video ?? thumbnail.desktop.poster,
          poster: thumbnail.desktop.poster,
          width: thumbnail.desktop.width,
          height: thumbnail.desktop.height,
        },
        mobile: thumbnail.mobile
          ? {
              src: thumbnail.mobile.video ?? thumbnail.mobile.poster,
              poster: thumbnail.mobile.poster,
              width: thumbnail.mobile.width,
              height: thumbnail.mobile.height,
            }
          : undefined,
      });
      continue;
    }

    const desktop = await buildMediaVariant(project, projectDir, slot, index, "desktop", slot.desktop, slot.kind, progress);
    const mobile = slot.mobile
      ? await buildMediaVariant(project, projectDir, slot, index, "mobile", slot.mobile, slot.kind, progress)
      : undefined;

    media.push({
      kind: slot.kind,
      alt: slot.alt,
      loop: slot.kind === "video" ? slot.loop ?? true : undefined,
      desktop,
      mobile,
    });
  }

  return {
    thumbnail,
    media,
  };
}

function renderGeneratedFile(payload) {
  return `import type { ProjectEntry } from "./types";\n\n` +
    `type ProjectGeneratedMedia = Pick<ProjectEntry, "thumbnail" | "media">;\n\n` +
    `export const generatedProjectMedia = ${JSON.stringify(payload, null, 2)} satisfies Record<string, ProjectGeneratedMedia>;\n`;
}

console.log("");
const useColor = stdoutSupportsAnsi();
divider(useColor);
const relSrc = path.relative(rootDir, sourceDir);
console.log(
  useColor
    ? `  ${ansi.cyan}◆${ansi.reset} ${ansi.bold}Scan sources${ansi.reset}  ${paint(useColor, ansi.dim, `${projectSlugs.length} slugs · ${relSrc}`)}`
    : `Scanning sources (${projectSlugs.length} slugs under ${relSrc}) …`,
);
const projects = await resolveProjects();

const encodeTotal =
  projects.reduce((sum, p) => sum + encodeStepTotal(p), 0) + 1;
const progress = createProgressState(encodeTotal);

divider(useColor);
console.log(
  useColor
    ? `  ${ansi.cyan}◆${ansi.reset} ${ansi.bold}Encode${ansi.reset}  ${paint(useColor, ansi.dim, `${encodeTotal} steps · ends with generated-media.ts`)}`
    : `Encoding → ${encodeTotal} steps (includes generated-media.ts)`,
);
console.log("");

await prepareOutputDir({ cleanPublicProjects });
if (cleanPublicProjects) {
  const relOut = path.relative(rootDir, outputDir) || outputDir;
  console.log(
    useColor
      ? `  ${ansi.dim}◇ cleaned ${relOut}${ansi.reset}`
      : `Cleaned ${relOut}`,
  );
  console.log("");
}

const generatedMedia = {};
for (const project of projects) {
  generatedMedia[project.slug] = await buildProjectMedia(project, progress);
}

progress.tick("write content/projects/generated-media.ts");
await fs.writeFile(generatedContentPath, renderGeneratedFile(generatedMedia));
divider(useColor);
const relOutDone = path.relative(rootDir, outputDir) || outputDir;
console.log(
  useColor
    ? `  ${paint(useColor, ansi.brightGreen, "✓")} ${ansi.bold}Done${ansi.reset}  ${paint(useColor, ansi.dim, `${projects.length} projects → ${relOutDone}`)}`
    : `Done — ${projects.length} projects → ${relOutDone}`,
);
console.log("");
