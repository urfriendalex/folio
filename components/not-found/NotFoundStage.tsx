"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import ASCIIAnimation from "@/components/Preloader/ascii";
import { notFoundContent } from "@/content/not-found";
import { getAnchor, navigateToHomeSection } from "@/lib/navLinks";
import { TrailCanvasLayer } from "./TrailGpuLayer";
import styles from "./NotFoundStage.module.scss";

const ASCII_SCALE = 1;
const EYE_FRAME_FOLDER = "ascii/eye-rgb-20-fps";
const BOUNCE_VELOCITY = { x: 220, y: 168 };
const MIN_SPEED = { x: 150, y: 120 };
const MAX_SPEED = { x: 280, y: 240 };
const CHAOS_TRANSFER = { x: 18, y: 14 };
const FIXED_TIMESTEP_MS = 1000 / 120;
const FIXED_TIMESTEP_SECONDS = FIXED_TIMESTEP_MS / 1000;
const MAX_SIMULATION_STEPS = 8;
const HOVER_BRAKE_RATE = 10;
const HOVER_RESUME_RATE = 7;
const VELOCITY_SETTLE_EPSILON = 4;
const TRAIL_LIMIT = 686;
const TRAIL_LIFETIME_MS = 50000;
const TRAIL_SPACING_PX = 12;
/** Matches `max-width: 48rem` in NotFoundStage.module.scss */
const MOBILE_LAYOUT_MQ = "(max-width: 48rem)";
/** Scales drift velocity, bounce limits, and chaos on narrow viewports */
const MOBILE_DRIFT_SCALE = 0.68;
const MOBILE_ASCII_FPS = 14;

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

type TrailEntry = {
  id: number;
  x: number;
  y: number;
  asciiFrame: string;
  asciiTransform: string;
  screenSnapshot: HTMLCanvasElement | null;
  bornAt: number;
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

function centerInViewport(bounds: SpriteBounds, bottomInset: number): Point {
  const playableHeight = Math.max(0, window.innerHeight - bottomInset);

  return {
    x: (window.innerWidth - bounds.visibleWidth) / 2 - bounds.insetLeft,
    y: (playableHeight - bounds.visibleHeight) / 2 - bounds.insetTop,
  };
}

function measureBounds(node: HTMLDivElement): SpriteBounds {
  const rect = node.getBoundingClientRect();

  return {
    width: rect.width,
    height: rect.height,
    insetLeft: 0,
    insetRight: 0,
    insetTop: 0,
    insetBottom: 0,
    visibleWidth: rect.width,
    visibleHeight: rect.height,
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

type QuickLinksProps = {
  pathname: string;
  onHomeClick: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  buttonClassName: string;
};

function NotFoundQuickLinks({ pathname, onHomeClick, buttonClassName }: QuickLinksProps) {
  return (
    <>
      {notFoundContent.quickLinks.map((link) => {
        if (link.kind === "home") {
          return (
            <Link
              key="home"
              href="/#hero"
              scroll={false}
              className={buttonClassName}
              onClick={onHomeClick}
            >
              {link.label}
            </Link>
          );
        }

        if (link.kind === "work") {
          return (
            <a key="work" href={getAnchor(pathname, "work")} className={buttonClassName}>
              {link.label}
            </a>
          );
        }

        if (link.kind === "archive") {
          return (
            <Link key="archive" href="/archive" className={buttonClassName}>
              {link.label}
            </Link>
          );
        }

        return (
          <a key="contact" href={getAnchor(pathname, "contact")} className={buttonClassName}>
            {link.label}
          </a>
        );
      })}
    </>
  );
}

type WindowContentProps = {
  frameFolder: string;
  isPaused: boolean;
  asciiFps: number;
  /** When true, `ASCIIAnimation` uses `fillParent` (full-bleed in `.screen`) */
  asciiFillParent: boolean;
  /** Desktop: quick links live in the window. Mobile: they render in the bottom toolbar only. */
  quickLinksInModal: boolean;
  pathname: string;
  onHomeClick: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  onReady?: () => void;
  onWindowBlur?: (event: ReactFocusEvent<HTMLElement>) => void;
  onWindowEnter?: () => void;
  onWindowLeave?: () => void;
};

function NotFoundWindowContent({
  frameFolder,
  isPaused,
  asciiFps,
  asciiFillParent,
  quickLinksInModal,
  pathname,
  onHomeClick,
  onReady,
  onWindowBlur,
  onWindowEnter,
  onWindowLeave,
}: WindowContentProps) {
  const wrapperClassName = `${styles.window} ${isPaused ? styles.windowPaused : ""}`.trim();
  const bodyClassName = `${styles.windowBody} ${quickLinksInModal ? styles.windowBodyWithActions : ""}`.trim();
  const title = notFoundContent.windowTitle;

  return (
    <article
      className={wrapperClassName}
      onPointerEnter={onWindowEnter}
      onPointerLeave={onWindowLeave}
      onFocusCapture={onWindowEnter}
      onBlurCapture={onWindowBlur}
      role="dialog"
      aria-labelledby="not-found-window-title"
      aria-describedby="not-found-window-description"
    >
      <header className={styles.windowBar}>
        <div className={styles.windowHeading}>
          <span className={styles.windowBrandMark} aria-hidden="true">
            {notFoundContent.brandMark}
          </span>
          <span id="not-found-window-title" className={styles.windowTitle}>
            {title}
          </span>
        </div>
        <Link
          href="/#hero"
          scroll={false}
          className={styles.closeButton}
          aria-label="Go back home"
          prefetch={false}
          onClick={onHomeClick}
        >
          {notFoundContent.closeLabel}
        </Link>
      </header>

      <div className={bodyClassName}>
        <div className={styles.screenFrame}>
          <div className={styles.screen}>
            <div className={styles.screenPattern} aria-hidden="true" />
            <div className={styles.screenAsciiViewport}>
              <ASCIIAnimation
                className={styles.screenAsciiRoot}
                preClassName={
                  asciiFillParent ? styles.screenAsciiCanvasFill : styles.screenAsciiCanvas
                }
                frameFolder={frameFolder}
                quality="high"
                frameCount={22}
                fps={asciiFps}
                lazy={false}
                scale={ASCII_SCALE}
                paused={isPaused}
                sourceFormat="color"
                fillParent={asciiFillParent}
                onReady={onReady}
                ariaLabel="ASCII animation in the window"
              />
            </div>
          </div>
        </div>

        <div className={styles.copyBlock}>
          <span className={styles.copyLabel}>{notFoundContent.copyLabel}</span>
          <p id="not-found-window-description" className={styles.copy}>
            {notFoundContent.copy}
          </p>
        </div>

        {quickLinksInModal ? (
          <nav className={styles.actions} aria-label="Quick links">
            <NotFoundQuickLinks
              pathname={pathname}
              onHomeClick={onHomeClick}
              buttonClassName={styles.actionButton}
            />
          </nav>
        ) : null}
      </div>
    </article>
  );
}

export function NotFoundStage() {
  const spriteRef = useRef<HTMLDivElement | null>(null);
  const motionRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const positionRef = useRef<Point>({ x: 0, y: 0 });
  const velocityRef = useRef<Point>(BOUNCE_VELOCITY);
  const boundsRef = useRef<SpriteBounds>(DEFAULT_BOUNDS);
  const bounceCountRef = useRef(0);
  const hoverResumeVelocityRef = useRef<Point | null>(null);
  const lastTrailPointRef = useRef<Point | null>(null);
  const trailDistanceAccumulatorRef = useRef(0);

  const [isReady, setIsReady] = useState(false);
  const [isWindowHovered, setIsWindowHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [trailEntries, setTrailEntries] = useState<TrailEntry[]>([]);
  const [ghostSize, setGhostSize] = useState({ width: 0, height: 0 });
  const trailIdRef = useRef(0);
  const toolbarRef = useRef<HTMLElement | null>(null);
  const bottomInsetRef = useRef(0);
  const [toolbarInset, setToolbarInset] = useState(0);
  const driftScaleRef = useRef(1);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const effectiveToolbarInset = isNarrowViewport ? toolbarInset : 0;

  const pathname = usePathname();
  const router = useRouter();

  const handleHomeClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }

      event.preventDefault();
      navigateToHomeSection({ pathname, router, sectionId: "hero" });
    },
    [pathname, router],
  );

  const handleAsciiReady = useCallback(() => {
    setIsReady(true);
  }, []);

  useLayoutEffect(() => {
    const mq = window.matchMedia(MOBILE_LAYOUT_MQ);
    const sync = () => {
      const narrow = mq.matches;
      setIsNarrowViewport(narrow);
      const next = narrow ? MOBILE_DRIFT_SCALE : 1;
      const prev = driftScaleRef.current;
      driftScaleRef.current = next;
      const ratio = prev !== 0 ? next / prev : next;
      velocityRef.current.x *= ratio;
      velocityRef.current.y *= ratio;
      if (hoverResumeVelocityRef.current) {
        hoverResumeVelocityRef.current.x *= ratio;
        hoverResumeVelocityRef.current.y *= ratio;
      }
    };

    sync();
    mq.addEventListener("change", sync);

    return () => {
      mq.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!isNarrowViewport) {
      bottomInsetRef.current = 0;
      return;
    }

    const node = toolbarRef.current;

    if (!node) {
      return;
    }

    const measure = () => {
      const height = node.getBoundingClientRect().height;
      bottomInsetRef.current = height;
      setToolbarInset(height);
    };

    const frame = window.requestAnimationFrame(measure);
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(node);
    window.addEventListener("resize", measure);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [isNarrowViewport]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("is-fullscreen-route");

    return () => {
      html.classList.remove("is-fullscreen-route");
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      if (mediaQuery.matches) {
        setTrailEntries([]);
        hoverResumeVelocityRef.current = null;
        lastTrailPointRef.current = null;
        trailDistanceAccumulatorRef.current = 0;
      }

      setPrefersReducedMotion(mediaQuery.matches);
    };

    const frame = window.requestAnimationFrame(updatePreference);
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      window.cancelAnimationFrame(frame);
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      hoverResumeVelocityRef.current = null;
      return;
    }

    if (isWindowHovered) {
      hoverResumeVelocityRef.current = {
        x: velocityRef.current.x,
        y: velocityRef.current.y,
      };
    }
  }, [isWindowHovered, prefersReducedMotion]);

  useEffect(() => {
    if (trailEntries.length === 0 || prefersReducedMotion) {
      return;
    }

    const cleanupExpiredTrails = () => {
      const now = window.performance.now();

      setTrailEntries((current) =>
        current.filter((entry) => now - entry.bornAt < TRAIL_LIFETIME_MS),
      );
    };

    cleanupExpiredTrails();
    const cleanupTimer = window.setInterval(cleanupExpiredTrails, 250);

    return () => {
      window.clearInterval(cleanupTimer);
    };
  }, [prefersReducedMotion, trailEntries.length]);

  useEffect(() => {
    const node = spriteRef.current;

    if (!node || !isReady) {
      return;
    }

    const updateBounds = () => {
      const bounds = measureBounds(node);
      boundsRef.current = bounds;
      setGhostSize({ width: bounds.width, height: bounds.height });

      const centered = centerInViewport(bounds, bottomInsetRef.current);
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
    const canvas = node.querySelector("canvas");
    if (canvas) {
      resizeObserver.observe(canvas);
    }
    window.addEventListener("resize", updateBounds);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateBounds);
    };
  }, [isReady, effectiveToolbarInset]);

  const handleWindowBlur = (event: ReactFocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setIsWindowHovered(false);
    }
  };

  const pushTrailEntry = useCallback((
    position: Point,
    time: number,
  ) => {
    const lastTrailPoint = lastTrailPointRef.current;
    if (!lastTrailPoint) {
      lastTrailPointRef.current = position;
      trailDistanceAccumulatorRef.current = 0;
      return;
    }

    trailDistanceAccumulatorRef.current += Math.hypot(
      position.x - lastTrailPoint.x,
      position.y - lastTrailPoint.y,
    );
    lastTrailPointRef.current = position;

    if (trailDistanceAccumulatorRef.current < TRAIL_SPACING_PX) {
      return;
    }

    trailDistanceAccumulatorRef.current %= TRAIL_SPACING_PX;

    const livePre = spriteRef.current?.querySelector("pre");
    const liveCanvas = spriteRef.current?.querySelector("canvas");
    const asciiFrame = livePre?.textContent ?? "";
    const asciiTransform = livePre instanceof HTMLElement ? livePre.style.transform : "";
    let screenSnapshot: HTMLCanvasElement | null = null;

    if (liveCanvas instanceof HTMLCanvasElement && liveCanvas.width > 0 && liveCanvas.height > 0) {
      const clonedCanvas = document.createElement("canvas");
      clonedCanvas.width = liveCanvas.width;
      clonedCanvas.height = liveCanvas.height;
      const clonedContext = clonedCanvas.getContext("2d");
      if (clonedContext) {
        clonedContext.drawImage(liveCanvas, 0, 0);
        screenSnapshot = clonedCanvas;
      }
    }

    if (!asciiFrame && !screenSnapshot) {
      return;
    }

    setTrailEntries((current) => {
      trailIdRef.current += 1;
      const nextEntry = {
        id: trailIdRef.current,
        x: position.x,
        y: position.y,
        asciiFrame,
        asciiTransform,
        screenSnapshot,
        bornAt: time,
      };

      return [...current.slice(-(TRAIL_LIMIT - 1)), nextEntry];
    });
  }, []);

  useEffect(() => {
    const node = spriteRef.current;
    const motionNode = motionRef.current;

    if (!node || !motionNode || !isReady) {
      return;
    }

    if (prefersReducedMotion) {
      accumulatorRef.current = 0;
      lastTimeRef.current = null;
      hoverResumeVelocityRef.current = null;
      const centered = centerInViewport(boundsRef.current, bottomInsetRef.current);
      positionRef.current = centered;
      node.style.transform = `translate3d(${centered.x}px, ${centered.y}px, 0)`;
      motionNode.style.transform = "none";
      return;
    }

    const simulateStep = (time: number) => {
      if (isWindowHovered) {
        velocityRef.current = {
          x: easeTo(velocityRef.current.x, 0, FIXED_TIMESTEP_SECONDS, HOVER_BRAKE_RATE),
          y: easeTo(velocityRef.current.y, 0, FIXED_TIMESTEP_SECONDS, HOVER_BRAKE_RATE),
        };

        if (Math.abs(velocityRef.current.x) < VELOCITY_SETTLE_EPSILON) {
          velocityRef.current.x = 0;
        }
        if (Math.abs(velocityRef.current.y) < VELOCITY_SETTLE_EPSILON) {
          velocityRef.current.y = 0;
        }
      } else if (hoverResumeVelocityRef.current) {
        velocityRef.current = {
          x: easeTo(
            velocityRef.current.x,
            hoverResumeVelocityRef.current.x,
            FIXED_TIMESTEP_SECONDS,
            HOVER_RESUME_RATE,
          ),
          y: easeTo(
            velocityRef.current.y,
            hoverResumeVelocityRef.current.y,
            FIXED_TIMESTEP_SECONDS,
            HOVER_RESUME_RATE,
          ),
        };

        if (
          Math.abs(velocityRef.current.x - hoverResumeVelocityRef.current.x) < VELOCITY_SETTLE_EPSILON &&
          Math.abs(velocityRef.current.y - hoverResumeVelocityRef.current.y) < VELOCITY_SETTLE_EPSILON
        ) {
          velocityRef.current = hoverResumeVelocityRef.current;
          hoverResumeVelocityRef.current = null;
        }
      }

      const nextPosition = {
        x: positionRef.current.x + velocityRef.current.x * FIXED_TIMESTEP_SECONDS,
        y: positionRef.current.y + velocityRef.current.y * FIXED_TIMESTEP_SECONDS,
      };

      const minX = -boundsRef.current.insetLeft;
      const minY = -boundsRef.current.insetTop;
      const bottomInset = bottomInsetRef.current;
      const maxX = window.innerWidth - boundsRef.current.width + boundsRef.current.insetRight;
      const maxY =
        window.innerHeight - bottomInset - boundsRef.current.height + boundsRef.current.insetBottom;
      const collidedX = nextPosition.x <= minX || nextPosition.x >= maxX;
      const collidedY = nextPosition.y <= minY || nextPosition.y >= maxY;

      if (collidedX) {
        nextPosition.x = Math.min(Math.max(nextPosition.x, minX), maxX);
        velocityRef.current.x *= -1;
        hoverResumeVelocityRef.current = null;
      }

      if (collidedY) {
        nextPosition.y = Math.min(Math.max(nextPosition.y, minY), maxY);
        velocityRef.current.y *= -1;
        hoverResumeVelocityRef.current = null;
      }

      if (collidedX || collidedY) {
        bounceCountRef.current += 1;
        const bouncePhase = bounceCountRef.current;
        const s = driftScaleRef.current;
        const minSy = MIN_SPEED.y * s;
        const maxSy = MAX_SPEED.y * s;
        const minSx = MIN_SPEED.x * s;
        const maxSx = MAX_SPEED.x * s;
        const chaosX = CHAOS_TRANSFER.x * s;
        const chaosY = CHAOS_TRANSFER.y * s;

        if (collidedX) {
          velocityRef.current.y = clampSignedSpeed(
            velocityRef.current.y + Math.sin(bouncePhase * 1.618) * chaosX,
            minSy,
            maxSy,
            Math.cos(bouncePhase),
          );
        }

        if (collidedY) {
          velocityRef.current.x = clampSignedSpeed(
            velocityRef.current.x + Math.cos(bouncePhase * 1.414) * chaosY,
            minSx,
            maxSx,
            Math.sin(bouncePhase),
          );
        }
      }

      positionRef.current = nextPosition;

      pushTrailEntry(nextPosition, time);
    };

    const updatePresentation = () => {
      node.style.transform = `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0)`;
      motionNode.style.transform = "none";
    };

    const step = (time: number) => {
      const previousTime = lastTimeRef.current ?? time;
      const frameDeltaMs = Math.min(time - previousTime, 100);
      lastTimeRef.current = time;

      accumulatorRef.current += frameDeltaMs;
      let steps = 0;

      while (
        accumulatorRef.current >= FIXED_TIMESTEP_MS &&
        steps < MAX_SIMULATION_STEPS
      ) {
        simulateStep(time);
        accumulatorRef.current -= FIXED_TIMESTEP_MS;
        steps += 1;
      }

      if (steps === MAX_SIMULATION_STEPS) {
        accumulatorRef.current = 0;
      }

      updatePresentation();
      frameRef.current = window.requestAnimationFrame(step);
    };

    accumulatorRef.current = 0;
    lastTimeRef.current = null;
    frameRef.current = window.requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      lastTimeRef.current = null;
      accumulatorRef.current = 0;
    };
  }, [isReady, isWindowHovered, prefersReducedMotion, pushTrailEntry, effectiveToolbarInset]);

  const toolbarButtonClassName = `${styles.actionButton} ${styles.toolbarButton}`.trim();
  const asciiFps = isNarrowViewport ? MOBILE_ASCII_FPS : 20;

  return (
    <section className={styles.page}>
      <div className={styles.stage}>
        <div className={styles.trailLayer} aria-hidden="true">
          {ghostSize.width > 0 && ghostSize.height > 0 && (
            <TrailCanvasLayer snapshots={trailEntries} ghostSize={ghostSize} />
          )}
        </div>
        <div className={styles.backdrop404} aria-hidden="true">
          <span className={styles.backdrop404Text}>404</span>
        </div>
        <div ref={spriteRef} className={styles.sprite}>
          <div ref={motionRef} className={styles.motion}>
            <NotFoundWindowContent
              frameFolder={EYE_FRAME_FOLDER}
              isPaused={false}
              asciiFps={asciiFps}
              asciiFillParent={isNarrowViewport}
              quickLinksInModal={!isNarrowViewport}
              pathname={pathname ?? "/"}
              onHomeClick={handleHomeClick}
              onReady={handleAsciiReady}
              onWindowEnter={() => setIsWindowHovered(true)}
              onWindowLeave={() => setIsWindowHovered(false)}
              onWindowBlur={handleWindowBlur}
            />
          </div>
        </div>
      </div>
      {isNarrowViewport ? (
        <nav ref={toolbarRef} className={styles.toolbar} aria-label="Quick links">
          <div className={styles.toolbarInner}>
            <NotFoundQuickLinks
              pathname={pathname ?? "/"}
              onHomeClick={handleHomeClick}
              buttonClassName={toolbarButtonClassName}
            />
          </div>
        </nav>
      ) : null}
    </section>
  );
}
