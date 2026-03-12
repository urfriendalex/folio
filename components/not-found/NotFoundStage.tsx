"use client";

import { useEffect, useRef, useState } from "react";
import ASCIIAnimation from "@/components/Preloader/ascii";
import { getFrameFolderForTheme, LIGHT_FRAME_FOLDER } from "@/components/Preloader/frameFolder";
import styles from "./NotFoundStage.module.scss";

const ASCII_SCALE = 1;
const BOUNCE_VELOCITY = { x: 220, y: 168 };
const MIN_SPEED = { x: 150, y: 120 };
const MAX_SPEED = { x: 280, y: 240 };
const CHAOS_TRANSFER = { x: 18, y: 14 };
const IMPACT_DECAY = 10.5;
const SPIN_DECAY = 8;
const MAX_ROTATION = 7;

type Point = {
  x: number;
  y: number;
};

type SpriteBounds = {
  width: number;
  height: number;
  insetLeft: number;
  insetRight: number;
  insetTop: number;
  insetBottom: number;
  visibleWidth: number;
  visibleHeight: number;
};

const DEFAULT_BOUNDS: SpriteBounds = {
  width: 0,
  height: 0,
  insetLeft: 0,
  insetRight: 0,
  insetTop: 0,
  insetBottom: 0,
  visibleWidth: 0,
  visibleHeight: 0,
};

function centerInViewport(bounds: SpriteBounds): Point {
  return {
    x: (window.innerWidth - bounds.visibleWidth) / 2 - bounds.insetLeft,
    y: (window.innerHeight - bounds.visibleHeight) / 2 - bounds.insetTop,
  };
}

function measureBounds(node: HTMLDivElement): SpriteBounds {
  const rect = node.getBoundingClientRect();
  const pre = node.querySelector("pre");
  const preRect = pre?.getBoundingClientRect();

  if (!preRect) {
    return {
      ...DEFAULT_BOUNDS,
      width: rect.width,
      height: rect.height,
      visibleWidth: rect.width,
      visibleHeight: rect.height,
    };
  }

  const insetLeft = preRect.left - rect.left;
  const insetRight = rect.right - preRect.right;
  const insetTop = preRect.top - rect.top;
  const insetBottom = rect.bottom - preRect.bottom;

  return {
    width: rect.width,
    height: rect.height,
    insetLeft,
    insetRight,
    insetTop,
    insetBottom,
    visibleWidth: Math.max(preRect.width, 0),
    visibleHeight: Math.max(preRect.height, 0),
  };
}

function clampSignedSpeed(value: number, min: number, max: number, fallbackDirection: number) {
  const direction = value === 0 ? Math.sign(fallbackDirection) || 1 : Math.sign(value);
  const magnitude = Math.min(Math.max(Math.abs(value), min), max);

  return direction * magnitude;
}

function easeTo(current: number, target: number, deltaSeconds: number, rate: number) {
  return current + (target - current) * Math.min(deltaSeconds * rate, 1);
}

export function NotFoundStage() {
  const spriteRef = useRef<HTMLDivElement | null>(null);
  const motionRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const positionRef = useRef<Point>({ x: 0, y: 0 });
  const velocityRef = useRef<Point>(BOUNCE_VELOCITY);
  const boundsRef = useRef<SpriteBounds>(DEFAULT_BOUNDS);
  const impactRef = useRef<Point>({ x: 0, y: 0 });
  const rotationRef = useRef(0);
  const spinVelocityRef = useRef(0);
  const bounceCountRef = useRef(0);

  const [frameFolder, setFrameFolder] = useState(LIGHT_FRAME_FOLDER);
  const [isReady, setIsReady] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("is-fullscreen-route");

    return () => {
      html.classList.remove("is-fullscreen-route");
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const syncThemeFolder = () => {
      setFrameFolder(getFrameFolderForTheme(html.getAttribute("data-theme")));
    };

    syncThemeFolder();

    const observer = new MutationObserver(syncThemeFolder);
    observer.observe(html, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    const node = spriteRef.current;

    if (!node || !isReady) {
      return;
    }

    const updateBounds = () => {
      boundsRef.current = measureBounds(node);

      const centered = centerInViewport(boundsRef.current);
      positionRef.current = centered;
      node.style.transform = `translate3d(${centered.x}px, ${centered.y}px, 0)`;
    };

    updateBounds();
    const resizeObserver = new ResizeObserver(updateBounds);
    resizeObserver.observe(node);
    const pre = node.querySelector("pre");
    if (pre) {
      resizeObserver.observe(pre);
    }
    window.addEventListener("resize", updateBounds);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateBounds);
    };
  }, [isReady]);

  useEffect(() => {
    const node = spriteRef.current;
    const motionNode = motionRef.current;

    if (!node || !motionNode || !isReady) {
      return;
    }

    if (prefersReducedMotion) {
      const centered = centerInViewport(boundsRef.current);
      positionRef.current = centered;
      node.style.transform = `translate3d(${centered.x}px, ${centered.y}px, 0)`;
      motionNode.style.transform = "rotate(0deg) scale(1, 1)";
      return;
    }

    const step = (time: number) => {
      const previousTime = lastTimeRef.current ?? time;
      const deltaSeconds = Math.min((time - previousTime) / 1000, 0.05);
      lastTimeRef.current = time;

      const nextPosition = {
        x: positionRef.current.x + velocityRef.current.x * deltaSeconds,
        y: positionRef.current.y + velocityRef.current.y * deltaSeconds,
      };

      const minX = -boundsRef.current.insetLeft;
      const minY = -boundsRef.current.insetTop;
      const maxX = window.innerWidth - boundsRef.current.width + boundsRef.current.insetRight;
      const maxY = window.innerHeight - boundsRef.current.height + boundsRef.current.insetBottom;
      const collidedX = nextPosition.x <= minX || nextPosition.x >= maxX;
      const collidedY = nextPosition.y <= minY || nextPosition.y >= maxY;

      if (collidedX) {
        nextPosition.x = Math.min(Math.max(nextPosition.x, minX), maxX);
        velocityRef.current.x *= -1;
      }

      if (collidedY) {
        nextPosition.y = Math.min(Math.max(nextPosition.y, minY), maxY);
        velocityRef.current.y *= -1;
      }

      if (collidedX || collidedY) {
        bounceCountRef.current += 1;
        const bouncePhase = bounceCountRef.current;

        if (collidedX) {
          velocityRef.current.y = clampSignedSpeed(
            velocityRef.current.y + Math.sin(bouncePhase * 1.618) * CHAOS_TRANSFER.x,
            MIN_SPEED.y,
            MAX_SPEED.y,
            Math.cos(bouncePhase),
          );
          impactRef.current.x -= 0.1;
          impactRef.current.y += 0.13;
          spinVelocityRef.current += Math.sign(velocityRef.current.y || 1) * 28;
        }

        if (collidedY) {
          velocityRef.current.x = clampSignedSpeed(
            velocityRef.current.x + Math.cos(bouncePhase * 1.414) * CHAOS_TRANSFER.y,
            MIN_SPEED.x,
            MAX_SPEED.x,
            Math.sin(bouncePhase),
          );
          impactRef.current.x += 0.06;
          impactRef.current.y -= 0.09;
          spinVelocityRef.current += Math.sign(velocityRef.current.x || 1) * -18;
        }
      }

      positionRef.current = nextPosition;
      node.style.transform = `translate3d(${nextPosition.x}px, ${nextPosition.y}px, 0)`;

      impactRef.current.x = easeTo(impactRef.current.x, 0, deltaSeconds, IMPACT_DECAY);
      impactRef.current.y = easeTo(impactRef.current.y, 0, deltaSeconds, IMPACT_DECAY);
      spinVelocityRef.current = easeTo(spinVelocityRef.current, 0, deltaSeconds, SPIN_DECAY);
      rotationRef.current += spinVelocityRef.current * deltaSeconds;
      rotationRef.current = Math.min(Math.max(rotationRef.current, -MAX_ROTATION), MAX_ROTATION);

      const travelTilt =
        Math.sign(velocityRef.current.x || 1) * 1.6 +
        (velocityRef.current.y / MAX_SPEED.y) * 1.4;
      const scaleX = 1 + impactRef.current.x;
      const scaleY = 1 + impactRef.current.y;
      motionNode.style.transform = `rotate(${rotationRef.current + travelTilt}deg) scale(${scaleX}, ${scaleY})`;
      frameRef.current = window.requestAnimationFrame(step);
    };

    lastTimeRef.current = null;
    frameRef.current = window.requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      lastTimeRef.current = null;
    };
  }, [isReady, prefersReducedMotion]);

  return (
    <section className={styles.page}>
      <div className={styles.stage} aria-hidden="true">
        <div ref={spriteRef} className={styles.sprite}>
          <div ref={motionRef} className={styles.motion}>
            <ASCIIAnimation
              className={styles.ascii}
              preClassName={styles.walker}
              frameFolder={frameFolder}
              quality="high"
              frameCount={37}
              fps={20}
              lazy={false}
              scale={ASCII_SCALE}
              onReady={() => setIsReady(true)}
              ariaLabel="ASCII walking animation"
            />
          </div>
        </div>
      </div>
      <span className={styles.label}>404</span>
    </section>
  );
}
