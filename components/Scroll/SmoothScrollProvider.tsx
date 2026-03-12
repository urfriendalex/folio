"use client";

import Lenis from "lenis";
import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type SmoothScrollProviderProps = {
  children: ReactNode;
};

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const pathname = usePathname();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      return undefined;
    }

    const scopedWindow = window as Window & { __lenis?: Lenis };
    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      syncTouch: false,
    });

    scopedWindow.__lenis = lenis;

    let frameId = 0;

    const frame = (time: number) => {
      lenis.raf(time);
      frameId = window.requestAnimationFrame(frame);
    };

    frameId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(frameId);
      lenis.destroy();
      delete scopedWindow.__lenis;
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return children;
}
