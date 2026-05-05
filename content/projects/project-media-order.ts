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
};
