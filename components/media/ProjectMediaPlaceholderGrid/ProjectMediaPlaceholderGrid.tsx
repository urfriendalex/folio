import type { CSSProperties } from "react";
import type { ProjectMediaPlaceholderGrid as ProjectMediaPlaceholderGridShape } from "@/lib/projectMedia";
import styles from "./ProjectMediaPlaceholderGrid.module.scss";

type ProjectMediaPlaceholderGridProps = {
  grid: ProjectMediaPlaceholderGridShape;
  className?: string;
  visible?: boolean;
  /** `pixel`: on hide, cells switch off one by one in a scattered order instead of the grid fading. */
  reveal?: "fade" | "pixel";
};

/** Spread of the scattered cell switch-off; keep in sync with `--pixel-reveal-spread` in the SCSS. */
const PIXEL_REVEAL_SPREAD_MS = 640;

/** Same integer hash as `cellRevealHash01` in `components/Preloader/ascii.tsx` (kept local so every media
    tile doesn't pull in the ASCII module), so the scatter reads like the rest of the site's cell reveals. */
function cellHash01(cellIndex: number, seed: number) {
  let h = Math.imul(cellIndex ^ seed, 0x9e3779b9) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

export function ProjectMediaPlaceholderGrid({
  grid,
  className,
  visible = true,
  reveal = "fade",
}: ProjectMediaPlaceholderGridProps) {
  const pixel = reveal === "pixel";
  /* Seed from the grid shape so neighbouring tiles of the same shape still share one stable order. */
  const seed = grid.cols * 131 + grid.rows;

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-visible={visible ? "true" : "false"}
      data-reveal={reveal}
      aria-hidden="true"
      style={
        {
          "--placeholder-cols": grid.cols,
          "--placeholder-rows": grid.rows,
        } as CSSProperties
      }
    >
      {Array.from({ length: grid.cols * grid.rows }, (_, cellIndex) => (
        <span
          key={cellIndex}
          className={styles.cell}
          style={
            pixel
              ? ({ "--cell-delay": `${Math.round(cellHash01(cellIndex, seed) * PIXEL_REVEAL_SPREAD_MS)}ms` } as CSSProperties)
              : undefined
          }
        />
      ))}
    </div>
  );
}
