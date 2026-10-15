type Point = { x: number; y: number };

/** One wave across the rendered sheet, bounded so long projects never wait seconds. */
export function projectRevealDelays(points: Point[], desktop: boolean): number[] {
  if (!points.length) return [];
  const left = Math.min(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  const scores = points.map((point) => (point.y - top) * 0.9 + (desktop ? (point.x - left) * 0.25 : 0));
  const scale = Math.min(1, 800 / Math.max(1, ...scores));
  return scores.map((score) => Math.round(score * scale));
}
