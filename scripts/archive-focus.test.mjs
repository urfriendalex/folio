import test from "node:test";
import assert from "node:assert/strict";
import { archiveFocusDistance, nearestArchiveOccurrence } from "../components/Archive/archiveFocus.ts";

const base = {
  worldWidth: 16,
  worldHeight: 9,
  sourceWidth: 1920,
  sourceHeight: 1080,
  viewportWidth: 1440,
  viewportHeight: 900,
  pixelRatio: 1.35,
  verticalFov: 85,
};

function projectedSize(options, distance) {
  const verticalSpan = 2 * Math.tan(options.verticalFov * Math.PI / 360) * distance;
  return {
    width: options.worldWidth / verticalSpan * options.viewportHeight,
    height: options.worldHeight / verticalSpan * options.viewportHeight,
  };
}

test("desktop and portrait focus fit the full image inside 72% of each viewport dimension", () => {
  for (const options of [base, { ...base, viewportWidth: 390, viewportHeight: 844 }]) {
    const projected = projectedSize(options, archiveFocusDistance(options));
    assert.ok(projected.width <= options.viewportWidth * 0.72 + 1e-8);
    assert.ok(projected.height <= options.viewportHeight * 0.72 + 1e-8);
  }
  assert.ok(archiveFocusDistance(base) < 14, "closer than the previous fixed minimum");
});

test("small assets on large DPR displays never exceed native image resolution", () => {
  const options = {
    ...base,
    worldWidth: 2,
    worldHeight: 1,
    sourceWidth: 240,
    sourceHeight: 120,
    viewportWidth: 3840,
    viewportHeight: 2160,
    pixelRatio: 2,
  };
  const projected = projectedSize(options, archiveFocusDistance(options));
  assert.ok(projected.width * options.pixelRatio <= options.sourceWidth + 1e-8);
  assert.ok(projected.height * options.pixelRatio <= options.sourceHeight + 1e-8);
});

test("nearest repeated item can be in the next chunk despite a match in the current chunk", () => {
  const farther = { position: { x: 1, y: 50, z: 50 }, id: "farther" };
  const nearer = { position: { x: 101, y: 50, z: 50 }, id: "nearer" };
  const result = nearestArchiveOccurrence({
    camera: { x: 99, y: 50, z: 50 },
    chunkSize: 100,
    matches: () => true,
    getPlanes: (x, y, z) => {
      if (y !== 0 || z !== 0) return [];
      return x === 0 ? [farther] : x === 1 ? [nearer] : [];
    },
  });
  assert.equal(result, nearer);
});

test("negative camera coordinates select the matching occurrence, not another asset", () => {
  const wanted = { position: { x: -1, y: -1, z: -1 }, id: "wanted" };
  const other = { position: { x: -2, y: -2, z: -2 }, id: "other" };
  const result = nearestArchiveOccurrence({
    camera: { x: -2, y: -2, z: -2 },
    chunkSize: 100,
    matches: (plane) => plane.id === "wanted",
    getPlanes: (x, y, z) => x === -1 && y === -1 && z === -1 ? [wanted, other] : [],
  });
  assert.equal(result, wanted);
});

test("missing asset search is bounded and returns null", () => {
  let searches = 0;
  assert.equal(nearestArchiveOccurrence({
    camera: { x: 0, y: 0, z: 0 },
    chunkSize: 100,
    maxRadius: 2,
    matches: () => true,
    getPlanes: () => { searches += 1; return []; },
  }), null);
  assert.equal(searches, 125);
});
