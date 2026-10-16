"use client";

import { useEffect, useRef } from "react";
import { hapticTick } from "@/lib/haptics";
import { KEYBOARD_FOCUS_SELECTOR } from "@/lib/inputModality";

// Light end of the hero ramp; denser glyphs only appear under heat or a press.
const RAMP = " .`,:;-~=+*xoa#%&@";
const FONT_SIZE = 9;
const LINE_HEIGHT = 1.12;
// Cells inside the label box stay clear; density returns over this many px.
const CLEARING_FALLOFF = 22;
const PRESS_LIFE = 0.7;

type Press = { x: number; y: number; t: number };

function hash(column: number, row: number, tick: number) {
  const x = Math.sin(column * 127.1 + row * 311.7 + tick * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Bounds of what the field has to stay clear of. "text" hugs the glyphs, so block-level labels
    (full-width spans) still leave the rest of the cell to the field; hidden children are skipped. */
function clearingBoxes(host: HTMLElement, canvas: HTMLCanvasElement, clearance: "box" | "text") {
  const origin = canvas.getBoundingClientRect();
  const range = clearance === "text" ? document.createRange() : null;
  return Array.from(host.children)
    .filter((child) => child !== canvas && !(child instanceof SVGElement))
    .map((child) => {
      if (range) range.selectNodeContents(child);
      const box = range ? range.getBoundingClientRect() : child.getBoundingClientRect();
      return {
        left: box.left - origin.left,
        right: box.right - origin.left,
        top: box.top - origin.top,
        bottom: box.bottom - origin.top,
        empty: box.width === 0 || box.height === 0,
      };
    })
    .filter((box) => !box.empty);
}

export function BookingButtonAscii({
  className,
  accent = "--taskbar-flag-blue",
  clearance = "box",
  quietQuery,
}: {
  className: string;
  /** Custom property for the hot glyphs near the pointer. */
  accent?: string;
  clearance?: "box" | "text";
  /** While this media query matches (big touch-sized cells), the field stays a light texture:
      thinner ambient, a smaller hot spot, and no heavy glyphs. */
  quietQuery?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const button = canvas?.parentElement;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !button || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const quietMedia = quietQuery ? window.matchMedia(quietQuery) : null;
    let width = 0;
    let height = 0;
    let columns = 0;
    let rows = 0;
    let cellWidth = 0;
    let cellHeight = 0;
    let originX = 0;
    let originY = 0;
    let room = new Float32Array(0);
    let heat = new Float32Array(0);
    let presses: Press[] = [];
    let frame = 0;
    let visible = false;
    let lastTime = 0;
    let time = 0;
    let hover = 0;
    let hoverTarget = 0;
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;
    let ink = "#222";
    let blue = "#2446d6";
    let font = `400 ${FONT_SIZE}px monospace`;
    const buckets: number[][] = [[], [], []]; // faint, ink, blue
    const top = RAMP.length - 1;

    const draw = (ease: number) => {
      context.clearRect(0, 0, width, height);
      context.font = font;
      context.textBaseline = "top";
      presses = presses.filter((press) => time - press.t < PRESS_LIFE);
      const tick = Math.floor(time * 5);
      for (const bucket of buckets) bucket.length = 0;
      const quiet = quietMedia?.matches ?? false;
      const ambientGain = quiet ? 0.6 : 1;
      const heatGain = quiet ? 0.5 : 1;
      const heatSpread = quiet ? 1100 : 2600;
      // Quiet tops out at "+": no x/o/a/#/% blobs on a card the size of a thumb.
      const ceiling = quiet ? RAMP.indexOf("+") : top;

      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const i = row * columns + column;
          const x = originX + column * cellWidth;
          const y = originY + row * cellHeight;
          const open = room[i];

          // Slow diagonal swell plus a cross wave, like the lab's density wave.
          const wave =
            0.5 +
            0.32 * Math.sin(time * 1.1 + column * 0.11 - row * 0.62) +
            0.18 * Math.sin(time * 0.7 - column * 0.05 + row * 0.9);
          let value = open * (0.1 + wave * 0.24) * ambientGain;
          if (open > 0.5 && hash(column, row, tick) > (quiet ? 0.996 : 0.988)) value += 0.16;

          const dx = x + cellWidth / 2 - pointerX;
          const dy = y + cellHeight / 2 - pointerY;
          const target = hover * Math.exp(-(dx * dx + dy * dy) / heatSpread);
          heat[i] += (target - heat[i]) * ease;
          value += heat[i] * (0.18 + open * 0.42) * heatGain;

          for (const press of presses) {
            const age = time - press.t;
            const distance = Math.hypot(x - press.x, y - press.y);
            const ring = Math.exp(-(((distance - age * 300) / 14) ** 2));
            value += ring * (1 - age / PRESS_LIFE) * (0.2 + open * 0.5);
          }

          const index = Math.max(0, Math.min(ceiling, Math.round(value * top)));
          if (!index) continue;
          const bucket = heat[i] > 0.32 && index > 3 ? 2 : index > 5 ? 1 : 0;
          buckets[bucket].push(index, x, y);
        }
      }

      const fills = [ink, ink, blue];
      const alphas = [0.26, 0.42, 0.85];
      buckets.forEach((bucket, b) => {
        if (!bucket.length) return;
        context.fillStyle = fills[b];
        context.globalAlpha = alphas[b];
        for (let j = 0; j < bucket.length; j += 3) {
          context.fillText(RAMP[bucket[j]], bucket[j + 1], bucket[j + 2]);
        }
      });
      context.globalAlpha = 1;
    };

    const tick = (now: number) => {
      const delta = lastTime ? Math.min(now - lastTime, 40) : 16;
      lastTime = now;
      time += delta / 1000;
      const ease = 1 - Math.exp(-delta / 70);
      pointerX += (targetX - pointerX) * ease;
      pointerY += (targetY - pointerY) * ease;
      hover += (hoverTarget - hover) * ease;
      draw(1 - Math.exp(-delta / 110));
      frame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame || !visible || reducedMotion.matches || document.hidden) return;
      lastTime = 0;
      frame = window.requestAnimationFrame(tick);
    };

    const stop = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    };

    const updateColors = () => {
      const styles = window.getComputedStyle(button);
      ink = styles.getPropertyValue("--fg-color").trim() || styles.color;
      blue = styles.getPropertyValue(accent).trim() || "#2446d6";
      const family = styles.getPropertyValue("--font-mono-stack").trim() || "monospace";
      font = `400 ${FONT_SIZE}px ${family}`;
      draw(1);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (!width || !height) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      updateColors();

      context.font = font;
      cellWidth = context.measureText("M").width || FONT_SIZE * 0.6;
      cellHeight = FONT_SIZE * LINE_HEIGHT;
      columns = Math.floor(width / cellWidth);
      rows = Math.floor(height / cellHeight);
      originX = (width - columns * cellWidth) / 2;
      originY = (height - rows * cellHeight) / 2;
      room = new Float32Array(columns * rows);
      heat = new Float32Array(columns * rows);
      measureClearing();

      if (!hoverTarget) {
        pointerX = targetX = width / 2;
        pointerY = targetY = height / 2;
      }
      draw(1);
    };

    /** Clearing around the label and meta so the field never sits under text. */
    const measureClearing = () => {
      if (!columns || !rows) return;
      const labels = clearingBoxes(button, canvas, clearance);
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const cx = originX + (column + 0.5) * cellWidth;
          const cy = originY + (row + 0.5) * cellHeight;
          let nearest = Infinity;
          for (const box of labels) {
            const dx = Math.max(box.left - cx, 0, cx - box.right);
            const dy = Math.max(box.top - cy, 0, cy - box.bottom);
            nearest = Math.min(nearest, Math.hypot(dx, dy));
          }
          room[row * columns + column] = Math.min(1, nearest / CLEARING_FALLOFF) ** 1.4;
        }
      }
    };

    /** Labels that slide in (line-mask reveals) end somewhere else than where they were measured. */
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === button || event.propertyName !== "transform") return;
      measureClearing();
      if (reducedMotion.matches) draw(1);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;
      hoverTarget = 1;
      if (reducedMotion.matches) {
        pointerX = targetX;
        pointerY = targetY;
        hover = 1;
        draw(1);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") hapticTick();
      if (reducedMotion.matches) return;
      const rect = canvas.getBoundingClientRect();
      presses.push({ x: event.clientX - rect.left, y: event.clientY - rect.top, t: time });
    };

    const onPointerLeave = () => {
      hoverTarget = button.matches(KEYBOARD_FOCUS_SELECTOR) ? 1 : 0;
      if (reducedMotion.matches) {
        hover = hoverTarget;
        draw(1);
      }
    };

    const onFocus = () => {
      targetX = pointerX = width / 2;
      targetY = pointerY = height / 2;
      hoverTarget = 1;
      if (reducedMotion.matches) {
        hover = 1;
        draw(1);
      }
    };

    const onMotionChange = () => {
      if (reducedMotion.matches) {
        stop();
        time = 0;
        presses = [];
        hover = hoverTarget;
        pointerX = targetX;
        pointerY = targetY;
        draw(1);
      } else {
        start();
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    const resizeObserver = new ResizeObserver(resize);
    const themeObserver = new MutationObserver(updateColors);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    let disposed = false;
    resizeObserver.observe(canvas);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    visibilityObserver.observe(button);
    reducedMotion.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    button.addEventListener("pointerenter", onPointerMove);
    button.addEventListener("pointermove", onPointerMove);
    button.addEventListener("pointerdown", onPointerDown);
    button.addEventListener("pointerleave", onPointerLeave);
    button.addEventListener("focus", onFocus);
    button.addEventListener("blur", onPointerLeave);
    button.addEventListener("transitionend", onTransitionEnd);
    resize();
    // Glyph widths and label boxes shift once the web fonts land.
    void document.fonts.ready.then(() => {
      if (!disposed) resize();
    });

    return () => {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      visibilityObserver.disconnect();
      reducedMotion.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      button.removeEventListener("pointerenter", onPointerMove);
      button.removeEventListener("pointermove", onPointerMove);
      button.removeEventListener("pointerdown", onPointerDown);
      button.removeEventListener("pointerleave", onPointerLeave);
      button.removeEventListener("focus", onFocus);
      button.removeEventListener("blur", onPointerLeave);
      button.removeEventListener("transitionend", onTransitionEnd);
    };
  }, [accent, clearance, quietQuery]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
