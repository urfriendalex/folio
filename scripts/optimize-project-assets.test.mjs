import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { optimizeProjectAssets } from "./optimize-project-assets.mjs";

const execFile = promisify(execFileCallback);

test("optimization preserves pixels, color metadata, dimensions and is idempotent", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "folio-assets-"));
  try {
    const file = path.join(directory, "poster.png");
    const image = await sharp({ create: {
      width: 128, height: 64, channels: 4, background: { r: 200, g: 50, b: 80, alpha: 0.5 },
    } }).png({ compressionLevel: 0 }).toBuffer();
    // A valid gAMA chunk for gamma 0.45455, as carried by captured posters.
    const gamma = Buffer.from("0000000467414d410000b18f0bfc6105", "hex");
    const original = Buffer.concat([image.subarray(0, 33), gamma, image.subarray(33)]);
    await fs.writeFile(file, original);
    await fs.writeFile(path.join(directory, "untouched.txt"), "keep");
    await optimizeProjectAssets(directory);
    const optimized = await fs.readFile(file);
    assert.ok(optimized.length < original.length);
    assert.ok(optimized.includes(gamma));
    assert.deepEqual(await sharp(optimized).raw().toBuffer(), await sharp(original).raw().toBuffer());
    assert.equal((await sharp(optimized).metadata()).width, 128);
    assert.equal((await sharp(optimized).metadata()).height, 64);
    await optimizeProjectAssets(directory);
    assert.deepEqual(await fs.readFile(file), optimized);
    assert.equal(await fs.readFile(path.join(directory, "untouched.txt"), "utf8"), "keep");
    assert.deepEqual((await fs.readdir(directory)).sort(), ["poster.png", "untouched.txt"]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("MP4 optimization preserves encoded packets and timing", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "folio-video-"));
  try {
    const file = path.join(directory, "clip.mp4");
    await execFile("ffmpeg", ["-v", "error", "-f", "lavfi", "-i",
      "color=c=red:s=32x32:r=30", "-t", "0.2", "-c:v", "libx264", file]);
    const padding = Buffer.alloc(8192);
    padding.writeUInt32BE(padding.length);
    padding.write("free", 4, "ascii");
    await fs.appendFile(file, padding);
    const probe = async () => (await execFile("ffprobe", ["-v", "error",
      "-show_packets", "-show_data_hash", "sha256", "-show_entries",
      "packet=stream_index,pts,dts,duration,flags,data_hash:stream=width,height,avg_frame_rate,pix_fmt",
      "-of", "json", file])).stdout;
    const before = await probe();
    const originalSize = (await fs.stat(file)).size;
    await optimizeProjectAssets(directory);
    assert.equal(await probe(), before);
    assert.ok((await fs.stat(file)).size < originalSize);
    const optimized = await fs.readFile(file);
    await optimizeProjectAssets(directory);
    assert.deepEqual(await fs.readFile(file), optimized);
    assert.deepEqual(await fs.readdir(directory), ["clip.mp4"]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
