"use client";

import { useEffect, useState, type RefObject } from "react";
import { usePreloaderComplete } from "@/lib/preloaderComplete";
import { useWorkCtaRevealAligned } from "@/lib/heroRevealTimeline";

export type UseWorkRevealOnViewOptions = {
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
  revealDelayMs?: number;
  /** Skip observers (e.g. when paired hook handles observation). */
  observerDisabled?: boolean;
};

/** Work-aligned reveals: intersection + preloader + hero CTA stagger (+ optional delay). */
export function useWorkRevealOnView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options?: UseWorkRevealOnViewOptions,
) {
  const preloaderComplete = usePreloaderComplete();
  const ctaAligned = useWorkCtaRevealAligned();

  const [visible, setVisible] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const [hasIntersected, setHasIntersected] = useState(false);

  const observerDisabled = options?.observerDisabled === true;

  useEffect(() => {
    if (observerDisabled) {
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

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        setHasIntersected(true);

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

    return () => {
      observer.disconnect();
    };
  }, [
    preloaderComplete,
    observerDisabled,
    options?.once,
    options?.rootMargin,
    options?.threshold,
    ref,
  ]);

  useEffect(() => {
    if (observerDisabled) {
      return undefined;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      return undefined;
    }

    if (!hasIntersected || !preloaderComplete) {
      return undefined;
    }

    if (!ctaAligned) {
      return undefined;
    }

    let revealTimerId: number | undefined;

    const commit = () => {
      revealTimerId = undefined;
      setVisible(true);
    };

    const delayMs = options?.revealDelayMs ?? 0;

    if (delayMs <= 0) {
      commit();
      return undefined;
    }

    revealTimerId = window.setTimeout(commit, delayMs);

    return () => {
      if (revealTimerId !== undefined) {
        window.clearTimeout(revealTimerId);
      }
    };
  }, [
    hasIntersected,
    preloaderComplete,
    ctaAligned,
    observerDisabled,
    options?.revealDelayMs,
  ]);

  return visible;
}
