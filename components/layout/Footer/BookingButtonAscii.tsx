"use client";

import { useEffect, useRef } from "react";
import { KEYBOARD_FOCUS_SELECTOR } from "@/lib/inputModality";

// Light end of the hero ramp; denser glyphs only appear under heat or a press.
const RAMP = " .`,:;-~=+*xoa#%&@";
const FONT_SIZE = 9;
const LINE_HEIGHT = 1.12;
// Cells inside the label box stay clear; density returns over this many px.
const CLEARING_FALLOFF = 22;
const PRESS_LIFE = 0.7;
/** Resume the field this long after the last scroll event; motion under a moving page is imperceptible. */
const SCROLL_IDLE_MS = 160;

type Press = { x: number; y: number; t: number };

function hash(column: number, row: number, tick: number) {
  const x = Math.sin(column * 127.1 + row * 311.7 + tick * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

export function BookingButtonAscii({ className }: { className: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const button = canvas?.parentElement;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !button || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
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
    let scrolling = false;
    let scrollIdleTimer = 0;
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
          let value = open * (0.1 + wave * 0.24);
          if (open > 0.5 && hash(column, row, tick) > 0.988) value += 0.16;

          const dx = x + cellWidth / 2 - pointerX;
          const dy = y + cellHeight / 2 - pointerY;
          const target = hover * Math.exp(-(dx * dx + dy * dy) / 2600);
          heat[i] += (target - heat[i]) * ease;
          value += heat[i] * (0.18 + open * 0.42);

          for (const press of presses) {
            const age = time - press.t;
            const distance = Math.hypot(x - press.x, y - press.y);
            const ring = Math.exp(-(((distance - age * 300) / 14) ** 2));
            value += ring * (1 - age / PRESS_LIFE) * (0.2 + open * 0.5);
          }

          const index = Math.max(0, Math.min(top, Math.round(value * top)));
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
      if (frame || !visible || scrolling || reducedMotion.matches || document.hidden) return;
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
      blue = styles.getPropertyValue("--taskbar-flag-blue").trim() || "#2446d6";
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

      // Clearing around the label and meta so the field never sits under text.
      const labels = Array.from(button.children)
        .filter((child) => child !== canvas)
        .map((child) => {
          const box = child.getBoundingClientRect();
          return { left: box.left - rect.left, right: box.right - rect.left, top: box.top - rect.top, bottom: box.bottom - rect.top };
        });
      room = new Float32Array(columns * rows);
      heat = new Float32Array(columns * rows);
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

      if (!hoverTarget) {
        pointerX = targetX = width / 2;
        pointerY = targetY = height / 2;
      }
      draw(1);
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

    /* Hold the field still while the page scrolls: per-cell fillText must not compete with scroll frames. */
    const onScroll = () => {
      if (!scrolling) {
        scrolling = true;
        stop();
      }
      window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => {
        scrolling = false;
        start();
      }, SCROLL_IDLE_MS);
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
    window.addEventListener("scroll", onScroll, { passive: true });
    button.addEventListener("pointerenter", onPointerMove);
    button.addEventListener("pointermove", onPointerMove);
    button.addEventListener("pointerdown", onPointerDown);
    button.addEventListener("pointerleave", onPointerLeave);
    button.addEventListener("focus", onFocus);
    button.addEventListener("blur", onPointerLeave);
    resize();
    // Glyph widths and label boxes shift once the web fonts land.
    void document.fonts.ready.then(() => {
      if (!disposed) resize();
    });

    return () => {
      disposed = true;
      stop();
      window.clearTimeout(scrollIdleTimer);
      window.removeEventListener("scroll", onScroll);
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
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
