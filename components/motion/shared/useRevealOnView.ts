"use client";

import { useEffect, useState, type RefObject } from "react";

type UseRevealOnViewOptions = {
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
};

export function useRevealOnView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options?: UseRevealOnViewOptions,
) {
  const [visible, setVisible] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return undefined;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        setVisible(true);

        if (options?.once !== false) {
          observer.disconnect();
        }
      },
      {
        rootMargin: options?.rootMargin ?? "0px 0px -10% 0px",
        threshold: options?.threshold ?? 0.2,
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [options?.once, options?.rootMargin, options?.threshold, ref]);

  return visible;
}
