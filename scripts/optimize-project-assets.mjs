import fs from "node:fs/promises";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const execFile = promisify(execFileCallback);
const COLOR_CHUNKS = new Set(["gAMA", "cHRM", "sRGB", "iCCP", "cICP", "mDCV", "cLLI"]);

function pngChunks(buffer) {
  const chunks = [];
  for (let offset = 8; offset < buffer.length;) {
    const length = buffer.readUInt32BE(offset);
    const end = offset + length + 12;
    if (end > buffer.length) throw new Error("Invalid PNG chunk length");
    chunks.push({ type: buffer.toString("ascii", offset + 4, offset + 8), data: buffer.subarray(offset, end) });
    offset = end;
  }
  return chunks;
}

function preservePngColors(original, encoded) {
  const colors = pngChunks(original).filter(({ type }) => COLOR_CHUNKS.has(type));
  const chunks = pngChunks(encoded).filter(({ type }) => !COLOR_CHUNKS.has(type));
  // Reuse complete chunks including their CRCs, before any palette or image data.
  return Buffer.concat([encoded.subarray(0, 8), chunks[0].data,
    ...colors.map(({ data }) => data), ...chunks.slice(1).map(({ data }) => data)]);
}

async function pixelSignature(input) {
  const { data, info } = await sharp(input).raw().toBuffer({ resolveWithObject: true });
  const metadata = await sharp(input).metadata();
  return JSON.stringify({
    width: info.width, height: info.height, channels: info.channels,
    depth: metadata.depth, orientation: metadata.orientation ?? 1,
    icc: metadata.icc?.toString("base64"),
    colors: pngChunks(input).filter(({ type }) => COLOR_CHUNKS.has(type))
      .map(({ data }) => data.toString("hex")).sort(),
    pixels: createHash("sha256").update(data).digest("hex"),
  });
}

async function videoSignature(file) {
  const { stdout } = await execFile("ffprobe", [
    "-v", "error", "-show_packets", "-show_data_hash", "sha256",
    "-show_entries",
    "stream=index,codec_name,codec_tag_string,width,height,pix_fmt,color_range,color_space,color_transfer,color_primaries,time_base,avg_frame_rate:packet=stream_index,pts,dts,duration,flags,data_hash",
    "-of", "json", file,
  ], { maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

async function* assets(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* assets(file);
    else if (entry.isFile() && /\.(png|mp4)$/i.test(entry.name)) yield file;
  }
}

export async function optimizeProjectAssets(directory = path.resolve("public/projects")) {
  let saved = 0;
  let changed = 0;
  let checked = 0;
  for await (const file of assets(directory)) {
    checked++;
    const original = await fs.readFile(file);
    let candidate;
    if (file.endsWith(".png")) {
      candidate = original;
      for (const adaptiveFiltering of [true, false]) {
        const encoded = preservePngColors(original, await sharp(original).keepMetadata().png({
          compressionLevel: 9, effort: 10, adaptiveFiltering, palette: false,
        }).toBuffer());
        if (encoded.length < candidate.length) candidate = encoded;
      }
      if (candidate.length === original.length) continue;
      if (await pixelSignature(original) !== await pixelSignature(candidate)) {
        throw new Error(`Pixel or color metadata mismatch: ${file}`);
      }
    } else {
      const temporary = `${file}.optimize-tmp.mp4`;
      try {
        await execFile("ffmpeg", [
          "-y", "-v", "error", "-i", file, "-map", "0", "-c", "copy",
          "-map_metadata", "0", "-movflags", "+faststart", temporary,
        ]);
        candidate = await fs.readFile(temporary);
        // Avoid binary churn for negligible container-only savings.
        if (original.length - candidate.length < 1024) continue;
        if (await videoSignature(file) !== await videoSignature(temporary)) {
          console.log(`Kept original (container conversion changed timing/metadata): ${file}`);
          continue;
        }
      } finally {
        await fs.unlink(temporary).catch(() => {});
      }
    }
    // Only replace after exact content verification; never introduce another lossy encode.
    const temporary = `${file}.optimize-tmp`;
    try {
      await fs.writeFile(temporary, candidate);
      await fs.rename(temporary, file);
    } finally {
      await fs.unlink(temporary).catch(() => {});
    }
    saved += original.length - candidate.length;
    changed++;
    console.log(`${path.relative(process.cwd(), file)}: saved ${original.length - candidate.length} bytes`);
  }
  console.log(`Checked ${checked} assets; optimized ${changed}; saved ${(saved / 1024 / 1024).toFixed(2)} MiB without resizing or re-encoding video.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await optimizeProjectAssets();
}
