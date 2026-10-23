"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { ProjectMediaPlaceholderGrid as ProjectMediaPlaceholderGridShape } from "@/lib/projectMedia";
import styles from "./ProjectMediaPlaceholderGrid.module.scss";

type ProjectMediaPlaceholderGridProps = {
  grid: ProjectMediaPlaceholderGridShape;
  className?: string;
  visible?: boolean;
  /** `pixel`: on hide, cells switch off one by one in a scattered order instead of the grid fading. */
  reveal?: "fade" | "pixel";
};

/** How long the scattered switch-off takes, and how long each cell sits at its half step. */
const PIXEL_REVEAL_SPREAD_MS = 640;
const PIXEL_REVEAL_STEP_MS = 110;

/** Same integer hash as `cellRevealHash01` in `components/Preloader/ascii.tsx` (kept local so every media
    tile doesn't pull in the ASCII module), so the scatter reads like the rest of the site's cell reveals. */
function cellHash01(cellIndex: number, seed: number) {
  let h = Math.imul(cellIndex ^ seed, 0x9e3779b9) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ProjectMediaPlaceholderGrid({
  grid,
  className,
  visible = true,
  reveal = "fade",
}: ProjectMediaPlaceholderGridProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pixel = reveal === "pixel";
  const cellCount = grid.cols * grid.rows;
  /* Cell indices sorted by their hashed delay; seeded by the grid shape so the order is stable. */
  const order = useMemo(() => {
    if (!pixel) {
      return null;
    }
    const seed = grid.cols * 131 + grid.rows;
    return Array.from({ length: cellCount }, (_, index) => ({
      index,
      at: cellHash01(index, seed) * PIXEL_REVEAL_SPREAD_MS,
    })).sort((a, b) => a.at - b.at);
  }, [cellCount, grid.cols, grid.rows, pixel]);

  /* Pixel reveal runs as one rAF loop that flips `data-step` on the few cells due each frame. Per-cell
     CSS transitions looked the same but fired ~6 transition events per cell (run/start/end × two
     properties) — hundreds of DOM events, all routed through React's root listener, per tile. */
  useEffect(() => {
    const root = rootRef.current;
    if (!pixel || !root || !order) {
      return undefined;
    }

    const cells = root.children as HTMLCollectionOf<HTMLElement>;
    if (visible) {
      // Shown again (e.g. the asset variant swapped on resize): put every cell back.
      delete root.dataset.revealDone;
      for (const cell of cells) cell.removeAttribute("data-step");
      return undefined;
    }

    if (prefersReducedMotion()) {
      root.dataset.revealDone = "true";
      return undefined;
    }

    let frame = 0;
    let start = 0;
    let halfCursor = 0;
    let offCursor = 0;

    const tick = (now: number) => {
      start ||= now;
      const elapsed = now - start;

      while (halfCursor < order.length && order[halfCursor].at <= elapsed) {
        cells[order[halfCursor].index]?.setAttribute("data-step", "half");
        halfCursor += 1;
      }
      while (offCursor < order.length && order[offCursor].at + PIXEL_REVEAL_STEP_MS <= elapsed) {
        cells[order[offCursor].index]?.setAttribute("data-step", "off");
        offCursor += 1;
      }

      if (offCursor < order.length) {
        frame = window.requestAnimationFrame(tick);
        return;
      }

      root.dataset.revealDone = "true";
    };

    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [order, pixel, visible]);

  return (
    <div
      ref={rootRef}
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
      {Array.from({ length: cellCount }, (_, cellIndex) => (
        <span key={cellIndex} className={styles.cell} />
      ))}
    </div>
  );
}
