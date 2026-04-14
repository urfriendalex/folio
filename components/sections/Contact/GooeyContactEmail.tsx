"use client";

import gsap from "gsap";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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

const MOBILE_LOOP_REPEAT_DELAY = 1.75;

/** Shared baseline for both lines; viewBox height stays 20 so GSAP `y: ±5` stays proportional */
const TEXT_BASELINE_Y = 15;

type GooeyContactEmailProps = {
  email: string;
  hoverPhrase: string;
  visible: boolean;
};

const FALLBACK_VIEWBOX = "0 0 100 20";

export function GooeyContactEmail({ email, hoverPhrase, visible }: GooeyContactEmailProps) {
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

  /* viewBox not in deps: getBBox churn must not reset GSAP mid-hover */
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

    let progressTween: gsap.core.Tween | null = null;

    if (isMobileViewport) {
      const duration = tl.duration();
      progressTween = gsap.to(tl, {
        progress: 1,
        duration,
        ease: "none",
        repeat: -1,
        yoyo: true,
        repeatDelay: MOBILE_LOOP_REPEAT_DELAY,
        paused: !visible,
        onUpdate: () => {
          feBlur.setAttribute("stdDeviation", String(primitiveValues.stdDeviation));
          const p = tl.progress();
          (textsGroupEl as SVGGElement).style.filter = p > 0 && p < 1 ? filterUrl : "none";
        },
      });
    } else {
      const onEnter = () => {
        (textsGroupEl as SVGGElement).style.filter = filterUrl;
        tl.play();
      };
      const onLeave = () => {
        (textsGroupEl as SVGGElement).style.filter = filterUrl;
        tl.reverse();
      };

      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);

      return () => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
        progressTween?.kill();
        tl.kill();
        (textsGroupEl as SVGGElement).style.filter = "none";
      };
    }

    return () => {
      progressTween?.kill();
      tl.kill();
      (textsGroupEl as SVGGElement).style.filter = "none";
    };
  }, [prefersReducedMotion, isMobileViewport, visible]);

  /* Line 1 = phrase (default); line 2 = email (hover / loop phase 2) */
  const line1 = hoverPhrase.toUpperCase();
  const line2 = email.toUpperCase();

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
    const run = () => {
      requestAnimationFrame(() => {
        layoutViewBoxFromContent();
        requestAnimationFrame(layoutViewBoxFromContent);
      });
    };

    void document.fonts.ready.then(run);
    run();

    const svg = svgRef.current;
    const ro = new ResizeObserver(run);
    if (svg) {
      ro.observe(svg);
    }
    window.addEventListener("resize", run);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [layoutViewBoxFromContent, line1, line2, visible]);

  return (
    <span className={`${baseStyles.emailWord} ${gooeyStyles.gooeyEmailWord}`} data-visible={visible}>
      <a
        ref={itemRef}
        href={`mailto:${email}`}
        className={`${baseStyles.emailLink} ${gooeyStyles.gooeyItem} ${prefersReducedMotion ? gooeyStyles.gooeyItemReduced : ""}`}
        aria-label={`${hoverPhrase}. Email ${email}`}
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
            <filter id={filterId}>
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
