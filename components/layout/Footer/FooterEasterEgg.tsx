"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { FooterSnake } from "./FooterSnake";
import { isBodyScrollLocked } from "@/lib/scrollLock";
import styles from "./FooterEasterEgg.module.scss";

const EFFORT_THRESHOLD = 2400;
const MIN_PUSH_MS = 3200;
const REVERSE_DISTANCE = 1400;

export function FooterEasterEgg({ wordmarkRef }: {
  wordmarkRef: RefObject<HTMLParagraphElement | null>;
}) {
  const [revealed, setRevealed] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wordmark = wordmarkRef.current;
    const host = document.getElementById("footer-wordmark-underlay");
    if (!wordmark || !host) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let effort = 0;
    let firstPush = 0;
    let lastPush = 0;
    let lastFrame = 0;
    let target = 0;
    let extension = 0;
    let velocity = 0;
    let raf = 0;
    let touchY: number | null = null;
    let latched = false;
    let retracting = false;
    let baseHeight = host.getBoundingClientRect().height;

    const atEnd = () => !isBodyScrollLocked() && !document.hidden &&
      host.hasAttribute("data-footer-wordmark-active") &&
      document.documentElement.scrollHeight - window.innerHeight - window.scrollY <= 4;

    const measure = () => {
      // The CSS token remains the resting height even while the actual strip grows.
      const probe = document.createElement("div");
      probe.style.cssText = "position:fixed;visibility:hidden;height:var(--footer-wordmark-strip-height)";
      document.body.appendChild(probe);
      baseHeight = probe.getBoundingClientRect().height;
      probe.remove();
    };

    const paint = () => {
      const amount = reducedMotion.matches ? (latched ? 1 : 0) : Math.max(0, Math.min(1, extension));
      // Resize the ORIGINAL wordmark host. Its background and baseline stay continuous.
      host.style.height = `${baseHeight + (window.innerHeight - baseHeight) * amount}px`;
      host.style.zIndex = amount > 0.001 ? "480" : "";
      if (amount <= 0.001) host.style.removeProperty("height");
    };

    const tick = (now: number) => {
      const elapsed = Math.min(now - lastFrame, 40);
      lastFrame = now;
      if (!latched && !retracting && target > 0) {
        const idle = now - lastPush > 180;
        effort = Math.max(0, effort - elapsed * (idle ? 0.9 : 0.32));
        target = Math.min(effort / EFFORT_THRESHOLD, Math.max(0, (lastPush - firstPush) / MIN_PUSH_MS), 0.94);
      }
      const dt = elapsed / 1000;
      velocity += ((target - extension) * 150 - velocity * 24) * dt;
      extension += velocity * dt;
      paint();
      if (Math.abs(target - extension) > 0.0005 || Math.abs(velocity) > 0.001 || (!latched && effort > 0)) {
        raf = requestAnimationFrame(tick);
      } else {
        extension = target;
        paint();
        raf = 0;
      }
    };
    const schedule = () => {
      if (!raf) {
        lastFrame = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    const close = () => {
      latched = false;
      retracting = true;
      effort = 0;
      firstPush = 0;
      target = 0;
      setRevealed(false);
      schedule();
    };

    const push = (delta: number) => {
      if (isBodyScrollLocked() || document.hidden) { close(); return false; }
      if (delta < 0 && (extension > 0.002 || target > 0)) {
        // Reverse the same surface before releasing the gesture back to the page.
        latched = false;
        retracting = true;
        setRevealed(false);
        target = Math.max(0, target - Math.min(-delta, 160) / REVERSE_DISTANCE);
        effort = 0;
        firstPush = 0;
        schedule();
        return true;
      }
      if (delta <= 0 || !atEnd()) return false;
      if (latched) return true;
      if (delta < 20) return extension > 0.002;
      retracting = false;
      const now = performance.now();
      if (!firstPush || now - lastPush > 800) {
        firstPush = now;
        effort = Math.min(effort, EFFORT_THRESHOLD * 0.15);
      }
      lastPush = now;
      effort += Math.min(delta, 120);
      target = Math.min(effort / EFFORT_THRESHOLD, (now - firstPush) / MIN_PUSH_MS, 0.94);
      if (effort >= EFFORT_THRESHOLD && now - firstPush >= MIN_PUSH_MS) {
        latched = true;
        target = 1;
        setRevealed(true);
      }
      schedule();
      return true;
    };
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (event.target instanceof Element && event.target.closest("[data-lenis-prevent], dialog, textarea, input, select, [contenteditable]")) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      if (push(event.deltaY * unit)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) { touchY = null; return; }
      const nextY = event.touches[0].clientY;
      if (touchY !== null && push((touchY - nextY) * 3)) {
        event.preventDefault();
        event.stopPropagation();
      }
      touchY = nextY;
    };
    const onTouchEnd = () => { touchY = null; };
    const onKeyDown = (event: KeyboardEvent) => {
      if (target <= 0 && extension <= 0.002) return;
      if (event.key !== "Escape" && event.target instanceof Element && event.target.closest("[data-footer-game]")) return;
      if (["Escape", "ArrowUp", "PageUp", "Home"].includes(event.key)) {
        event.preventDefault();
        close();
      }
    };
    const onResize = () => { measure(); paint(); };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      host.style.removeProperty("height");
      host.style.removeProperty("z-index");
      window.removeEventListener("wheel", onWheel, true);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove, true);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [wordmarkRef]);

  useEffect(() => {
    if (!revealed) return;
    const host = document.getElementById("footer-wordmark-underlay");
    if (!host) return;
    const previousFocus = document.activeElement;
    const siblings = Array.from(host.parentElement?.children ?? []).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== host,
    );
    const inertStates = siblings.map(element => element.inert);
    siblings.forEach(element => { element.inert = true; });
    host.removeAttribute("aria-hidden");
    const focusFrame = requestAnimationFrame(() => sceneRef.current?.querySelector<HTMLElement>("[data-play-control]")?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(focusFrame);
      siblings.forEach((element, index) => { element.inert = inertStates[index]; });
      host.setAttribute("aria-hidden", "true");
      if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
    };
  }, [revealed]);

  return (
    <div ref={sceneRef} className={styles.scene} data-visible={revealed} aria-hidden={!revealed}
      role={revealed ? "dialog" : undefined} aria-modal={revealed ? true : undefined}
      aria-labelledby="footer-secret-title" inert={!revealed}
      onKeyDown={(event) => {
        if (event.key !== "Tab" || !revealed) return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), [tabindex='0']"));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }}>
      <div className={styles.header}>
        <p id="footer-secret-title" className={styles.message}>are you happy now?</p>
        <p className={styles.invitation}>scroll back, or play a game.</p>
      </div>
      {revealed && <FooterSnake />}
    </div>
  );
}
