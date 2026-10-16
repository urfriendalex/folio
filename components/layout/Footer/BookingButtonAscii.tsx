"use client";

import { useEffect, useRef } from "react";
import { cellRevealHash01 } from "@/components/Preloader/ascii";
import { GLYPH_GLITCH_STEPS, GLYPH_GLITCH_THRESHOLD_MAX, isGlyphShown } from "@/lib/glyphGlitch";
import { hapticTick } from "@/lib/haptics";
import { KEYBOARD_FOCUS_SELECTOR } from "@/lib/inputModality";

// Light end of the hero ramp; denser glyphs only appear under heat or a press.
const RAMP = " .`,:;-~=+*xoa#%&@";
const FONT_SIZE = 9;
const LINE_HEIGHT = 1.12;
// Cells inside the label box stay clear; density returns over this many px.
const CLEARING_FALLOFF = 22;
const PRESS_LIFE = 0.7;
// Directional mode: streaks thrown off the pointer, carrying on the way it moved after it stops.
const STREAK_LIFE = 0.8;
const STREAK_MAX = 16;
const STREAK_MIN_SPEED = 90; // px/s
const STREAK_TOP_SPEED = 520; // px/s
const STREAK_FRICTION = 2.4; // 1/s
const STREAK_CLEARING = 5; // px from the label's glyphs
// Appended after the ramp so a bucket entry can address either: horizontal, falling, vertical, rising.
const STROKES = ["-", "\\", "|", "/"];
const GLYPHS = [...RAMP, ...STROKES];
// Glitch mode: the field and the cell's glyphs come and go in hero-style random-order steps.
const GLITCH_IN_MS = 560;
const GLITCH_OUT_MS = 220;
/** The label is fully in by this share of the field's glitch-in; the texture keeps filling after. */
const GLITCH_LABEL_SHARE = 0.55;
const GLITCH_FIELD_SEED = 97;

type Press = { x: number; y: number; t: number };
type Streak = { x: number; y: number; vx: number; vy: number; t: number };

function strokeIndex(vx: number, vy: number) {
  const a = ((Math.atan2(vy, vx) % Math.PI) + Math.PI) % Math.PI; // screen space, folded to [0, π)
  const slot = a < Math.PI / 8 || a >= (7 * Math.PI) / 8 ? 0 : a < (3 * Math.PI) / 8 ? 1 : a < (5 * Math.PI) / 8 ? 2 : 3;
  return RAMP.length + slot;
}

function hash(column: number, row: number, tick: number) {
  const x = Math.sin(column * 127.1 + row * 311.7 + tick * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Union of the text nodes only: a range over the element would include full-width block wrappers. */
function textBounds(element: Element, range: Range) {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    range.selectNodeContents(node);
    const box = range.getBoundingClientRect();
    if (!box.width || !box.height) continue;
    left = Math.min(left, box.left);
    top = Math.min(top, box.top);
    right = Math.max(right, box.right);
    bottom = Math.max(bottom, box.bottom);
  }
  return left === Infinity ? new DOMRect() : new DOMRect(left, top, right - left, bottom - top);
}

/** Bounds of what the field has to stay clear of. "text" hugs the glyphs, so block-level labels
    (full-width spans) still leave the rest of the cell to the field; hidden children are skipped. */
function clearingBoxes(host: HTMLElement, canvas: HTMLCanvasElement, clearance: "box" | "text") {
  const origin = canvas.getBoundingClientRect();
  const range = clearance === "text" ? document.createRange() : null;
  return Array.from(host.children)
    .filter((child) => child !== canvas && !(child instanceof SVGElement))
    .map((child) => {
      const box = range ? textBounds(child, range) : child.getBoundingClientRect();
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
  directional = false,
  glitch = false,
}: {
  className: string;
  /** Custom property for the hot glyphs near the pointer. */
  accent?: string;
  clearance?: "box" | "text";
  /** While this media query matches (big touch-sized cells), the field stays a light texture:
      thinner ambient, a smaller hot spot, and no heavy glyphs. */
  quietQuery?: string;
  /** Moving across the button throws — | / \ strokes that keep travelling the way the pointer went. */
  directional?: boolean;
  /** Follow the parent's `data-visible`: glitch the field and its `[data-glitch-at]` glyphs in and out.
      The glitch-in waits for the canvas's computed `transition-delay` (the cell's slot in the cascade). */
  glitch?: boolean;
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
    let glitchAt = new Float32Array(0);
    let shown = glitch ? 0 : 1;
    let shownTarget = shown;
    let glitchStartsAt = 0;
    let fieldVisibility = shown;
    const glyphs = glitch
      ? Array.from(button.querySelectorAll<HTMLElement>("[data-glitch-at]"), (element) => ({
          element,
          at: Number(element.dataset.glitchAt),
          phase: Number(element.dataset.glitchPhase),
          on: element.hasAttribute("data-glitch-on"),
        }))
      : [];
    let presses: Press[] = [];
    let streaks: Streak[] = [];
    let lastEmit = 0;
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
          if (fieldVisibility < 1 && !isGlyphShown(fieldVisibility, glitchAt[i], i & 1)) continue;
          value += heat[i] * (0.18 + open * 0.42) * heatGain;

          for (const press of presses) {
            const age = time - press.t;
            const distance = Math.hypot(x - press.x, y - press.y);
            const ring = Math.exp(-(((distance - age * 300) / 14) ** 2));
            value += ring * (1 - age / PRESS_LIFE) * (0.2 + open * 0.5);
          }

          // Each streak is a short capsule trailing behind its head; the strongest one sets the stroke.
          let stroke = 0;
          let strokeX = 0;
          let strokeY = 0;
          for (const streak of streaks) {
            const life = 1 - (time - streak.t) / STREAK_LIFE;
            const tailX = streak.x - streak.vx * 0.09;
            const tailY = streak.y - streak.vy * 0.09;
            const sx = streak.x - tailX;
            const sy = streak.y - tailY;
            const cx = x + cellWidth / 2;
            const cy = y + cellHeight / 2;
            const along = Math.max(0, Math.min(1, ((cx - tailX) * sx + (cy - tailY) * sy) / (sx * sx + sy * sy || 1)));
            const ex = cx - (tailX + sx * along);
            const ey = cy - (tailY + sy * along);
            const s = life * Math.exp(-(ex * ex + ey * ey) / 42);
            if (s > stroke) {
              stroke = s;
              strokeX = streak.vx;
              strokeY = streak.vy;
            }
          }
          // Strokes only keep off the glyphs themselves, not the wide ambient clearing: thin rows are all clearing.
          if (stroke > 0) stroke *= Math.min(1, (open ** (1 / 1.4) * CLEARING_FALLOFF) / STREAK_CLEARING) * (quiet ? 0.7 : 1);
          // The hot spot stays the same blob as the footer's button; strokes only show where it has cooled.
          if (stroke > 0.18 && heat[i] < 0.3) {
            buckets[stroke > 0.5 && !quiet ? 2 : 1].push(strokeIndex(strokeX, strokeY), x, y);
            continue;
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
          context.fillText(GLYPHS[bucket[j]], bucket[j + 1], bucket[j + 2]);
        }
      });
      context.globalAlpha = 1;
    };

    const tick = (now: number) => {
      const delta = lastTime ? Math.min(now - lastTime, 40) : 16;
      lastTime = now;
      time += delta / 1000;
      const ease = 1 - Math.exp(-delta / 70);
      const previousX = pointerX;
      const previousY = pointerY;
      pointerX += (targetX - pointerX) * ease;
      pointerY += (targetY - pointerY) * ease;
      hover += (hoverTarget - hover) * ease;
      if (shown !== shownTarget && now >= glitchStartsAt) {
        const step = delta / (shownTarget ? GLITCH_IN_MS : GLITCH_OUT_MS);
        shown = shownTarget ? Math.min(1, shown + step) : Math.max(0, shown - step);
        applyGlitch();
      }

      if (directional) {
        const seconds = delta / 1000;
        const friction = Math.exp(-seconds * STREAK_FRICTION);
        streaks = streaks.filter((streak) => time - streak.t < STREAK_LIFE);
        for (const streak of streaks) {
          streak.x += streak.vx * seconds;
          streak.y += streak.vy * seconds;
          streak.vx *= friction;
          streak.vy *= friction;
        }
        const vx = (pointerX - previousX) / seconds;
        const vy = (pointerY - previousY) / seconds;
        const speed = Math.hypot(vx, vy);
        if (hoverTarget && speed > STREAK_MIN_SPEED && time - lastEmit > 0.05 && streaks.length < STREAK_MAX) {
          // Thrown ahead of the pointer, faster than it, so the stroke runs on after the hand stops.
          const scale = Math.min(STREAK_TOP_SPEED, speed * 1.6) / speed;
          streaks.push({ x: pointerX, y: pointerY, vx: vx * scale, vy: vy * scale, t: time });
          lastEmit = time;
        }
      }
      draw(1 - Math.exp(-delta / 110));
      frame = window.requestAnimationFrame(tick);
    };

    /** One clock for the cell: the label lands first, the texture keeps filling in behind it. */
    function applyGlitch() {
      const stepped = Math.round(shown * GLYPH_GLITCH_STEPS) / GLYPH_GLITCH_STEPS;
      fieldVisibility = stepped;
      const label = shownTarget ? Math.min(1, stepped / GLITCH_LABEL_SHARE) : stepped;
      const labelStepped = Math.round(label * GLYPH_GLITCH_STEPS) / GLYPH_GLITCH_STEPS;
      for (const glyph of glyphs) {
        const on = isGlyphShown(labelStepped, glyph.at, glyph.phase);
        if (on === glyph.on) continue;
        glyph.on = on;
        glyph.element.toggleAttribute("data-glitch-on", on);
      }
    }

    const syncGlitch = () => {
      const next = button.dataset.visible === "false" ? 0 : 1;
      if (next === shownTarget) return;
      shownTarget = next;
      const delay = next ? parseFloat(window.getComputedStyle(canvas).transitionDelay) * 1000 || 0 : 0;
      glitchStartsAt = performance.now() + delay;
      if (reducedMotion.matches) {
        shown = next;
        applyGlitch();
        draw(1);
      }
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
      glitchAt = new Float32Array(columns * rows);
      for (let i = 0; i < glitchAt.length; i++) {
        glitchAt[i] = cellRevealHash01(i, GLITCH_FIELD_SEED) * GLYPH_GLITCH_THRESHOLD_MAX;
      }
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

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;
      // Entering would otherwise glide from wherever the pointer last was and throw a false streak.
      if (directional && !hoverTarget) {
        pointerX = targetX;
        pointerY = targetY;
      }
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
        shown = shownTarget;
        applyGlitch();
        time = 0;
        presses = [];
        streaks = [];
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
    const glitchObserver = new MutationObserver(syncGlitch);
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
    resize();
    if (glitch) {
      glitchObserver.observe(button, { attributes: true, attributeFilter: ["data-visible"] });
      syncGlitch();
    }
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
      glitchObserver.disconnect();
    };
  }, [accent, clearance, quietQuery, directional, glitch]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
