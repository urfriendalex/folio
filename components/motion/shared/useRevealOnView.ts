"use client";

import { useEffect, useState, type RefObject } from "react";
import { usePreloaderComplete } from "@/lib/preloaderComplete";

export type UseRevealOnViewOptions = {
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
  /** After intersection, wait before flipping visible. */
  revealDelayMs?: number;
  /** Skip observers — controlled visibility from parent or {@link useWorkRevealOnView}. */
  observerDisabled?: boolean;
};

export function useRevealOnView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options?: UseRevealOnViewOptions,
) {
  const preloaderComplete = usePreloaderComplete();

  const [visible, setVisible] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (options?.observerDisabled) {
      return undefined;
    }

    const node = ref.current;

    if (!node) {
      return undefined;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      return undefined;
    }

    if (!preloaderComplete) {
      return undefined;
    }

    let revealTimerId: number | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        const delayMs = options?.revealDelayMs ?? 0;

        const finish = () => {
          revealTimerId = undefined;
          setVisible(true);

          if (options?.once !== false) {
            observer.disconnect();
          }
        };

        if (delayMs <= 0) {
          finish();
          return;
        }

        revealTimerId = window.setTimeout(finish, delayMs);
      },
      {
        rootMargin: options?.rootMargin ?? "0px 0px -10% 0px",
        threshold: options?.threshold ?? 0.2,
      },
    );

    observer.observe(node);

    return () => {
      if (revealTimerId !== undefined) {
        window.clearTimeout(revealTimerId);
      }

      observer.disconnect();
    };
  }, [
    preloaderComplete,
    options?.observerDisabled,
    options?.once,
    options?.rootMargin,
    options?.threshold,
    options?.revealDelayMs,
    ref,
  ]);

  return visible;
}
