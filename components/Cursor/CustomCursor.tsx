"use client";

import { useEffect, useRef } from "react";

const LINK_SELECTOR = "a, button, [data-cursor-hidden='true']";
const FOLLOW_EASING = 0.16;

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const narrowViewportQuery = window.matchMedia("(max-width: 56rem)");

    if (!finePointerQuery.matches || narrowViewportQuery.matches) {
      return undefined;
    }

    const cursorNode = cursorRef.current;

    if (!cursorNode) {
      return undefined;
    }

    let frameId: number | null = null;
    let shouldAnimate = false;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const current = { ...target };

    const animate = () => {
      current.x += (target.x - current.x) * FOLLOW_EASING;
      current.y += (target.y - current.y) * FOLLOW_EASING;

      cursorNode.style.left = `${current.x}px`;
      cursorNode.style.top = `${current.y}px`;

      const settled =
        Math.abs(target.x - current.x) < 0.1 &&
        Math.abs(target.y - current.y) < 0.1;

      if (!shouldAnimate && settled) {
        frameId = null;
        return;
      }

      frameId = window.requestAnimationFrame(animate);
    };

    const start = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(animate);
    };

    const updateTarget = (event: MouseEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      shouldAnimate = true;
      cursorNode.dataset.visible = "true";
      start();
    };

    const hide = () => {
      shouldAnimate = false;
      cursorNode.dataset.visible = "false";
      cursorNode.dataset.hidden = "false";
    };

    const handleMouseOver = (event: MouseEvent) => {
      const hovered = event.target;

      if (!(hovered instanceof Element)) {
        return;
      }

      if (hovered.closest(LINK_SELECTOR)) {
        cursorNode.dataset.hidden = "true";
      }
    };

    const handleMouseOut = (event: MouseEvent) => {
      const nextTarget = event.relatedTarget;

      if (!(nextTarget instanceof Element) || !nextTarget.closest(LINK_SELECTOR)) {
        cursorNode.dataset.hidden = "false";
      }
    };

    window.addEventListener("mousemove", updateTarget);
    window.addEventListener("blur", hide);
    document.addEventListener("mouseleave", hide);
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      window.removeEventListener("mousemove", updateTarget);
      window.removeEventListener("blur", hide);
      document.removeEventListener("mouseleave", hide);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return <div ref={cursorRef} className="site-cursor" aria-hidden="true" />;
}
