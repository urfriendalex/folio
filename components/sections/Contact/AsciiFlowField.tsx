"use client";

import { useEffect, useRef } from "react";

/**
 * "Flow" field — direction-aware. Each cell stores a motion vector; the pointer (or a finger dragging on
 * touch) writes its velocity into the cells it crosses. Glyphs are chosen by direction (— | / \) and
 * thickened by speed (· → - → = → ≡), so the field draws *which way* you moved, then the vectors decay.
 * Idle = nothing drawn, no rAF. A click's ring is drawn on a viewport layer, so it can travel
 * out of the section; the trace itself stays inside it.
 */
const CELL = 16;
const FONT_SIZE = 12;
/** Per-frame retention at 60fps (~0.45s tail) — a short, quiet trace, not a full-screen wash. */
const DECAY = 0.88;
const BRUSH_RADIUS = 1.1; // cells
const STROKE_GAIN = 0.45;
const RING_LIFE_S = 0.9;
/** Touch "rain": streaks spawned by scroll, travelling with the content; capped so it never floods. */
const RAIN_MAX = 22;
const RAIN_LIFE_FRAMES = 22;

// Glyph sets per orientation, light → heavy.
// Every weight keeps its direction; heavier strokes come from alpha + the accent colour at speed.
const HORIZONTAL = ["-", "-", "=", "="];
const VERTICAL = ["¦", "|", "|", "|"];
const RISING = ["/", "/", "/", "/"];
const FALLING = ["\\", "\\", "\\", "\\"];

export type AsciiFieldHandle = { burst: (clientX: number, clientY: number, strength?: number) => void };

function glyphFor(vx: number, vy: number, weight: number) {
  const angle = Math.atan2(vy, vx); // screen space: +y is down
  const a = ((angle % Math.PI) + Math.PI) % Math.PI; // fold to [0, π)
  const set =
    a < Math.PI / 8 || a >= (7 * Math.PI) / 8
      ? HORIZONTAL
      : a < (3 * Math.PI) / 8
        ? FALLING
        : a < (5 * Math.PI) / 8
          ? VERTICAL
          : RISING;
  return set[Math.min(set.length - 1, Math.max(0, Math.floor(weight * set.length)))];
}

export function AsciiFlowField({
  className,
  handleRef,
}: {
  className?: string;
  handleRef?: React.MutableRefObject<AsciiFieldHandle | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !host || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let columns = 0;
    let rows = 0;
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let rings: { x: number; y: number; t: number; strength: number }[] = [];
    let frame = 0;
    let time = 0;
    let lastTime = 0;
    /** Last pointer/finger position in *client* space: strokes follow physical movement, so a page
        scrolling under the pointer can't stretch them (and the field never needs to pause on scroll). */
    let last: { x: number; y: number; t: number } | null = null;
    let visible = false;
    const coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)");
    let rain: { x: number; y: number; vy: number; life: number }[] = [];
    let lastScrollY = window.scrollY;
    let ink = "#111";
    let signal = "#2446d6";
    let font = `${FONT_SIZE}px monospace`;
    /** Viewport layer for click rings, so they aren't cut off at the section edge. Mounted only while one is alive. */
    const overlay = document.createElement("canvas");
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:30;";
    const overlayContext = overlay.getContext("2d");
    let overlayMounted = false;

    const readStyle = () => {
      const styles = getComputedStyle(host);
      ink = styles.getPropertyValue("--fg-color").trim() || styles.color;
      signal = styles.getPropertyValue("--contact-accent").trim() || "#2446d6";
      font = `${FONT_SIZE}px ${styles.getPropertyValue("--font-mono-stack").trim() || "monospace"}`;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      columns = Math.ceil(rect.width / CELL);
      rows = Math.ceil(rect.height / CELL);
      vx = new Float32Array(columns * rows);
      vy = new Float32Array(columns * rows);
      readStyle();
    };

    /** Stamp a velocity (px/ms, clamped) into a soft round brush around (x, y). */
    const stamp = (x: number, y: number, dx: number, dy: number) => {
      const cx = x / CELL;
      const cy = y / CELL;
      const r = Math.ceil(BRUSH_RADIUS);
      for (let row = Math.floor(cy) - r; row <= Math.floor(cy) + r; row += 1) {
        for (let col = Math.floor(cx) - r; col <= Math.floor(cx) + r; col += 1) {
          if (col < 0 || row < 0 || col >= columns || row >= rows) continue;
          const falloff = Math.max(0, 1 - Math.hypot(col + 0.5 - cx, row + 0.5 - cy) / (BRUSH_RADIUS + 0.5));
          if (!falloff) continue;
          const i = row * columns + col;
          vx[i] += dx * falloff;
          vy[i] += dy * falloff;
          const speed = Math.hypot(vx[i], vy[i]);
          if (speed > 1) {
            vx[i] /= speed;
            vy[i] /= speed;
          }
        }
      }
    };

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
      context.font = font;
      context.textAlign = "center";
      context.textBaseline = "middle";
      let live = false;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < columns; col += 1) {
          const i = row * columns + col;
          const weight = Math.hypot(vx[i], vy[i]);
          const x = col * CELL + CELL / 2;
          const y = row * CELL + CELL / 2;
          if (weight < 0.08) continue;
          live = true;
          context.globalAlpha = Math.min(0.6, 0.15 + weight * 0.55);
          context.fillStyle = weight > 0.85 ? signal : ink;
          context.fillText(glyphFor(vx[i], vy[i], weight), x, y);
        }
      }
      context.globalAlpha = 1;
      return live;
    };

    /** Click ring, in viewport space. Page coordinates so it stays where you clicked while scrolling. */
    const drawRings = () => {
      if (!overlayContext || rings.length === 0) return;
      if (!overlayMounted) {
        document.body.appendChild(overlay);
        overlayMounted = true;
      }
      const ratio = window.devicePixelRatio || 1;
      const viewWidth = window.innerWidth;
      const viewHeight = window.innerHeight;
      const nextWidth = Math.round(viewWidth * ratio);
      const nextHeight = Math.round(viewHeight * ratio);
      if (overlay.width !== nextWidth || overlay.height !== nextHeight) {
        overlay.width = nextWidth;
        overlay.height = nextHeight;
        overlayContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
      overlayContext.clearRect(0, 0, viewWidth, viewHeight);
      overlayContext.font = font;
      overlayContext.textAlign = "center";
      overlayContext.textBaseline = "middle";
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      for (const ring of rings) {
        const cx = ring.x - scrollX;
        const cy = ring.y - scrollY;
        const age = time - ring.t;
        const radius = age * 520;
        const reach = 32;
        const startX = Math.floor(Math.max(0, cx - radius - reach) / CELL) * CELL + CELL / 2;
        const startY = Math.floor(Math.max(0, cy - radius - reach) / CELL) * CELL + CELL / 2;
        const endX = Math.min(viewWidth, cx + radius + reach);
        const endY = Math.min(viewHeight, cy + radius + reach);
        for (let y = startY; y <= endY; y += CELL) {
          for (let x = startX; x <= endX; x += CELL) {
            const dx = x - cx;
            const dy = y - cy;
            const distance = Math.hypot(dx, dy) || 1;
            const weight = Math.min(
              1,
              Math.exp(-(((distance - radius) / 18) ** 2)) * (1 - age / RING_LIFE_S) * ring.strength,
            );
            if (weight < 0.08) continue;
            overlayContext.globalAlpha = Math.min(0.6, 0.15 + weight * 0.55);
            overlayContext.fillStyle = weight > 0.85 ? signal : ink;
            overlayContext.fillText(glyphFor(dx, dy, weight), x, y);
          }
        }
      }
      overlayContext.globalAlpha = 1;
    };

    const clearOverlay = () => {
      if (!overlayMounted) return;
      overlay.remove();
      overlayMounted = false;
    };

    const tick = (now: number) => {
      const delta = lastTime ? Math.min(now - lastTime, 50) : 16;
      lastTime = now;
      time += delta / 1000;
      const keep = DECAY ** (delta / 16.7);
      for (let i = 0; i < vx.length; i += 1) {
        vx[i] *= keep;
        vy[i] *= keep;
      }
      rings = rings.filter((ring) => time - ring.t < RING_LIFE_S);
      for (const drop of rain) {
        // Kept under the signal threshold: rain stays ink, the accent is reserved for real gestures.
        stamp(drop.x, drop.y, 0, Math.sign(drop.vy) * 0.36);
        drop.y += drop.vy * (delta / 16.7);
        drop.life -= 1;
      }
      rain = rain.filter((drop) => drop.life > 0 && drop.y > -CELL && drop.y < rows * CELL + CELL);
      if (rings.length > 0) drawRings();
      else clearOverlay();
      // A ring keeps running after the section scrolls away, so it can finish outside it.
      frame = ((draw() || rain.length > 0) && visible) || rings.length > 0 ? window.requestAnimationFrame(tick) : 0;
      if (!frame) lastTime = 0;
    };

    const wake = (force = false) => {
      if (frame || reducedMotion.matches || document.hidden) return;
      if (!visible && !force) return;
      frame = window.requestAnimationFrame(tick);
    };

    const local = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    /** Shared by mouse and touch: the stroke is the physical movement (client delta), drawn so it ends
        at the pointer's current spot on the canvas. */
    const track = (clientX: number, clientY: number) => {
      const now = performance.now();
      if (last) {
        const dt = Math.max(8, now - last.t);
        const dx = clientX - last.x;
        const dy = clientY - last.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0.5 && distance < 400) {
          const end = local(clientX, clientY);
          const speed = Math.min(1, distance / dt / 1.6); // ~1.6px/ms = full weight
          const steps = Math.max(1, Math.ceil(distance / (CELL * 0.5)));
          for (let s = 0; s <= steps; s += 1) {
            const back = 1 - s / steps;
            stamp(end.x - dx * back, end.y - dy * back, (dx / distance) * speed * STROKE_GAIN, (dy / distance) * speed * STROKE_GAIN);
          }
        }
      }
      last = { x: clientX, y: clientY, t: now };
      wake();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      track(event.clientX, event.clientY);
    };
    const onPointerLeave = () => {
      last = null;
    };
    // Touch: dragging a finger over the section (page scroll included) draws the swipe direction.
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) last = { x: touch.clientX, y: touch.clientY, t: performance.now() };
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) track(touch.clientX, touch.clientY);
    };
    const onTouchEnd = () => {
      last = null;
    };

    const burst = (clientX: number, clientY: number, strength = 1) => {
      // Phones get the press fill and the haptic; a ripple on every tap just covers the card.
      if (reducedMotion.matches || coarsePointer.matches) return;
      rings.push({ x: clientX + window.scrollX, y: clientY + window.scrollY, t: time, strength });
      wake(true);
    };

    /** Touch: scrolling rains short vertical streaks moving with the content (up while scrolling down,
        down while scrolling up), denser with speed; standing still lets them fade out entirely. */
    const onScroll = () => {
      const dy = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      if (!coarsePointer.matches || !visible || reducedMotion.matches || Math.abs(dy) < 1) return;
      const rect = canvas.getBoundingClientRect();
      const top = Math.max(0, -rect.top);
      const bottom = Math.min(rect.height, window.innerHeight - rect.top);
      if (bottom <= top) return;
      const count = Math.min(3, Math.round(Math.abs(dy) / 18) + 1);
      for (let i = 0; i < count && rain.length < RAIN_MAX; i += 1) {
        rain.push({
          x: Math.random() * rect.width,
          y: top + Math.random() * (bottom - top),
          vy: -Math.sign(dy) * (3 + Math.min(9, Math.abs(dy) * 0.12)),
          life: RAIN_LIFE_FRAMES,
        });
      }
      wake();
    };

    /** A click anywhere in the section, down to the footer, sends a ring. Touch uses the press fill instead. */
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      burst(event.clientX, event.clientY, 0.85);
    };
    // The section's bottom padding sits outside the field's host, so listen on the section itself.
    const clickArea = host.closest("section") ?? host;

    const visibility = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) wake();
    });
    const resizeObserver = new ResizeObserver(resize);
    const themeObserver = new MutationObserver(readStyle);

    resize();
    visibility.observe(host);
    resizeObserver.observe(canvas);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    host.addEventListener("pointermove", onPointerMove, { passive: true });
    host.addEventListener("pointerleave", onPointerLeave);
    host.addEventListener("touchstart", onTouchStart, { passive: true });
    host.addEventListener("touchmove", onTouchMove, { passive: true });
    host.addEventListener("touchend", onTouchEnd, { passive: true });
    clickArea.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    if (handleRef) handleRef.current = { burst };

    return () => {
      window.cancelAnimationFrame(frame);
      overlay.remove();
      visibility.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      host.removeEventListener("touchstart", onTouchStart);
      host.removeEventListener("touchmove", onTouchMove);
      host.removeEventListener("touchend", onTouchEnd);
      clickArea.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll);
      if (handleRef) handleRef.current = null;
    };
  }, [handleRef]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
