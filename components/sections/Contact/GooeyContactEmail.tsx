"use client";

import gsap from "gsap";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { getLenis } from "@/lib/smoothScroll";
import { hapticTick } from "@/lib/haptics";
import baseStyles from "./ContactSection.module.scss";
import gooeyStyles from "./ContactSectionGooey.module.scss";
import { createGooeyContactTimeline } from "./gooeyContactTimeline";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function subscribeMobile(onChange: () => void) {
  const mq = window.matchMedia("(max-width: 48rem)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getMobileSnapshot() {
  return window.matchMedia("(max-width: 48rem)").matches;
}

function getMobileServerSnapshot() {
  return false;
}

/** Let the 1100ms entrance blur settle before rasterizing the SVG morph filter. */
const PREWARM_AFTER_REVEAL_MS = 1400;
/** While the page is still scrolling, re-check this often instead of prewarming mid-scroll. */
const PREWARM_SCROLL_RETRY_MS = 200;

/** Shared baseline for both lines; viewBox height stays 20 so GSAP `y: ±5` stays proportional */
const TEXT_BASELINE_Y = 15.5;

type GooeyContactEmailProps = {
  email: string;
  hoverPhrase: string;
  visible: boolean;
  /** Plain click handler (e.g. copy). Modifier-clicks keep the native `mailto:` behaviour. */
  onActivate?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
};


const FALLBACK_VIEWBOX = "0 0 100 20";

export function GooeyContactEmail({
  email,
  hoverPhrase,
  visible,
  onActivate,
}: GooeyContactEmailProps) {
  const itemRef = useRef<HTMLAnchorElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const textGroupRef = useRef<SVGGElement | null>(null);
  const [viewBox, setViewBox] = useState(FALLBACK_VIEWBOX);
  const rawId = useId();
  const filterId = `gooey-${rawId.replace(/:/g, "")}`;

  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  const isMobileViewport = useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getMobileServerSnapshot,
  );

  const visibleRef = useRef(visible);
  /** Set by the timeline effect; reacts to `visible` without rebuilding the timeline. */
  const setTimelineVisibleRef = useRef<((nextVisible: boolean) => void) | null>(null);

  useEffect(() => {
    visibleRef.current = visible;
    setTimelineVisibleRef.current?.(visible);
  }, [visible]);

  /* viewBox and `visible` not in deps: rebuilding mid-scroll/hover re-runs the filter prewarm and resets GSAP */
  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const el = itemRef.current;
    if (!el) {
      return;
    }

    const textsGroupEl = el.querySelector("svg > g");
    const filterEl = el.querySelector("svg filter");
    if (!textsGroupEl || !filterEl) {
      return;
    }

    const fid = filterEl.id;
    const filterUrl = `url(#${fid})`;
    /* Prefer scoped lookup — document.querySelector("#…") can miss with some React useId() / SSR id shapes */
    const feBlur = filterEl.querySelector("feGaussianBlur") as SVGFEGaussianBlurElement | null;
    const [text1, text2] = textsGroupEl.querySelectorAll("text");
    if (!feBlur || !text1 || !text2) {
      return;
    }

    const primitiveValues = { stdDeviation: 0 };

    const tl = createGooeyContactTimeline({
      textsGroupEl: textsGroupEl as SVGGElement,
      text1,
      text2,
      feBlur,
      primitiveValues,
      clearFilterOnEnd: !isMobileViewport,
    });

    if (isMobileViewport) {
      // Mobile rests on the address. Only a horizontal swipe drives the morph;
      // the visitor can read and copy it without waiting for a looping animation.
      const area = (el.closest("[data-gooey-area]") as HTMLElement | null) ?? el;
      const groupEl = textsGroupEl as SVGGElement;
      let drag: { x0: number; y0: number; p0: number; active: boolean; side: number } | null = null;
      let snapTween: gsap.core.Tween | null = null;
      let clearScrubFlag = 0;

      const applyFilter = () => {
        const p = tl.progress();
        groupEl.style.filter = p > 0.001 && p < 0.999 ? filterUrl : "none";
      };
      const onDown = (event: PointerEvent) => {
        if (event.pointerType !== "touch") return;
        drag = { x0: event.clientX, y0: event.clientY, p0: tl.progress(), active: false, side: tl.progress() >= 0.5 ? 1 : 0 };
      };
      const onMove = (event: PointerEvent) => {
        if (!drag) return;
        const dx = event.clientX - drag.x0;
        const dy = event.clientY - drag.y0;
        if (!drag.active) {
          if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            drag.active = true;
            snapTween?.kill();
            area.dataset.gooeyScrubbing = "true";
          } else if (Math.abs(dy) > 10) {
            drag = null;
            return;
          } else {
            return;
          }
        }
        const p = Math.min(1, Math.max(0, drag.p0 - dx / Math.max(160, area.clientWidth * 0.6)));
        const side = p >= 0.5 ? 1 : 0;
        if (side !== drag.side) {
          drag.side = side;
          hapticTick();
        }
        tl.progress(p).pause();
        applyFilter();
      };
      const onUp = () => {
        if (!drag) return;
        const wasActive = drag.active;
        drag = null;
        if (!wasActive) return;
        const target = tl.progress() >= 0.5 ? 1 : 0;
        snapTween = gsap.to(tl, { progress: target, duration: 0.35, ease: "power3.out", onUpdate: applyFilter });
        // Swallow the click the browser may still fire after a swipe (it must not copy).
        window.clearTimeout(clearScrubFlag);
        clearScrubFlag = window.setTimeout(() => {
          delete area.dataset.gooeyScrubbing;
        }, 60);
      };
      const onClickCapture = (event: MouseEvent) => {
        if (area.dataset.gooeyScrubbing) {
          event.preventDefault();
          event.stopPropagation();
        }
      };

      area.addEventListener("pointerdown", onDown, { passive: true });
      area.addEventListener("pointermove", onMove, { passive: true });
      area.addEventListener("pointerup", onUp, { passive: true });
      area.addEventListener("pointercancel", onUp, { passive: true });
      area.addEventListener("click", onClickCapture, true);

      setTimelineVisibleRef.current = (nextVisible) => {
        if (!nextVisible) {
          snapTween?.kill();
          tl.progress(0).pause();
          applyFilter();
        }
      };

      return () => {
        area.removeEventListener("pointerdown", onDown);
        area.removeEventListener("pointermove", onMove);
        area.removeEventListener("pointerup", onUp);
        area.removeEventListener("pointercancel", onUp);
        area.removeEventListener("click", onClickCapture, true);
        window.clearTimeout(clearScrubFlag);
        delete area.dataset.gooeyScrubbing;
        snapTween?.kill();
        setTimelineVisibleRef.current = null;
        tl.revert();
        groupEl.style.filter = "none";
      };
    } else {
      let hoverActivated = false;
      let prewarmed = false;
      let prewarmFrame = 0;
      let prewarmTimer = 0;
      let idleCallback = 0;
      let restoreSvgPrewarm: (() => void) | null = null;
      let restoreGroupPrewarm: (() => void) | null = null;

      const prewarmFilter = () => {
        const svg = svgRef.current;
        if (prewarmed || hoverActivated || !svg || !document.contains(el)) {
          return;
        }

        if (getLenis()?.isScrolling) {
          prewarmTimer = window.setTimeout(schedulePrewarmIdle, PREWARM_SCROLL_RETRY_MS);
          return;
        }

        prewarmed = true;

        const rect = svg.getBoundingClientRect();
        const svgStyle = svg.getAttribute("style");
        const groupStyle = textsGroupEl.getAttribute("style");
        restoreSvgPrewarm = () => {
          if (svgStyle === null) {
            svg.removeAttribute("style");
          } else {
            svg.setAttribute("style", svgStyle);
          }
          restoreSvgPrewarm = null;
        };

        restoreGroupPrewarm = () => {
          if (groupStyle === null) {
            textsGroupEl.removeAttribute("style");
          } else {
            textsGroupEl.setAttribute("style", groupStyle);
          }
          restoreGroupPrewarm = null;
        };

        svg.style.position = "fixed";
        svg.style.inset = "0 auto auto 0";
        svg.style.width = `${rect.width}px`;
        svg.style.height = `${rect.height}px`;
        svg.style.transform = "none";
        svg.style.opacity = "0.001";
        svg.style.pointerEvents = "none";
        svg.style.zIndex = "2147483647";
        (textsGroupEl as SVGGElement).style.filter = filterUrl;
        // Render the most expensive point once: maximum blur plus both moving text layers.
        tl.progress(0.5).pause();

        prewarmFrame = window.requestAnimationFrame(() => {
          prewarmFrame = 0;
          restoreSvgPrewarm?.();

          if (hoverActivated) {
            restoreGroupPrewarm = null;
            return;
          }

          tl.progress(0).pause();
          restoreGroupPrewarm?.();
        });
      };

      function schedulePrewarmIdle() {
        prewarmTimer = 0;
        if ("requestIdleCallback" in window) {
          idleCallback = window.requestIdleCallback(
            () => {
              idleCallback = 0;
              prewarmFilter();
            },
            { timeout: 1500 },
          );
          return;
        }

        prewarmFilter();
      }

      const cancelScheduledPrewarm = () => {
        window.clearTimeout(prewarmTimer);
        prewarmTimer = 0;
        if (idleCallback) {
          window.cancelIdleCallback(idleCallback);
          idleCallback = 0;
        }
      };

      /* Prewarm only once the banner is actually painted (ancestor opacity 0 skips raster) and its entrance has settled. */
      setTimelineVisibleRef.current = (nextVisible) => {
        cancelScheduledPrewarm();
        if (nextVisible && !prewarmed) {
          prewarmTimer = window.setTimeout(schedulePrewarmIdle, PREWARM_AFTER_REVEAL_MS);
        }
      };
      setTimelineVisibleRef.current(visibleRef.current);

      const onEnter = () => {
        hoverActivated = false;
      };
      const onPointerMove = () => {
        if (hoverActivated) {
          return;
        }

        hoverActivated = true;
        (textsGroupEl as SVGGElement).style.filter = filterUrl;
        tl.play();
      };
      const onLeave = () => {
        if (!hoverActivated) {
          return;
        }

        hoverActivated = false;
        (textsGroupEl as SVGGElement).style.filter = filterUrl;
        tl.reverse();
      };

      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("pointermove", onPointerMove, { passive: true });
      el.addEventListener("mouseleave", onLeave);

      return () => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("mouseleave", onLeave);
        setTimelineVisibleRef.current = null;
        cancelScheduledPrewarm();
        if (prewarmFrame) {
          window.cancelAnimationFrame(prewarmFrame);
        }
        restoreSvgPrewarm?.();
        restoreGroupPrewarm?.();
        tl.revert();
        (textsGroupEl as SVGGElement).style.filter = "none";
      };
    }

    return () => {
      setTimelineVisibleRef.current = null;
      tl.revert();
      (textsGroupEl as SVGGElement).style.filter = "none";
    };
  }, [prefersReducedMotion, isMobileViewport]);

  /* Desktop leads with the invitation; mobile keeps the useful address readable at rest. */
  const line1 = (isMobileViewport ? email : hoverPhrase).toUpperCase();
  const line2 = (isMobileViewport ? hoverPhrase : email).toUpperCase();

  const layoutViewBoxFromContent = useCallback(() => {
    const g = textGroupRef.current;
    if (!g) {
      return;
    }
    const bbox = g.getBBox();
    if (!Number.isFinite(bbox.width) || bbox.width < 2) {
      return;
    }
    const pad = 8;
    const w = Math.max(100, bbox.width + pad * 2);
    const next = `0 0 ${w} 20`;
    setViewBox((prev) => (prev === next ? prev : next));
  }, []);

  useLayoutEffect(() => {
    let frame = 0;
    let disposed = false;
    const run = () => {
      if (disposed || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        layoutViewBoxFromContent();
      });
    };

    void document.fonts.ready.then(run);
    run();

    // Text uses a fixed font size in SVG coordinates. Resizing scales the viewBox,
    // so only changed text or loaded fonts need another bounding-box measurement.
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, [layoutViewBoxFromContent, line1, line2]);

  return (
    <span className={`${baseStyles.emailWord} ${gooeyStyles.gooeyEmailWord}`} data-visible={visible}>
      <a
        ref={itemRef}
        href={`mailto:${email}`}
        className={`${baseStyles.emailLink} ${gooeyStyles.gooeyItem} ${prefersReducedMotion ? gooeyStyles.gooeyItemReduced : ""}`}
        aria-label={onActivate ? `${hoverPhrase}. Copy email ${email}` : `${hoverPhrase}. Email ${email}`}
        onClick={(event) => {
          if (!onActivate || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
          }
          event.preventDefault();
          onActivate(event);
        }}
      >
        <svg
          ref={svgRef}
          className={gooeyStyles.menuText}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          overflow="visible"
          aria-hidden
        >
          <defs>
            <filter
              id={filterId}
              /* Horizontal margin sized to the goo, not more: max blur (σ = 1 unit, ~3 units reach) fits in
                 2% of the ~230–260-unit text box, and every extra % is filtered on each animation frame. */
              x="-2%"
              y="-45%"
              width="104%"
              height="190%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  1 0 1 0 0  0 0 0 18 -8"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
          <g ref={textGroupRef}>
            <text x="50%" y={TEXT_BASELINE_Y} textAnchor="middle">
              {line1}
            </text>
            <text x="50%" y={TEXT_BASELINE_Y} textAnchor="middle">
              {line2}
            </text>
          </g>
        </svg>
      </a>
    </span>
  );
}
