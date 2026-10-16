"use client";

import { useEffect, useRef } from "react";
import { hapticTick } from "@/lib/haptics";

/**
 * Action-cell hover — directional, in the flow field's glyph language. Entering sends a band of glyphs
 * across the cell from the entry edge, oriented along the travel (— / = sideways, ¦ / | vertically); it
 * leaves a sparse, faint texture of the same strokes that keeps proceeding in the entry direction while
 * hovered, with a softer band re-crossing the cell every so often. Leaving sweeps that texture out toward
 * the exit edge. The resting texture is ink, dark enough to read as marks rather than a grey wash,
 * and sparse enough that the label stays the louder colour. The moving band keeps the cell colour.
 * Touch: grows radially from exactly where the thumb lands (strokes point outward), pulses outward while
 * held, drains outward on release, with a haptic tick on press. Idle = no rAF.
 */

type Edge = "left" | "right" | "top" | "bottom";

const CELL_W = 7;
const CELL_H = 12;
const FONT_SIZE = 10;
const BAND = 0.22; // leading band width, fraction of the travel
const ENTER_MS = 360;
const EXIT_MS = 260;
const TEXTURE_DENSITY = 0.18;
const TEXTURE_ALPHA = 0.5;
const BAND_ALPHA = 0.55;
/** Hovered: texture drift along the entry direction, plus a softer band re-crossing on a loop. */
const DRIFT_PX_PER_S = 30;
const PULSE_PERIOD_MS = 1400;
const PULSE_TRAVEL_MS = 620;
const PULSE_ALPHA = 0.36;

const OPPOSITE: Record<Edge, Edge> = { left: "right", right: "left", top: "bottom", bottom: "top" };
/** Unit travel direction for a wipe entering from that edge. */
const TRAVEL: Record<Edge, { x: number; y: number }> = {
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  top: { x: 0, y: 1 },
  bottom: { x: 0, y: -1 },
};

function nearestEdge(x: number, y: number, width: number, height: number): Edge {
  const distances: [Edge, number][] = [
    ["left", x / width],
    ["right", 1 - x / width],
    ["top", y / height],
    ["bottom", 1 - y / height],
  ];
  return distances.sort((a, b) => a[1] - b[1])[0][0];
}

function seed(column: number, row: number) {
  const s = Math.sin(column * 127.1 + row * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function GlyphWipe({ className, tone = "ink" }: { className?: string; tone?: "ink" | "signal" }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !host || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let frame = 0;
    let origin: Edge = "left";
    /** Touch press point (radial mode); null = edge mode (pointer hover). */
    let radial: { x: number; y: number; reach: number } | null = null;
    let filling = true;
    let progress = 0; // 0..1 of the current wipe
    let start = 0;
    let settled = false; // hovered + wipe finished → drifting texture + pulses
    let settledAt = 0;
    /** Entry edge of the current hover; the drift keeps this direction through the drain too. */
    let travel: Edge = "left";
    let hoverStart = 0;
    let color = "#111";
    /** Resting texture. Ink, even on the signal cell: a faint red reads as grey on the light card. */
    let ink = "#111";
    let font = `${FONT_SIZE}px monospace`;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const styles = getComputedStyle(host);
      ink = styles.getPropertyValue("--fg-color").trim() || styles.color;
      color = (tone === "signal" ? styles.getPropertyValue("--signal-color") : ink).trim() || ink;
      font = `${FONT_SIZE}px ${styles.getPropertyValue("--font-mono-stack").trim() || "monospace"}`;
    };

    /** 0 at the origin (edge or press point) → 1 at the far side. */
    const along = (x: number, y: number) =>
      radial
        ? Math.hypot(x - radial.x, y - radial.y) / radial.reach
        : origin === "left"
          ? x / width
          : origin === "right"
            ? 1 - x / width
            : origin === "top"
              ? y / height
              : 1 - y / height;

    const horizontal = () => origin === "left" || origin === "right";

    /** Radial mode: stroke points away from the press point. */
    const radialGlyph = (x: number, y: number, heavyStroke: boolean) => {
      const angle = Math.atan2(y - (radial?.y ?? 0), x - (radial?.x ?? 0));
      const a = ((angle % Math.PI) + Math.PI) % Math.PI;
      if (a < Math.PI / 8 || a >= (7 * Math.PI) / 8) return heavyStroke ? "=" : "-";
      if (a < (3 * Math.PI) / 8) return "\\";
      if (a < (5 * Math.PI) / 8) return heavyStroke ? "|" : "¦";
      return "/";
    };

    const draw = (now = performance.now()) => {
      context.clearRect(0, 0, width, height);
      if (filling && progress <= 0 && !settled) return;
      context.font = font;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = color;
      const light = horizontal() ? "-" : "¦";
      const heavy = horizontal() ? "=" : "|";
      const front = progress * (1 + BAND);
      const animated = !reducedMotion.matches;

      // Texture lives in its own grid that slides along the travel direction; seeds follow the grid.
      const drift = animated && !radial ? ((now - hoverStart) / 1000) * DRIFT_PX_PER_S : 0;
      const shiftX = TRAVEL[travel].x * drift;
      const shiftY = TRAVEL[travel].y * drift;
      const offsetC = Math.floor(shiftX / CELL_W);
      const offsetR = Math.floor(shiftY / CELL_H);
      const fracX = shiftX - offsetC * CELL_W;
      const fracY = shiftY - offsetR * CELL_H;
      const pulse = settled && animated ? ((now - settledAt) % PULSE_PERIOD_MS) / PULSE_TRAVEL_MS : 1;
      const pulseFront = pulse * (1 + BAND);

      for (let r = -1; r * CELL_H < height; r += 1) {
        for (let c = -1; c * CELL_W < width; c += 1) {
          const x = c * CELL_W + CELL_W / 2 + fracX;
          const y = r * CELL_H + CELL_H / 2 + fracY;
          const t = along(x, y);
          const s = seed(c - offsetC, r - offsetR);
          // Distance behind the moving front (filling) / ahead of the clearing front (draining).
          const behind = filling ? front - t : t - front + BAND;
          let alpha = 0;
          let glyph = light;
          if (settled) {
            const behindPulse = pulseFront - t;
            if (pulse < 1 && behindPulse >= 0 && behindPulse < BAND) {
              const k = 1 - behindPulse / BAND;
              if (s < 0.3 + 0.4 * k) {
                alpha = PULSE_ALPHA * (0.35 + 0.65 * k);
                glyph = k > 0.6 ? heavy : light;
              }
            } else if (s < TEXTURE_DENSITY) alpha = TEXTURE_ALPHA;
          } else if (behind >= 0 && behind < BAND) {
            // Leading band: heavier and denser toward the front edge.
            const k = 1 - behind / BAND;
            if (s < 0.45 + 0.5 * k) {
              alpha = BAND_ALPHA * (0.35 + 0.65 * k);
              glyph = k > 0.55 ? heavy : light;
            }
          } else if ((filling && behind >= BAND) || (!filling && behind >= BAND)) {
            if (s < TEXTURE_DENSITY) alpha = TEXTURE_ALPHA;
          }
          if (alpha <= 0) continue;
          if (radial) glyph = radialGlyph(x, y, glyph === heavy);
          // Settled marks are ink. Only the traveling band uses the cell colour, so a red label
          // isn't sitting in a pale-red field.
          const inBand = !settled ? behind >= 0 && behind < BAND : pulse < 1 && pulseFront - t >= 0 && pulseFront - t < BAND;
          context.fillStyle = inBand ? color : ink;
          context.globalAlpha = alpha;
          context.fillText(glyph, x, y);
        }
      }
      context.globalAlpha = 1;
    };

    const tick = (now: number) => {
      const linear = Math.min(1, (now - start) / (filling ? ENTER_MS : EXIT_MS));
      progress = 1 - (1 - linear) ** 3; // ease-out
      if (linear >= 1) {
        if (!filling) {
          context.clearRect(0, 0, width, height);
          frame = 0;
          return;
        }
        if (!settled) {
          settled = true;
          settledAt = now;
        }
      }
      draw(now);
      // Keeps running while hovered/held so the texture can proceed; leaving drains and stops.
      frame = window.requestAnimationFrame(tick);
    };

    const run = (nextOrigin: Edge, nextFilling: boolean, point: { x: number; y: number } | null = null) => {
      resize();
      radial = point
        ? {
            ...point,
            reach: Math.max(
              Math.hypot(point.x, point.y),
              Math.hypot(width - point.x, point.y),
              Math.hypot(point.x, height - point.y),
              Math.hypot(width - point.x, height - point.y),
            ),
          }
        : null;
      origin = nextOrigin;
      if (nextFilling) {
        travel = nextOrigin;
        hoverStart = performance.now();
      }
      filling = nextFilling;
      settled = false;
      if (reducedMotion.matches) {
        settled = nextFilling;
        progress = nextFilling ? 1 : 0;
        if (nextFilling) draw();
        else context.clearRect(0, 0, width, height);
        return;
      }
      progress = 0;
      start = performance.now();
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(tick);
    };

    const edgeOf = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      return nearestEdge(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
    };

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType !== "touch") run(edgeOf(event), true);
    };
    /** Drain toward the exit edge: the clearing front starts from the opposite side. */
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType !== "touch") run(OPPOSITE[edgeOf(event)], false);
    };
    const pressPoint = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    let lastPress: { x: number; y: number } | null = null;
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      lastPress = pressPoint(event);
      hapticTick();
      run(origin, true, lastPress);
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      run(origin, false, lastPress ?? pressPoint(event));
    };

    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", onDown, { passive: true });
    host.addEventListener("pointerup", onUp, { passive: true });
    host.addEventListener("pointercancel", onUp, { passive: true });
    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw();
    });
    resizeObserver.observe(canvas);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
    };
  }, [tone]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
