/**
 * The hero's glitch: each glyph has a random threshold, visibility runs in hard steps, and a glyph just
 * above its threshold flickers on alternate steps before it holds. Strictly on or off, never half-faded.
 */
export const GLYPH_GLITCH_STEPS = 64;
/** Thresholds stop short of 1 so no glyph is still flickering at rest. */
export const GLYPH_GLITCH_THRESHOLD_MAX = 0.9;
/** Just above its threshold a glyph flickers on alternate steps for this much visibility (≈ five steps). */
const GLYPH_GLITCH_FLICKER_BAND = 0.08;

export function isGlyphShown(visibility: number, threshold: number, phase: number) {
  if (visibility < threshold) {
    return false;
  }
  if (visibility >= threshold + GLYPH_GLITCH_FLICKER_BAND) {
    return true;
  }
  return (Math.round(visibility * GLYPH_GLITCH_STEPS) + phase) % 2 === 1;
}
