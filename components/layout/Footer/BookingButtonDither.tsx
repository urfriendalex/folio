"use client";

import { useEffect, useRef } from "react";

type Dot = {
  x: number;
  y: number;
  size: number;
  shade: number;
  phase: number;
};

const DOT_SPACING = 3.2;

function randomAt(column: number, row: number, salt: number) {
  let value = Math.imul(column + salt, 374761393) + Math.imul(row + salt, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

export function BookingButtonDither({ className }: { className: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const button = canvas?.parentElement;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !button || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let dots: Dot[] = [];
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

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      const scaleX = canvas.width / width;
      const scaleY = canvas.height / height;
      for (const dot of dots) {
        // Two broad waves move the field like gusts; the seeded offset keeps it organic.
        const gust = Math.sin(dot.x * 0.045 + dot.y * 0.085 - time * 1.35 + dot.phase * 0.12);
        const swell = Math.sin(dot.x * 0.019 - dot.y * 0.11 - time * 0.82);
        const x = dot.x + gust * 0.95 + swell * 0.42;
        const y = dot.y + swell * 0.62 + gust * 0.24;
        const size = Math.max(1, Math.round(dot.size * (0.84 + (gust + 1) * 0.13) * scaleX));
        const left = Math.round(x * scaleX - size / 2);
        const top = Math.round(y * scaleY - size / 2);
        context.fillStyle = ink;
        context.globalAlpha = (0.16 + dot.shade * 0.2) * (0.72 + (swell + 1) * 0.16);
        context.fillRect(left, top, size, size);

        if (hover > 0.01) {
          const distance = Math.hypot(x - pointerX, y - pointerY);
          const blueAmount = hover * Math.pow(Math.max(0, 1 - distance / 112), 1.35);
          if (blueAmount > 0.01) {
            context.fillStyle = blue;
            context.globalAlpha = blueAmount * (0.45 + dot.shade * 0.3);
            context.fillRect(left, top, size, size);
          }
        }
      }
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
      draw();
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
      blue = styles.getPropertyValue("--taskbar-flag-blue").trim() || "#2446d6";
      draw();
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (!width || !height) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(1, 0, 0, 1, 0, 0);
      updateColors();
      dots = [];
      for (let row = 0; row * DOT_SPACING < height + DOT_SPACING; row++) {
        for (let column = 0; column * DOT_SPACING < width + DOT_SPACING; column++) {
          const variation = randomAt(column, row, 1);
          dots.push({
            x: column * DOT_SPACING + (randomAt(column, row, 2) - 0.5) * 0.65,
            y: row * DOT_SPACING + (randomAt(column, row, 3) - 0.5) * 0.65,
            size: 0.55 + variation * 0.65,
            shade: randomAt(column, row, 4),
            phase: variation * Math.PI * 2,
          });
        }
      }
      if (!hoverTarget) {
        pointerX = targetX = width / 2;
        pointerY = targetY = height / 2;
      }
      draw();
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
        draw();
      }
    };

    const onPointerLeave = () => {
      hoverTarget = button.matches(":focus-visible") ? 1 : 0;
      if (reducedMotion.matches) {
        hover = hoverTarget;
        draw();
      }
    };

    const onFocus = () => {
      targetX = pointerX = width / 2;
      targetY = pointerY = height / 2;
      hoverTarget = 1;
      if (reducedMotion.matches) {
        hover = 1;
        draw();
      }
    };

    const onMotionChange = () => {
      if (reducedMotion.matches) {
        stop();
        time = 0;
        hover = hoverTarget;
        pointerX = targetX;
        pointerY = targetY;
        draw();
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
    resizeObserver.observe(canvas);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    visibilityObserver.observe(button);
    reducedMotion.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    button.addEventListener("pointerenter", onPointerMove);
    button.addEventListener("pointermove", onPointerMove);
    button.addEventListener("pointerleave", onPointerLeave);
    button.addEventListener("focus", onFocus);
    button.addEventListener("blur", onPointerLeave);
    resize();

    return () => {
      stop();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      visibilityObserver.disconnect();
      reducedMotion.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      button.removeEventListener("pointerenter", onPointerMove);
      button.removeEventListener("pointermove", onPointerMove);
      button.removeEventListener("pointerleave", onPointerLeave);
      button.removeEventListener("focus", onFocus);
      button.removeEventListener("blur", onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
