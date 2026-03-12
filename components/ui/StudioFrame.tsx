import type { CSSProperties } from "react";
import styles from "./StudioFrame.module.scss";

type StudioFrameProps = {
  accent: string;
  caption: string;
  eyebrow: string;
  title: string;
};

export function StudioFrame({ accent, caption, eyebrow, title }: StudioFrameProps) {
  return (
    <div className={styles.frame} style={{ "--studio-accent": accent } as CSSProperties}>
      <div className={styles.chrome}>
        <div className={styles.dots} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className={styles.meta}>
          <span>{eyebrow}</span>
          <span>{caption}</span>
        </div>
      </div>
      <div className={styles.canvas}>
        <div className={styles.poster}>
          <div className={styles.posterLabel}>{title}</div>
          <div className={styles.posterFooter}>
            <span>view images</span>
            <span>scroll for more</span>
          </div>
        </div>
        <div className={styles.stack} aria-hidden="true">
          <div className={styles.row} />
          <div className={styles.row} />
          <div className={styles.row} />
        </div>
      </div>
    </div>
  );
}
