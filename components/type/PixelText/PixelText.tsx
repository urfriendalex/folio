"use client";

import type { CSSProperties } from "react";
import styles from "./PixelText.module.scss";

type PixelTextTag = "span" | "h1" | "h2" | "p";

type PixelTextProps = {
  as?: PixelTextTag;
  className?: string;
  pixelFrom?: number;
  text: string;
};

export function PixelText({
  as = "span",
  className,
  pixelFrom = 64,
  text,
}: PixelTextProps) {
  const classNames = [styles.root, className].filter(Boolean).join(" ");
  const style = { "--pixel-from": `${pixelFrom}%` } as CSSProperties;
  const children = (
    <>
      <span className={styles.base}>{text}</span>
      <span aria-hidden="true" className={styles.pixel}>
        {text}
      </span>
    </>
  );

  switch (as) {
    case "h1":
      return <h1 className={classNames} style={style}>{children}</h1>;
    case "h2":
      return <h2 className={classNames} style={style}>{children}</h2>;
    case "p":
      return <p className={classNames} style={style}>{children}</p>;
    case "span":
    default:
      return <span className={classNames} style={style}>{children}</span>;
  }
}
