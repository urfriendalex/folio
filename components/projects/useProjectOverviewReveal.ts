"use client";

import { useLayoutEffect, useRef } from "react";
import { projectRevealDelays } from "@/lib/projectRevealDelays";

export function useProjectOverviewReveal(visible: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const measure = () => {
      if (!root.getClientRects().length) return;
      const tokens = Array.from(root.querySelectorAll<HTMLElement>(
        '[data-mode="lines"] > span > span, [data-project-reveal]',
      ));
      // Measure the masks, whose positions remain stable while the text moves.
      const points = tokens.map((token) => {
        const box = (token.matches("[data-project-reveal]") ? token : token.parentElement!).getBoundingClientRect();
        const scroll = token.closest<HTMLElement>("[data-project-reveal-scroll]");
        return { x: box.left, y: box.top + (scroll?.scrollTop ?? 0) };
      });
      const desktop = window.matchMedia("(min-width: 60rem)").matches;
      const delays = projectRevealDelays(points, desktop);
      const step = parseFloat(getComputedStyle(root).getPropertyValue("--project-overlay-step")) || 10;
      tokens.forEach((token, index) => {
        token.style.setProperty("--project-reveal-delay", `${delays[index]}ms`);
        if (!token.matches("[data-project-reveal]")) {
          const offset = delays[index] / step;
          // Feed the shared line mask rather than competing with its CSS selectors.
          token.style.setProperty("--token-index", String(offset));
          token.style.setProperty("--reveal-total", String(offset + 1));
        }
      });
      root.dataset.revealOrder = desktop ? "diagonal" : "vertical";
    };
    measure();
    // Wrapping changes after fonts load or the viewport crosses a breakpoint.
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    const mutation = new MutationObserver(measure);
    mutation.observe(root, { childList: true, subtree: true });
    return () => { resize.disconnect(); mutation.disconnect(); };
  }, [visible]);
  return ref;
}
