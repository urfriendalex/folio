import type { CSSProperties } from "react";
import type { ProjectMediaPlaceholderGrid as ProjectMediaPlaceholderGridShape } from "@/lib/projectMedia";
import styles from "./ProjectMediaPlaceholderGrid.module.scss";

type ProjectMediaPlaceholderGridProps = {
  grid: ProjectMediaPlaceholderGridShape;
  className?: string;
  visible?: boolean;
};

export function ProjectMediaPlaceholderGrid({
  grid,
  className,
  visible = true,
}: ProjectMediaPlaceholderGridProps) {
  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-visible={visible ? "true" : "false"}
      aria-hidden="true"
      style={
        {
          "--placeholder-cols": grid.cols,
          "--placeholder-rows": grid.rows,
        } as CSSProperties
      }
    >
      {Array.from({ length: grid.cols * grid.rows }, (_, cellIndex) => (
        <span key={cellIndex} className={styles.cell} />
      ))}
    </div>
  );
}
