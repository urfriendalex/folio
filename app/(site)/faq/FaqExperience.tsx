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
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const disclosures = Array.from(root.querySelectorAll<HTMLDetailsElement>("[data-faq-disclosure]"));
    const transitions = new Map<HTMLDetailsElement, { height: Animation; opacity: Animation; open: boolean }>();
    // Preserve native exclusive behavior without JS; manage it here so closing can animate too.
    disclosures.forEach((detail) => detail.removeAttribute("name"));
    const change = (detail: HTMLDetailsElement, open: boolean, instant: boolean) => {
      const summary = detail.querySelector("summary");
      const answer = detail.querySelector<HTMLElement>("[data-faq-answer]");
      if (!summary || !answer) return;
      const start = detail.getBoundingClientRect().height;
      const alpha = getComputedStyle(answer).opacity;
      const previous = transitions.get(detail);
      previous?.height.cancel();
      previous?.opacity.cancel();
      transitions.delete(detail);
      detail.dataset.faqExpanded = String(open);
      if (instant) {
        detail.open = open;
        detail.style.removeProperty("height");
        detail.style.removeProperty("overflow");
        return;
      }
      const wasOpen = detail.open;
      detail.open = true;
      detail.style.removeProperty("height");
      const end = open ? detail.getBoundingClientRect().height : summary.getBoundingClientRect().height;
      detail.style.height = `${end}px`;
      detail.style.overflow = "hidden";
      const height = detail.animate([{ height: `${start}px` }, { height: `${end}px` }], {
        duration: 240, easing: "cubic-bezier(0.23, 1, 0.32, 1)",
      });
      const opacity = answer.animate([{ opacity: wasOpen ? alpha : 0 }, { opacity: open ? 1 : 0 }], {
        duration: open ? 200 : 140, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards",
      });
      transitions.set(detail, { height, opacity, open });
      height.onfinish = () => {
        if (transitions.get(detail)?.height !== height) return;
        detail.open = open;
        detail.style.removeProperty("height");
        detail.style.removeProperty("overflow");
        opacity.cancel();
        transitions.delete(detail);
      };
    };
    const click = (event: MouseEvent) => {
      const summary = (event.target as Element).closest("summary");
      const detail = summary?.parentElement as HTMLDetailsElement | null;
      if (!detail || !disclosures.includes(detail)) return;
      event.preventDefault();
      const open = !(transitions.get(detail)?.open ?? detail.open);
      const instant = event.detail === 0 || reduced.matches;
      if (open) disclosures.forEach((other) => {
        if (other !== detail && (other.open || transitions.has(other))) change(other, false, instant);
      });
      change(detail, open, instant);
    };
    const finishMotion = () => {
      if (reduced.matches) disclosures.forEach((detail) => change(detail, transitions.get(detail)?.open ?? detail.open, true));
    };
    root.addEventListener("click", click);
    reduced.addEventListener("change", finishMotion);
    return () => {
      root.removeEventListener("click", click);
      reduced.removeEventListener("change", finishMotion);
      transitions.forEach(({ height, opacity }) => { height.cancel(); opacity.cancel(); });
      disclosures.forEach((detail) => {
        detail.style.removeProperty("height");
        detail.style.removeProperty("overflow");
        detail.setAttribute("name", "faq");
      });
    };
  }, []);

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
      context.font = "11px monospace";
      context.fillStyle = ink;
      for (const cell of cells) {
        // Leave the reading column quiet, including when an answer expands.
        if (cell.x > contentBox.left && cell.x < contentBox.right && cell.y > contentBox.top && cell.y < contentBox.bottom) continue;
        const distance = Math.hypot(cell.x - pointer.x, cell.y - pointer.y);
        const hover = Math.max(0, 1 - distance / 165);
        context.globalAlpha = cell.alpha + hover * 0.5;
        context.fillText(hover > 0.7 ? "#" : hover > 0.35 ? "+" : cell.glyph, cell.x, cell.y);
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
      if (content) contentBox = { left: content.left - box.left - 12, right: content.right - box.left + 12, top: content.top - box.top - 16, bottom: content.bottom - box.top + 16 };
      // A bounded grid with ~35% visible glyphs and no continuous idle animation.
      const step = Math.max(28, Math.sqrt(width * height / 2200));
      cells = [];
      for (let row = 0; row * step < height; row++) {
        for (let column = 0; column * step < width; column++) {
          const seed = hash(column, row);
          if (seed < 0.65) continue;
          cells.push({ x: column * step + step * 0.4, y: row * step + step * 0.6, glyph: seed > 0.93 ? "+" : seed > 0.85 ? ":" : seed > 0.75 ? "·" : ".", alpha: 0.2 + (seed - 0.65) * 0.35 });
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
