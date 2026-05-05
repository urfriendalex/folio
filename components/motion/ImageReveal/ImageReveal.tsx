"use client";

import { useRef, type ComponentPropsWithoutRef } from "react";
import { useRevealOnView } from "@/components/motion/shared/useRevealOnView";
import styles from "@/components/motion/shared/reveal.module.scss";

type ImageRevealProps = ComponentPropsWithoutRef<"div"> & {
  className?: string;
};

export function ImageReveal({ children, className, ...props }: ImageRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const visible = useRevealOnView(ref);

  return (
    <div
      {...props}
      ref={ref}
      className={[styles.imageReveal, className].filter(Boolean).join(" ")}
      data-visible={visible}
    >
      {children}
    </div>
  );
}
