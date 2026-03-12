"use client";

import { useRef, type ReactNode } from "react";
import { useRevealOnView } from "@/components/motion/shared/useRevealOnView";
import styles from "@/components/motion/shared/reveal.module.scss";

type ImageRevealProps = {
  children: ReactNode;
  className?: string;
};

export function ImageReveal({ children, className }: ImageRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const visible = useRevealOnView(ref);

  return (
    <div
      ref={ref}
      className={[styles.imageReveal, className].filter(Boolean).join(" ")}
      data-visible={visible}
    >
      {children}
    </div>
  );
}
