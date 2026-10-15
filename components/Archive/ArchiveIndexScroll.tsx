"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ArchiveIndexScroll({ children, className }: { children: ReactNode; className: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const updateEdges = () => {
      const remaining = element.scrollHeight - element.clientHeight - element.scrollTop;
      element.dataset.scrollAbove = String(element.scrollTop > 1);
      element.dataset.scrollBelow = String(remaining > 1);
    };

    const observer = new ResizeObserver(updateEdges);
    observer.observe(element);
    if (element.lastElementChild) observer.observe(element.lastElementChild);
    // The native disclosure changes size without a window resize.
    const disclosure = element.closest("details");
    disclosure?.addEventListener("toggle", updateEdges);
    element.addEventListener("scroll", updateEdges, { passive: true });
    updateEdges();

    return () => {
      observer.disconnect();
      disclosure?.removeEventListener("toggle", updateEdges);
      element.removeEventListener("scroll", updateEdges);
    };
  }, []);

  return <div ref={scrollRef} className={className} data-lenis-prevent>{children}</div>;
}
