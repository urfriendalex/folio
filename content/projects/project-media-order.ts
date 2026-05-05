/**
 * Gallery order overrides per project. Basenames match `desktop.src` under `/projects/<slug>/`
 * (e.g. `media-02.mp4`, `media-05.png`). Lower `orderIndex` appears first.
 *
 * Without overrides, order follows **sorted filenames** in `media/project-sources/<slug>/` after generation.
 *
 * Slots you omit keep their relative order after any numbered entries (stable fallback).
 * To interleave precisely, assign an index to every asset you care about.
 *
 * This file is not overwritten by `pnpm generate:project-media` — unlike edits inside
 * `generated-media.ts`.
 *
 * @example
 * ```ts
 * export const projectMediaOrderIndexBySlug: Partial<
 *   Record<string, Partial<Record<string, number>>>
 * > = {
 *   "studio-iskra": {
 *     "media-02.mp4": 1,
 *     "media-01.mp4": 2,
 *   },
 * };
 * ```
 */
export const projectMediaOrderIndexBySlug: Partial<
  Record<string, Partial<Record<string, number>>>
> = {
  "axiros-axf-axess": {
    "media-06.png": 1,
  },
  ohgotmi: {
    "media-07.mp4": 1,
  },
  "studio-iskra": {
    "media-07.mp4": 1,
  },
  "diana-milkanova": {
    "media-03.mp4": 1,
    "media-04.mp4": 2,
  },
  /**
   * Pastel Muse: open with desktop tabs (08), then interleave portrait captures (01–03) with
   * desktop screenshots/videos so the grid isn’t “all mobile then all desktop”.
   */
  "pastel-muse": {
    "media-08.mp4": 1,
    "media-01.mp4": 2,
    "media-04.mp4": 3,
    "media-02.mp4": 4,
    "media-05.png": 5,
    "media-03.mp4": 6,
    "media-06.png": 7,
    "media-07.png": 8,
    "media-09.mp4": 9,
  },
};
