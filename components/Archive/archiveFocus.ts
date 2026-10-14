type Position = { x: number; y: number; z: number };

/** Fit media in the viewport while retaining at least one source pixel per rendered pixel. */
export function archiveFocusDistance({
  worldWidth,
  worldHeight,
  sourceWidth,
  sourceHeight,
  viewportWidth,
  viewportHeight,
  pixelRatio,
  verticalFov,
  viewportFill = 0.72,
}: {
  worldWidth: number;
  worldHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  verticalFov: number;
  viewportFill?: number;
}) {
  const tanHalfVertical = Math.tan((verticalFov * Math.PI) / 360);
  const aspect = Math.max(viewportWidth, 1) / Math.max(viewportHeight, 1);
  const verticalProjection = worldHeight / (2 * tanHalfVertical);
  const horizontalProjection = worldWidth / (2 * tanHalfVertical * aspect);
  const fitDistance = Math.max(verticalProjection, horizontalProjection) / viewportFill;
  const nativeDistance = Math.max(
    verticalProjection * viewportHeight * pixelRatio / Math.max(sourceHeight, 1),
    horizontalProjection * viewportWidth * pixelRatio / Math.max(sourceWidth, 1),
  );

  // The camera near plane is 1; keep the selected plane comfortably beyond it.
  return Math.max(2, fitDistance, nativeDistance);
}

/** Search repeated, seeded chunk contents rather than only currently mounted meshes. */
export function nearestArchiveOccurrence<T extends { position: Position }>({
  camera,
  chunkSize,
  getPlanes,
  matches,
  maxRadius = 6,
}: {
  camera: Position;
  chunkSize: number;
  getPlanes: (x: number, y: number, z: number) => T[];
  matches: (plane: T) => boolean;
  maxRadius?: number;
}): T | null {
  const center = {
    x: Math.floor(camera.x / chunkSize),
    y: Math.floor(camera.y / chunkSize),
    z: Math.floor(camera.z / chunkSize),
  };
  let nearest: T | null = null;
  let nearestDistanceSq = Infinity;

  for (let radius = 0; radius <= maxRadius; radius += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      for (let y = -radius; y <= radius; y += 1) {
        for (let z = -radius; z <= radius; z += 1) {
          if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) !== radius) continue;
          for (const plane of getPlanes(center.x + x, center.y + y, center.z + z)) {
            if (!matches(plane)) continue;
            const distanceSq =
              (plane.position.x - camera.x) ** 2 +
              (plane.position.y - camera.y) ** 2 +
              (plane.position.z - camera.z) ** 2;
            if (distanceSq < nearestDistanceSq) {
              nearest = plane;
              nearestDistanceSq = distanceSq;
            }
          }
        }
      }
    }

    // Every unsearched chunk lies outside this box. Stop only when none can be closer.
    const distanceToUnsearched = Math.min(
      camera.x - (center.x - radius) * chunkSize,
      (center.x + radius + 1) * chunkSize - camera.x,
      camera.y - (center.y - radius) * chunkSize,
      (center.y + radius + 1) * chunkSize - camera.y,
      camera.z - (center.z - radius) * chunkSize,
      (center.z + radius + 1) * chunkSize - camera.z,
    );
    if (nearestDistanceSq <= distanceToUnsearched ** 2) break;
  }

  return nearest;
}
