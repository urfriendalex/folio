"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePreloaderComplete } from "@/lib/preloaderComplete";
import { useRevealMotionEnabled } from "@/lib/revealPolicy";
import styles from "./page.module.scss";

/** Entry motion is decorative; native details interactions stay immediate. */
export function FaqExperience({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const complete = usePreloaderComplete();
  const motionEnabled = useRevealMotionEnabled();

  useEffect(() => {
    if (!complete || !motionEnabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = rootRef.current;
    if (!root) return;
    const animations: Animation[] = [];
    root.querySelectorAll<HTMLElement>("[data-faq-reveal]").forEach((element, index) => {
      animations.push(element.animate(
        [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 280, delay: index * 45, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "backwards" },
      ));
    });
    root.querySelectorAll<HTMLElement>("[data-faq-rule]").forEach((element, index) => {
      animations.push(element.animate(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        { duration: 360, delay: 45 + index * 50, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "backwards" },
      ));
    });
    return () => animations.forEach((animation) => animation.cancel());
  }, [complete, motionEnabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !root || !context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 };
    let width = 0;
    let height = 0;
    let ink = "";
    let frame = 0;
    let lastFrame = 0;
    let cells: { x: number; y: number; glyph: string; alpha: number }[] = [];
    let contentBox = { left: 0, right: 0, top: 0, bottom: 0 };
    const hash = (column: number, row: number) => {
      const value = Math.sin(column * 127.1 + row * 311.7) * 43758.5453;
      return value - Math.floor(value);
    };
    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.font = "10px monospace";
      context.fillStyle = ink;
      for (const cell of cells) {
        // Leave the reading column quiet, including when an answer expands.
        if (cell.x > contentBox.left && cell.x < contentBox.right && cell.y > contentBox.top && cell.y < contentBox.bottom) continue;
        const distance = Math.hypot(cell.x - pointer.x, cell.y - pointer.y);
        const hover = Math.max(0, 1 - distance / 115);
        context.globalAlpha = cell.alpha + hover * 0.22;
        context.fillText(hover > 0.55 ? "+" : cell.glyph, cell.x, cell.y);
      }
      context.globalAlpha = 1;
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; };
    const tick = (now: number) => {
      if (now - lastFrame < 32) { frame = requestAnimationFrame(tick); return; }
      lastFrame = now;
      pointer.x += (pointer.targetX - pointer.x) * 0.3;
      pointer.y += (pointer.targetY - pointer.y) * 0.3;
      draw();
      if (Math.abs(pointer.x - pointer.targetX) + Math.abs(pointer.y - pointer.targetY) > 0.5) frame = requestAnimationFrame(tick);
      else frame = 0;
    };
    const refresh = () => {
      const box = root.getBoundingClientRect();
      width = box.width;
      height = box.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      ink = getComputedStyle(root).getPropertyValue("--fg-color").trim();
      const content = root.querySelector<HTMLElement>("[data-faq-content]")?.getBoundingClientRect();
      if (content) contentBox = { left: content.left - box.left - 28, right: content.right - box.left + 28, top: content.top - box.top - 16, bottom: content.bottom - box.top + 16 };
      // At most 2,200 candidate cells; only ~10% become visible glyphs.
      const step = Math.max(28, Math.sqrt(width * height / 2200));
      cells = [];
      for (let row = 0; row * step < height; row++) {
        for (let column = 0; column * step < width; column++) {
          const seed = hash(column, row);
          if (seed < 0.9) continue;
          cells.push({ x: column * step + step * 0.4, y: row * step + step * 0.6, glyph: seed > 0.97 ? ":" : ".", alpha: 0.12 + (seed - 0.9) * 0.7 });
        }
      }
      draw();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch" || document.hidden) return;
      const box = root.getBoundingClientRect();
      pointer.targetX = event.clientX - box.left;
      pointer.targetY = event.clientY - box.top;
      if (reduced.matches) { pointer.x = pointer.targetX; pointer.y = pointer.targetY; draw(); }
      else if (!frame) frame = requestAnimationFrame(tick);
    };
    const reset = () => {
      stop();
      pointer.x = pointer.targetX = -1000;
      pointer.y = pointer.targetY = -1000;
      draw();
    };
    const observer = new ResizeObserver(refresh);
    observer.observe(root);
    const content = root.querySelector<HTMLElement>("[data-faq-content]");
    if (content) observer.observe(content);
    const theme = new MutationObserver(refresh);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", reset);
    document.addEventListener("visibilitychange", reset);
    reduced.addEventListener("change", reset);
    refresh();
    return () => {
      stop();
      observer.disconnect();
      theme.disconnect();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", reset);
      document.removeEventListener("visibilitychange", reset);
      reduced.removeEventListener("change", reset);
    };
  }, []);

  return <div ref={rootRef} className={styles.page}><canvas ref={canvasRef} className={styles.field} data-faq-field aria-hidden="true" />{children}</div>;
}
