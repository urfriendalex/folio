"use client";

import {
  Fragment,
  createContext,
  useContext,
  type ReactNode,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { KEYBOARD_FOCUS_SELECTOR } from "@/lib/inputModality";
import ASCIIAnimation, {
  ASCII_VISIBILITY_REVEAL_DURATION_MS,
  cellRevealHash01,
} from "@/components/Preloader/ascii";
import {
  getFrameFolderForTheme,
  getInitialFrameFolder,
} from "@/components/Preloader/frameFolder";
import { RevealLines } from "@/components/motion/RevealLines/RevealLines";
import { usePretextLines } from "@/components/motion/shared/usePretextLines";
import { useRevealOnView } from "@/components/motion/shared/useRevealOnView";
import { useOptionalHeroRevealTimeline } from "@/lib/heroRevealTimeline";
import { GLYPH_GLITCH_STEPS, GLYPH_GLITCH_THRESHOLD_MAX, isGlyphShown } from "@/lib/glyphGlitch";
import {
  getHomeHeroRevealDone,
  setHomeHeroRevealDone,
  subscribeHomeHeroRevealDone,
} from "@/lib/homeHeroRevealSession";
import { usePreloaderComplete } from "@/lib/preloaderComplete";
import { useRevealMotionEnabled } from "@/lib/revealPolicy";
import { useRestoredScrollBypass } from "@/lib/restoredScroll";
import { getLenis } from "@/lib/smoothScroll";
import styles from "./HeroSection.module.scss";

/** Short stagger for the intro so the sequence stays snappy before the headline. */
const INTRO_REVEAL_STEP_MS = 44;
const HEADING_REVEAL_STEP_MS = 62;
const REVEAL_TRANSFORM_SETTLE_MS = 620;
/** In-site return to `/` replays the cascade compressed (CSS: `html.home-hero-return` in HeroSection.module.scss). */
const HERO_RETURN_TEMPO = 0.6;

function heroTempo() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("home-hero-return")
    ? HERO_RETURN_TEMPO
    : 1;
}

const COARSE_POINTER_QUERY = "(hover: none)";

function subscribeCoarsePointer(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const mq = window.matchMedia(COARSE_POINTER_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getCoarsePointerSnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(COARSE_POINTER_QUERY).matches;
}

function getServerCoarsePointerSnapshot(): boolean {
  return false;
}

/** Matches the SCSS breakpoint where the walker parks right, under the type. */
const WALKER_PARKED_QUERY = "(max-width: 64rem)";

function subscribeWalkerParked(onStoreChange: () => void) {
  const mq = window.matchMedia(WALKER_PARKED_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getWalkerParkedSnapshot(): boolean {
  return window.matchMedia(WALKER_PARKED_QUERY).matches;
}

function getServerWalkerParkedSnapshot(): boolean {
  return false;
}

const MOBILE_HERO_QUERY = "(max-width: 48rem)";
function subscribeMobileHero(onChange: () => void) {
  const media = window.matchMedia(MOBILE_HERO_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
function getMobileHeroSnapshot() {
  return window.matchMedia(MOBILE_HERO_QUERY).matches;
}

/** Matches the phrases in `heroContent.position`. */
const INDEPENDENT_DEVELOPER_PHRASE = "Independent Developer";
const CREATIVE_TECHNOLOGIST_PHRASE = "Creative Technologist";
const WALKER_FRAME_COUNT = 37;
const WALKER_FPS = 20;
/** Touch layout walker scale (contain-fit to its band). */
const WALKER_COARSE_SCALE = 0.88;
/** Desktop hover in/out runs 15% quicker than the shared reveal so it keeps up with the pointer. */
const WALKER_HOVER_REVEAL_DURATION_MS = Math.round(ASCII_VISIBILITY_REVEAL_DURATION_MS * 0.85);
/** Touch intro: the walker builds in cell by cell alongside the CTA's ASCII sweep, so it takes its time
    (~1.5× the shared reveal) instead of finishing well before the button motion has played out. */
const WALKER_TOUCH_INTRO_REVEAL_DURATION_MS = 1400;

/** Scroll-out dissolve: nothing glitches until the page has scrolled this share of the viewport… */
const TEXT_DISSOLVE_DELAY_VIEWPORT = 0.12;
/** …later on desktop, where the hero sits higher and Work is already in view. */
const TEXT_DISSOLVE_DELAY_VIEWPORT_FINE = 0.2;
/** Lower lines wait until they've risen this share of the viewport past the first line… */
const TEXT_DISSOLVE_LEAD_VIEWPORT = 0.1;
/** …and each line is gone after this much further scroll (share of the viewport). */
const TEXT_DISSOLVE_RANGE_VIEWPORT = 0.26;
const INTRO_DISSOLVE_SEED = 101;
const HEADING_DISSOLVE_SEED = 211;
const DESCRIPTION_DISSOLVE_SEED = 263;
const CTA_DISSOLVE_SEED = 307;

function dissolve(text: string, piece: number) {
  return text ? <DissolveText text={text} seed={INTRO_DISSOLVE_SEED + piece} /> : null;
}
/** Hover/focus on a live control glitches its glyphs back in (and out on leave) over this long. */
const TEXT_RESTORE_MS = 320;

/**
 * Splits text into glyph spans that drop out in the walker's random cell order as their line scrolls
 * away (the hero's scroll driver flips `data-dissolve-off`). Screen readers get the plain text once.
 */
const DissolveText = memo(function DissolveText({ text, seed }: { text: string; seed: number }) {
  return (
    <>
      <span className={styles.srOnly}>{text}</span>
      <span aria-hidden="true">
        {Array.from(text, (char, index) =>
          char === " " ? (
            " "
          ) : (
            <span
              key={index}
              className={styles.dissolveChar}
              data-dissolve-at={(cellRevealHash01(index, seed) * GLYPH_GLITCH_THRESHOLD_MAX).toFixed(3)}
              data-dissolve-phase={cellRevealHash01(index, seed + 1) < 0.5 ? 0 : 1}
            >
              {char}
            </span>
          ),
        )}
      </span>
    </>
  );
});

const HeroDetailRevealContext = createContext({ offset: 0, total: 1, visible: true, immediate: true });

/** Additional hero lines share the entrance clock and the scroll dissolve. */
export function HeroDetailText({ text, seed, revealIndex }: { text: string; seed: number; revealIndex: number }) {
  const reveal = useContext(HeroDetailRevealContext);
  return <RevealLines as="span" className={styles.detailLine} text={text} measureLines={false}
    offset={reveal.offset + revealIndex} total={reveal.total} stepMs={HEADING_REVEAL_STEP_MS}
    visible={reveal.visible} immediate={reveal.immediate}
    renderToken={(token) => <DissolveText text={token} seed={seed} />} />;
}

function renderHeadingCopy(text: string, seed: number, mobileBreakBefore?: string) {
  const split = mobileBreakBefore ? text.indexOf(` ${mobileBreakBefore}`) : -1;
  if (split < 0) return <DissolveText text={text} seed={seed} />;
  return <>
    <DissolveText text={text.slice(0, split + 1)} seed={seed} />
    <br className={styles.headingMobileBreak} aria-hidden="true" />
    <DissolveText text={text.slice(split + 1)} seed={seed + 1} />
  </>;
}

/** Matched in `heroContent.statement` — interactive headline gag (see `renderHeadingToken`). */
const STUFF_GAG_WORD = "stuff";

/** Inline `getBoundingClientRect()` uses the full line box; this tracks glyph ink for portal centering. */
function getTextRunBoundingRect(element: HTMLElement): DOMRect {
  const first = element.firstChild;
  if (first?.nodeType === Node.TEXT_NODE) {
    const text = first.textContent ?? "";
    if (text.length > 0) {
      const range = document.createRange();
      range.setStart(first, 0);
      range.setEnd(first, text.length);
      const rects = range.getClientRects();
      let top = Infinity;
      let left = Infinity;
      let right = -Infinity;
      let bottom = -Infinity;
      for (let i = 0; i < rects.length; i++) {
        const rr = rects[i];
        if (rr.width === 0 && rr.height === 0) {
          continue;
        }
        top = Math.min(top, rr.top);
        left = Math.min(left, rr.left);
        right = Math.max(right, rr.right);
        bottom = Math.max(bottom, rr.bottom);
      }
      if (top !== Infinity && right > left && bottom > top) {
        return new DOMRect(left, top, right - left, bottom - top);
      }
    }
  }

  return element.getBoundingClientRect();
}

type HoverAccent = "default" | "web" | "creative";

type HeroContent = {
  name: string;
  position: string;
  statement: string;
  description?: string;
  ctaLine?: string;
};

type HeroSectionProps = {
  content: HeroContent;
  introClassName?: string;
  ctaClassName?: string;
  ctaAdornment?: ReactNode;
  supportingContent?: ReactNode;
  supportingLineCount?: number;
  mobileHeadingBreakBefore?: string;
  asciiInteraction?: { expanded: boolean; onToggle: () => void };
};

export function HeroSection({ content, introClassName, ctaClassName, ctaAdornment, supportingContent, supportingLineCount = 0, mobileHeadingBreakBefore, asciiInteraction }: HeroSectionProps) {
  const introRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLParagraphElement>(null);
  const contentRevealGateRef = useRef<HTMLDivElement>(null);
  const stuffAnchorRef = useRef<HTMLSpanElement | null>(null);
  const strikeLineRef = useRef<HTMLSpanElement | null>(null);
  const stuffGlyphRef = useRef<HTMLSpanElement | null>(null);
  const shitPortalRef = useRef<HTMLSpanElement | null>(null);
  const gagPrevActiveRef = useRef(false);
  const gagActiveRef = useRef(false);
  const gagTransitionTokenRef = useRef(0);
  const gagEnterRafIdsRef = useRef<Set<number>>(new Set());
  const [hoverAccent, setHoverAccent] = useState<HoverAccent | null>(null);
  const [asciiTileCount, setAsciiTileCount] = useState(1);
  const [asciiTileStepPx, setAsciiTileStepPx] = useState(0);
  const [stuffGagMobileActive, setStuffGagMobileActive] = useState(false);
  const [stuffGagHover, setStuffGagHover] = useState(false);
  /** Viewport center + em base (px) from the real “stuff” glyph so the portaled word tracks type scale on any screen. */
  const [shitPortalLayout, setShitPortalLayout] = useState<{
    x: number;
    y: number;
    emBasePx: number;
  } | null>(null);
  const [portalHoldOpen, setPortalHoldOpen] = useState(false);
  const [frameFolder, setFrameFolder] = useState(getInitialFrameFolder);
  const preloaderComplete = usePreloaderComplete();
  const revealMotionEnabled = useRevealMotionEnabled();
  const skipRepeatReveal = useSyncExternalStore(
    subscribeHomeHeroRevealDone,
    getHomeHeroRevealDone,
    () => false,
  );

  /** Back/forward to `/`: skip long hero choreography so restoring scroll reads as instant. */
  const historyScrollRevealBypass = useRestoredScrollBypass();
  const bypassHeroReplay =
    skipRepeatReveal || historyScrollRevealBypass || !revealMotionEnabled;

  const heroContentRevealVisible = useRevealOnView(contentRevealGateRef);
  const setHeroCtaAligned = useOptionalHeroRevealTimeline()?.setCtaAligned;

  const coarsePointer = useSyncExternalStore(
    subscribeCoarsePointer,
    getCoarsePointerSnapshot,
    getServerCoarsePointerSnapshot,
  );

  /** Compact layouts show the walker without requiring a hover. */
  const walkerParked = useSyncExternalStore(
    subscribeWalkerParked,
    getWalkerParkedSnapshot,
    getServerWalkerParkedSnapshot,
  );
  const touchLayout = coarsePointer || walkerParked;
  const mobileLayout = useSyncExternalStore(subscribeMobileHero, getMobileHeroSnapshot, getServerCoarsePointerSnapshot);

  /** Keep the ASCII's right edge on Archive's rail after fonts and viewport changes. */
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const archive = document.querySelector<HTMLElement>('nav a[href="/archive"]');
    if (!stage || !archive) return;
    let disposed = false;
    const align = () => {
      if (disposed || archive.getClientRects().length === 0) return;
      stage.style.setProperty("--hero-ascii-rail-right", `${Math.max(0, stage.getBoundingClientRect().right - archive.getBoundingClientRect().right)}px`);
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(stage);
    observer.observe(archive);
    window.addEventListener("resize", align);
    void document.fonts.ready.then(align);
    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("resize", align);
      stage.style.removeProperty("--hero-ascii-rail-right");
    };
  }, []);

  // Anchor the desktop portrait at the top right; mobile keeps one centered, full-screen figure.
  const hasAsciiInteraction = Boolean(asciiInteraction);
  useLayoutEffect(() => {
    if (!hasAsciiInteraction) return;
    const stage = stageRef.current;
    const drawing = stage?.querySelector<HTMLElement>("[data-hero-visual] > div");
    if (!stage || !drawing) return;
    const measure = () => {
      const mobile = window.innerWidth <= 768;
      const frame = drawing.querySelector("pre");
      if (mobile && frame?.offsetWidth && frame.offsetHeight) {
        const glyphs = Array.from(document.querySelectorAll<HTMLElement>('[aria-label="Project grid layout"] [data-variant]'))
          .map((glyph) => glyph.getBoundingClientRect()).filter((rect) => rect.width > 0);
        if (glyphs.length) {
          const span = Math.max(...glyphs.map((rect) => rect.right)) - Math.min(...glyphs.map((rect) => rect.left));
          const width = span / (touchLayout ? WALKER_COARSE_SCALE : 1);
          stage.style.setProperty("--hero-mobile-ascii-width", `${width}px`);
          stage.style.setProperty("--hero-mobile-ascii-height", `${width * frame.offsetHeight / frame.offsetWidth}px`);
        }
      }
      const height = drawing.offsetHeight;
      if (!height) return;
      const stageBounds = stage.getBoundingClientRect();
      const stagePageTop = stageBounds.top + window.scrollY;
      const frameScale = frame ? Math.abs(new DOMMatrixReadOnly(getComputedStyle(frame).transform).a) : 1;
      const mobileBottomGap = parseFloat(getComputedStyle(stage).getPropertyValue("--hero-mobile-ascii-bottom-gap"));
      if (mobile && Number.isFinite(mobileBottomGap)) {
        // Anchor the visible artwork to the hero bottom, independent of the text height.
        const frameHeight = frame ? frame.offsetHeight * frameScale : height;
        const inset = (height - frameHeight) / 2;
        stage.style.setProperty("--hero-mobile-ascii-bottom", `${mobileBottomGap - inset}px`);
      }
      if (mobile && frame) {
        const selector = document.querySelector<HTMLElement>('[aria-label="Project grid layout"] [data-layout="regular"] [data-variant]');
        if (selector) {
          const frameWidth = frame.offsetWidth * frameScale;
          const right = stageBounds.right - selector.getBoundingClientRect().right - (drawing.offsetWidth - frameWidth) / 2;
          stage.style.setProperty("--hero-mobile-ascii-right", `${right}px`);
        }
      } else if (frame) {
        const archive = document.querySelector<HTMLElement>('nav a[href="/archive"]');
        if (archive && archive.getClientRects().length > 0) {
          const frameWidth = frame.offsetWidth * frameScale;
          const right = stageBounds.right - archive.getBoundingClientRect().right - (drawing.offsetWidth - frameWidth) / 2;
          stage.style.setProperty("--hero-compact-ascii-right", `${right}px`);
        }
      }
      const aspect = frame?.offsetHeight ? frame.offsetWidth / frame.offsetHeight : 0.55;
      const expandedHeight = window.innerHeight * 1.08;
      // Bleed past the viewport rather than stopping on the inset content rail.
      const expandedRight = window.innerWidth - stageBounds.left + 64;
      const centerX = mobile ? stage.clientWidth * 0.5 : expandedRight - expandedHeight * aspect / 2;
      const centerY = (mobile ? window.innerHeight : expandedHeight) * 0.5 - stagePageTop;
      const restingScale = touchLayout ? WALKER_COARSE_SCALE : 1;
      stage.style.setProperty("--ascii-background-scale", String(expandedHeight / (height * restingScale)));
      stage.style.setProperty("--ascii-background-x", `${centerX - drawing.offsetLeft - drawing.offsetWidth / 2}px`);
      stage.style.setProperty("--ascii-background-y", `${centerY - drawing.offsetTop - height / 2}px`);
      // Keep the cluster in the right half, with a small incursion into the copy.
      const expandedWidth = expandedHeight * aspect;
      const clusterLeft = stage.clientWidth * 0.5 - Math.min(48, stage.clientWidth * 0.04);
      const tileCount = mobile ? 1 : Math.max(1, Math.ceil((expandedRight - clusterLeft) / expandedWidth));
      // Translation follows the frame's own scale, so use its unscaled width, not a viewport-derived gap.
      const stepPx = -(frame ? parseFloat(getComputedStyle(frame).width) || frame.offsetWidth : 0);
      setAsciiTileCount((current) => current === tileCount ? current : tileCount);
      setAsciiTileStepPx((current) => current === stepPx ? current : stepPx);
      stage.dataset.asciiTileCount = String(tileCount);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(drawing);
    const projectSelector = document.querySelector('[aria-label="Project grid layout"]');
    if (projectSelector) observer.observe(projectSelector);
    if (contentRevealGateRef.current) observer.observe(contentRevealGateRef.current);
    const frameStyleObserver = new MutationObserver(measure);
    const watchFrame = () => {
      const frame = drawing.querySelector("pre");
      if (frame) {
        observer.observe(frame);
        frameStyleObserver.observe(frame, { attributes: true, attributeFilter: ["style"] });
      }
      measure();
    };
    // Frames load after the compact container mounts; watch only their insertion and scale.
    const frameMountObserver = new MutationObserver(watchFrame);
    const animationRoot = drawing.firstElementChild;
    if (animationRoot) frameMountObserver.observe(animationRoot, { childList: true });
    watchFrame();
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      frameMountObserver.disconnect();
      frameStyleObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [hasAsciiInteraction, touchLayout, asciiInteraction?.expanded, preloaderComplete]);

  /** Fine pointers: hover only (no focus / no click-to-hold). Coarse: tap toggle. */
  const gagActive = coarsePointer ? stuffGagMobileActive : stuffGagHover;
  const showGagPortalLayer = gagActive || portalHoldOpen;
  const portalMounted = typeof document !== "undefined";

  const cancelPendingGagEnterFrames = useCallback(() => {
    gagEnterRafIdsRef.current.forEach((id) => {
      cancelAnimationFrame(id);
    });
    gagEnterRafIdsRef.current.clear();
  }, []);

  const scheduleGagEnterFrame = useCallback((callback: () => void) => {
    const id = requestAnimationFrame(() => {
      gagEnterRafIdsRef.current.delete(id);
      callback();
    });
    gagEnterRafIdsRef.current.add(id);
    return id;
  }, []);

  useEffect(() => {
    gagActiveRef.current = gagActive;
  }, [gagActive]);

  useEffect(() => {
    const strikeLine = strikeLineRef.current;
    const stuffGlyph = stuffGlyphRef.current;
    const shitPortal = shitPortalRef.current;

    return () => {
      cancelPendingGagEnterFrames();
      gsap.killTweensOf([strikeLine, stuffGlyph, shitPortal].filter(Boolean));
    };
  }, [cancelPendingGagEnterFrames]);

  /** Portal tracking only while the gag layer is shown — otherwise every scroll re-rendered the hero. */
  useLayoutEffect(() => {
    const anchor = stuffAnchorRef.current;
    if (!anchor || !showGagPortalLayer) {
      return;
    }

    const update = () => {
      const glyph = stuffGlyphRef.current;
      const boxEl = glyph ?? anchor;
      const r = glyph ? getTextRunBoundingRect(glyph) : boxEl.getBoundingClientRect();
      const fontSizePx = glyph
        ? parseFloat(getComputedStyle(glyph).fontSize)
        : parseFloat(getComputedStyle(boxEl).fontSize);
      const emBasePx = Number.isFinite(fontSizePx) && fontSizePx > 0 ? fontSizePx : r.height * 0.72;

      const next = { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5, emBasePx };
      setShitPortalLayout((current) =>
        current &&
        Math.abs(current.x - next.x) < 0.25 &&
        Math.abs(current.y - next.y) < 0.25 &&
        Math.abs(current.emBasePx - next.emBasePx) < 0.25
          ? current
          : next,
      );
    };

    update();
    const raf = requestAnimationFrame(() => {
      update();
    });

    const lenis = getLenis();
    const unsubscribeLenis = lenis?.on("scroll", update);

    window.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);

    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);

    const ro = new ResizeObserver(update);
    ro.observe(anchor);
    const glyphEl = stuffGlyphRef.current;
    if (glyphEl) {
      ro.observe(glyphEl);
    }

    return () => {
      cancelAnimationFrame(raf);
      unsubscribeLenis?.();
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [content.statement, gagActive, showGagPortalLayer]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wasActive = gagPrevActiveRef.current;

    if (gagActive && !wasActive) {
      gagPrevActiveRef.current = true;
      cancelPendingGagEnterFrames();
      const transitionToken = ++gagTransitionTokenRef.current;

      gsap.killTweensOf(
        [strikeLineRef.current, stuffGlyphRef.current, shitPortalRef.current].filter(Boolean),
      );

      const runEnter = (attempt = 0) => {
        if (gagTransitionTokenRef.current !== transitionToken || !gagActiveRef.current) {
          return;
        }

        const s = strikeLineRef.current;
        const g = stuffGlyphRef.current;
        const h = shitPortalRef.current;
        if (!s || !g) {
          return;
        }

        if (!h && attempt < 14) {
          scheduleGagEnterFrame(() => runEnter(attempt + 1));
          return;
        }

        if (reducedMotion) {
          gsap.set(s, { scaleX: 1 });
          gsap.set(g, { opacity: 0.35 });
          if (h) {
            gsap.set(h, { autoAlpha: 1 });
          }
          return;
        }

        gsap.set(s, { scaleX: 0, transformOrigin: "left center" });
        gsap.set(g, { opacity: 1 });
        if (h) {
          gsap.set(h, { autoAlpha: 0 });
        }

        /* Snappy UI window (<300ms): strong ease-out, strike leads by a hair so motion reads first */
        const strikeMs = 0.16;
        const followMs = 0.14;
        const easeOut = "power3.out";

        const tl = gsap.timeline();
        tl.to(
          s,
          {
            scaleX: 1,
            duration: strikeMs,
            ease: easeOut,
          },
          0,
        );
        tl.to(
          g,
          {
            opacity: 0.35,
            duration: followMs,
            ease: easeOut,
          },
          0.02,
        );
        if (h) {
          /* Opacity only — scaling pixel type causes subpixel shimmer (“jitter”) */
          tl.to(
            h,
            {
              autoAlpha: 1,
              duration: followMs,
              ease: easeOut,
            },
            0.03,
          );
        }
      };

      scheduleGagEnterFrame(() => {
        scheduleGagEnterFrame(() => runEnter(0));
      });
      return;
    }

    if (!gagActive && wasActive) {
      gagPrevActiveRef.current = false;
      cancelPendingGagEnterFrames();
      const transitionToken = ++gagTransitionTokenRef.current;

      const s = strikeLineRef.current;
      const g = stuffGlyphRef.current;
      const h = shitPortalRef.current;

      gsap.killTweensOf([s, g, h].filter(Boolean));

      if (!s) {
        return;
      }

      if (reducedMotion) {
        gsap.set(s, { scaleX: 0 });
        if (g) gsap.set(g, { opacity: 1 });
        if (h) gsap.set(h, { autoAlpha: 0 });
        scheduleGagEnterFrame(() => {
          if (gagTransitionTokenRef.current === transitionToken && !gagActiveRef.current) {
            setPortalHoldOpen(false);
          }
        });
        return;
      }

      const strikeMs = 0.14;
      const followMs = 0.12;
      const easeOut = "power3.out";
      const tl = gsap.timeline({
        onComplete: () => {
          if (gagTransitionTokenRef.current === transitionToken && !gagActiveRef.current) {
            setPortalHoldOpen(false);
          }
        },
      });

      tl.to(
        s,
        {
          scaleX: 0,
          duration: strikeMs,
          ease: easeOut,
          transformOrigin: "left center",
        },
        0,
      );
      if (g) {
        tl.to(
          g,
          {
            opacity: 1,
            duration: followMs,
            ease: easeOut,
          },
          0,
        );
      }
      if (h) {
        tl.to(
          h,
          {
            autoAlpha: 0,
            duration: followMs,
            ease: easeOut,
          },
          0,
        );
      }
    }

    return undefined;
  }, [cancelPendingGagEnterFrames, gagActive, scheduleGagEnterFrame]);

  /** Coarse pointers: dismiss the gag on any tap outside “stuff”, or when “stuff” scrolls out of view. */
  useEffect(() => {
    if (!coarsePointer || !stuffGagMobileActive) {
      return undefined;
    }

    const onDocumentClickCapture = (event: MouseEvent) => {
      const anchor = stuffAnchorRef.current;
      const target = event.target;
      if (!anchor || !(target instanceof Node)) {
        return;
      }
      if (anchor.contains(target)) {
        return;
      }
      setStuffGagMobileActive(false);
    };

    document.addEventListener("click", onDocumentClickCapture, true);

    return () => {
      document.removeEventListener("click", onDocumentClickCapture, true);
    };
  }, [coarsePointer, stuffGagMobileActive]);

  useEffect(() => {
    if (!coarsePointer || !stuffGagMobileActive) {
      return undefined;
    }

    const anchor = stuffAnchorRef.current;
    if (!anchor) {
      return undefined;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setStuffGagMobileActive(false);
        }
      },
      { root: null, threshold: 0 },
    );

    io.observe(anchor);

    return () => {
      io.disconnect();
    };
  }, [coarsePointer, stuffGagMobileActive]);

  const handleStuffPointerEnter = useCallback(() => {
    if (!coarsePointer) {
      setPortalHoldOpen(true);
      setStuffGagHover(true);
    }
  }, [coarsePointer]);

  const handleStuffPointerLeave = useCallback(() => {
    if (!coarsePointer) {
      setStuffGagHover(false);
    }
  }, [coarsePointer]);

  const toggleStuffGagMobile = useCallback(() => {
    setStuffGagMobileActive((value) => {
      const nextValue = !value;
      if (nextValue) {
        setPortalHoldOpen(true);
      }
      return nextValue;
    });
  }, []);

  const introText = content.position;
  // One line on phones too: the role is a label above the two-line headline, not a second headline.
  const introLines = usePretextLines(introText, introRef, "pre-wrap", true, {
    preserveNaturalWrappingMedia: MOBILE_HERO_QUERY,
  });
  const headingText = mobileLayout && mobileHeadingBreakBefore
    ? content.statement.replace(` ${mobileHeadingBreakBefore}`, `\n${mobileHeadingBreakBefore}`)
    : content.statement;
  // Mobile keeps explicit phrase breaks; desktop still measures its real wrapped lines.
  const headingLines = usePretextLines(headingText, headingRef, "pre-wrap", true, {
    preserveNaturalWrappingMedia: MOBILE_HERO_QUERY,
  });
  const descriptionText = content.description ?? "";
  const descriptionLines = usePretextLines(descriptionText, descriptionRef, "pre-wrap", Boolean(descriptionText));
  const descriptionLineCount = descriptionText ? descriptionLines.length : 0;

  const ctaTextUpper = useMemo(
    () => content.ctaLine?.trim().toUpperCase() ?? "",
    [content.ctaLine],
  );
  const hasCta = ctaTextUpper.length > 0;
  const ctaLines = useMemo(() => (hasCta ? [ctaTextUpper] : []), [hasCta, ctaTextUpper]);

  const supportingOffset = introLines.length + headingLines.length + descriptionLineCount + ctaLines.length;
  const sequenceTotal = supportingOffset + supportingLineCount;
  const detailReveal = useMemo(() => ({
    offset: supportingOffset,
    total: sequenceTotal,
    visible: bypassHeroReplay || heroContentRevealVisible,
    immediate: bypassHeroReplay,
  }), [supportingOffset, sequenceTotal, bypassHeroReplay, heroContentRevealVisible]);
  const walkerRevealed = preloaderComplete && (bypassHeroReplay || heroContentRevealVisible);
  /**
   * Touch: the walker sits alongside the details, so it waits for the line cascade instead of appearing with
   * line one — it starts once the last line is ~93% in (half its settle on `--ease-reveal`).
   */
  const [walkerIntroReady, setWalkerIntroReady] = useState(false);
  const walkerIntroDelayMs =
    Math.max(0, sequenceTotal - 1) * HEADING_REVEAL_STEP_MS + Math.round(REVEAL_TRANSFORM_SETTLE_MS * 0.5);
  const walkerWaitsForText = touchLayout && !bypassHeroReplay;

  useEffect(() => {
    if (!walkerWaitsForText || !walkerRevealed || walkerIntroReady) {
      return undefined;
    }
    const timeoutId = window.setTimeout(
      () => setWalkerIntroReady(true),
      Math.round(walkerIntroDelayMs * heroTempo()),
    );
    return () => window.clearTimeout(timeoutId);
  }, [walkerWaitsForText, walkerRevealed, walkerIntroReady, walkerIntroDelayMs]);

  /** Desktop hover and the mobile intro slot use the same randomized ASCII visibility reveal. */
  const walkerActive =
    walkerRevealed &&
    (!walkerWaitsForText || walkerIntroReady) &&
    (touchLayout || Boolean(hoverAccent));
  const walkerRevealPlayedInPreloader =
    coarsePointer &&
    preloaderComplete &&
    typeof document !== "undefined" &&
    document.documentElement.dataset.preloaderAsciiRevealed === "true";

  /**
   * Scroll-out: each line drops glyphs in random order as it rises, top lines first; hovering or focusing a
   * live control glitches its glyphs back. Layout is read only when it changes; per frame this is plain math
   * over ~160 glyphs plus attribute flips on the few whose state changed.
   */
  useEffect(() => {
    const root = contentRevealGateRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    type Glyph = {
      el: HTMLElement;
      line: number;
      controls: number[];
      threshold: number;
      phase: number;
      shown: boolean | null;
    };

    const coarseQuery = window.matchMedia(COARSE_POINTER_QUERY);
    let rafId = 0;
    let glyphs: Glyph[] = [];
    let controls: HTMLElement[] = [];
    let lineStarts: number[] = [];
    let lineVisibility = new Float64Array(0);
    let restore = new Float64Array(0);
    let restoreTarget = new Float64Array(0);
    let range = 1;
    let lastFrame = 0;
    let restoring = false;

    const measure = () => {
      const lines = Array.from(root.querySelectorAll<HTMLElement>('[data-mode="lines"] > span, [data-dissolve-line]'));
      // Restore semantic blocks, including every wrapped line and nested control in that block.
      controls = Array.from(root.querySelectorAll<HTMLElement>('[data-mode="lines"], [data-dissolve-block]'));
      restore = new Float64Array(controls.length);
      restoreTarget = new Float64Array(controls.length);

      const viewport = window.innerHeight;
      const delay =
        viewport *
        (coarseQuery.matches ? TEXT_DISSOLVE_DELAY_VIEWPORT : TEXT_DISSOLVE_DELAY_VIEWPORT_FINE);
      const lead = viewport * TEXT_DISSOLVE_LEAD_VIEWPORT;
      range = viewport * TEXT_DISSOLVE_RANGE_VIEWPORT;
      // Offsets relative to the first line don't depend on scroll position.
      const tops = lines.map((line) => line.getBoundingClientRect().top);
      lineStarts = tops.map((top) => delay + Math.max(0, top - (tops[0] ?? 0) - lead));
      lineVisibility = new Float64Array(lines.length);

      glyphs = [];
      lines.forEach((line, lineIndex) => {
        line.querySelectorAll<HTMLElement>("[data-dissolve-at]").forEach((el) => {
          glyphs.push({
            el,
            line: lineIndex,
            controls: controls.flatMap((control, index) => control.contains(el) ? [index] : []),
            threshold: Number(el.dataset.dissolveAt),
            phase: Number(el.dataset.dissolvePhase) || 0,
            shown: el.hasAttribute("data-dissolve-off") ? false : null,
          });
        });
      });
    };

    const render = (now: number) => {
      rafId = 0;
      const scrollY = window.scrollY;

      for (let index = 0; index < lineStarts.length; index += 1) {
        const raw = 1 - Math.min(1, Math.max(0, (scrollY - lineStarts[index]) / range));
        lineVisibility[index] = Math.round(raw * GLYPH_GLITCH_STEPS) / GLYPH_GLITCH_STEPS;
      }

      const step = lastFrame ? Math.min(1, (now - lastFrame) / TEXT_RESTORE_MS) : 0;
      lastFrame = now;
      restoring = false;
      for (let index = 0; index < restore.length; index += 1) {
        const target = restoreTarget[index];
        const current = restore[index];
        if (current !== target) {
          restore[index] =
            target > current ? Math.min(target, current + step) : Math.max(target, current - step);
          restoring ||= restore[index] !== target;
        }
      }

      for (const glyph of glyphs) {
        let visibility = lineVisibility[glyph.line];
        for (const index of glyph.controls) visibility = Math.max(visibility, restore[index]);
        const shown = isGlyphShown(visibility, glyph.threshold, glyph.phase);
        if (shown !== glyph.shown) {
          glyph.shown = shown;
          glyph.el.toggleAttribute("data-dissolve-off", !shown);
        }
      }

      if (restoring) {
        rafId = window.requestAnimationFrame(render);
      } else {
        lastFrame = 0;
      }
    };

    const schedule = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(render);
      }
    };

    const remeasure = () => {
      measure();
      schedule();
    };

    const setRestore = (target: EventTarget | null, value: number, related: EventTarget | null = null) => {
      if (!(target instanceof Node)) return;
      let changed = false;
      controls.forEach((control, index) => {
        if (!control.contains(target) || (related instanceof Node && control.contains(related))) return;
        if (restoreTarget[index] !== value) {
          restoreTarget[index] = value;
          changed = true;
        }
      });
      if (changed) schedule();
    };
    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === "mouse") {
        setRestore(event.target, 1);
      }
    };
    const onPointerOut = (event: PointerEvent) => {
      if (event.pointerType === "mouse") setRestore(event.target, 0, event.relatedTarget);
    };
    const onFocusIn = (event: FocusEvent) => {
      if ((event.target as Element).matches?.(KEYBOARD_FOCUS_SELECTOR)) {
        setRestore(event.target, 1);
      }
    };
    const onFocusOut = (event: FocusEvent) => {
      setRestore(event.target, 0, event.relatedTarget);
    };

    measure();
    render(performance.now());
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    coarseQuery.addEventListener("change", remeasure);
    root.addEventListener("pointerover", onPointerOver);
    root.addEventListener("pointerout", onPointerOut);
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    const ro = new ResizeObserver(remeasure);
    ro.observe(root);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
      coarseQuery.removeEventListener("change", remeasure);
      root.removeEventListener("pointerover", onPointerOver);
      root.removeEventListener("pointerout", onPointerOut);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      ro.disconnect();
      glyphs.forEach((glyph) => glyph.el.removeAttribute("data-dissolve-off"));
    };
  }, [introLines, headingLines, descriptionLines, supportingContent]);

  useLayoutEffect(() => {
    if (!preloaderComplete || !bypassHeroReplay) {
      return;
    }

    document.documentElement.setAttribute("data-hero-reveal", "complete");
  }, [preloaderComplete, bypassHeroReplay]);

  useEffect(() => {
    const html = document.documentElement;

    if (!preloaderComplete) {
      html.setAttribute("data-hero-reveal", "pending");
      return () => {
        html.setAttribute("data-hero-reveal", "pending");
      };
    }

    if (bypassHeroReplay) {
      html.setAttribute("data-hero-reveal", "complete");
      return () => {
        html.setAttribute("data-hero-reveal", "pending");
      };
    }

    html.setAttribute("data-hero-reveal", "pending");

    const introEndMs =
      (introLines.length > 0 ? (introLines.length - 1) * INTRO_REVEAL_STEP_MS : 0)
      + REVEAL_TRANSFORM_SETTLE_MS;
    const headingEndMs =
      (headingLines.length > 0
        ? (introLines.length + headingLines.length - 1) * HEADING_REVEAL_STEP_MS
        : 0) + REVEAL_TRANSFORM_SETTLE_MS;
    const descriptionEndMs = descriptionLineCount > 0
      ? (introLines.length + headingLines.length + descriptionLineCount - 1) * HEADING_REVEAL_STEP_MS + REVEAL_TRANSFORM_SETTLE_MS
      : 0;
    const lastLineEndMs =
      sequenceTotal > 0
        ? (sequenceTotal - 1) * HEADING_REVEAL_STEP_MS + REVEAL_TRANSFORM_SETTLE_MS
        : 0;
    const revealCompleteMs = Math.round(Math.max(introEndMs, headingEndMs, descriptionEndMs, lastLineEndMs) * heroTempo());

    const timeoutId = window.setTimeout(() => {
      html.setAttribute("data-hero-reveal", "complete");
      setHomeHeroRevealDone();
    }, revealCompleteMs);

    return () => {
      window.clearTimeout(timeoutId);
      html.setAttribute("data-hero-reveal", "pending");
    };
  }, [
    bypassHeroReplay,
    ctaLines.length,
    descriptionLineCount,
    hasCta,
    headingLines.length,
    introLines.length,
    preloaderComplete,
    sequenceTotal,
  ]);

  /** Hand off to Work as the hero's details enter, overlapping their settling motion. */
  useLayoutEffect(() => {
    if (!setHeroCtaAligned) {
      return undefined;
    }

    if (!preloaderComplete) {
      setHeroCtaAligned(false);
      return () => setHeroCtaAligned(false);
    }

    if (bypassHeroReplay) {
      setHeroCtaAligned(true);
      return () => setHeroCtaAligned(false);
    }

    const gate = contentRevealGateRef.current;
    /** Hero replay + scroll restored below the fold (e.g. back from a project): IO never intersects hero, but Work must not stay opacity-gated forever. */
    const scrolledPastHero = gate !== null && gate.getBoundingClientRect().bottom < 0;

    if (!heroContentRevealVisible) {
      if (scrolledPastHero) {
        setHeroCtaAligned(true);
        return () => setHeroCtaAligned(false);
      }

      setHeroCtaAligned(false);
      return () => setHeroCtaAligned(false);
    }

    // Let peeking projects enter with the first detail value, overlapping the last hero lines.
    const ctaPhaseStartMs = hasCta
      ? Math.round((supportingOffset - ctaLines.length + Math.min(2, supportingLineCount)) * HEADING_REVEAL_STEP_MS * heroTempo())
      : 0;

    const timeoutId = window.setTimeout(() => {
      setHeroCtaAligned(true);
    }, ctaPhaseStartMs);

    return () => {
      window.clearTimeout(timeoutId);
      setHeroCtaAligned(false);
    };
  }, [
    bypassHeroReplay,
    setHeroCtaAligned,
    preloaderComplete,
    heroContentRevealVisible,
    hasCta,
    descriptionLineCount,
    headingLines.length,
    introLines.length,
    supportingOffset,
    supportingLineCount,
    ctaLines.length,
  ]);

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

  const handleHeroPointerEnter = useCallback(() => {
    setHoverAccent((current) => current ?? "default");
  }, []);

  const handleHeroPointerLeave = useCallback(() => {
    setHoverAccent(null);
  }, []);

  const handleDefaultAccent = useCallback(() => {
    setHoverAccent("default");
  }, []);

  const handleWebAccent = useCallback(() => {
    setHoverAccent("web");
  }, []);

  const handleCreativeAccent = useCallback(() => {
    setHoverAccent("creative");
  }, []);

  const renderIntroToken = useCallback(
    (token: string) => {
      const webIndex = token.indexOf(INDEPENDENT_DEVELOPER_PHRASE);
      const creativeIndex = token.indexOf(CREATIVE_TECHNOLOGIST_PHRASE);
      const hasWebPhrase = webIndex !== -1;
      const hasCreativePhrase = creativeIndex !== -1;

      if (!hasWebPhrase && !hasCreativePhrase) {
        return dissolve(token, 0);
      }

      /** Only one phrase matched — avoid rendering the full token twice (bug when casing drifted). */
      if (hasWebPhrase && !hasCreativePhrase) {
        return (
          <>
            {dissolve(token.slice(0, webIndex), 0)}
            <span
              data-hero-role="developer"
              className={`${styles.introAccentTrigger} ${styles.introAccentTriggerWeb}`}
              data-dissolve-control=""
              onPointerEnter={handleWebAccent}
              onPointerLeave={handleDefaultAccent}
            >
              <span className={styles.introPixelSquare}>
                {dissolve(INDEPENDENT_DEVELOPER_PHRASE, 1)}
              </span>
            </span>
            {dissolve(token.slice(webIndex + INDEPENDENT_DEVELOPER_PHRASE.length), 2)}
          </>
        );
      }

      if (!hasWebPhrase && hasCreativePhrase) {
        return (
          <>
            {dissolve(token.slice(0, creativeIndex), 0)}
            <span
              data-hero-role="creative"
              className={`${styles.introAccentTrigger} ${styles.introAccentTriggerCreative}`}
              data-dissolve-control=""
              onPointerEnter={handleCreativeAccent}
              onPointerLeave={handleDefaultAccent}
            >
              {dissolve(CREATIVE_TECHNOLOGIST_PHRASE, 3)}
            </span>
            {dissolve(token.slice(creativeIndex + CREATIVE_TECHNOLOGIST_PHRASE.length), 4)}
          </>
        );
      }

      const afterWeb = token.slice(webIndex + INDEPENDENT_DEVELOPER_PHRASE.length);
      const relCreative = afterWeb.indexOf(CREATIVE_TECHNOLOGIST_PHRASE);
      const beforeCreative = relCreative === -1 ? afterWeb : afterWeb.slice(0, relCreative);
      const afterCreative =
        relCreative === -1
          ? ""
          : afterWeb.slice(relCreative + CREATIVE_TECHNOLOGIST_PHRASE.length);

      return (
        <>
          {dissolve(token.slice(0, webIndex), 0)}
          <span
            data-hero-role="developer"
            className={`${styles.introAccentTrigger} ${styles.introAccentTriggerWeb}`}
            data-dissolve-control=""
            onPointerEnter={handleWebAccent}
            onPointerLeave={handleDefaultAccent}
          >
            <span className={styles.introPixelSquare}>
              {dissolve(INDEPENDENT_DEVELOPER_PHRASE, 1)}
            </span>
          </span>
          {" "}
          {dissolve(beforeCreative.trimStart(), 2)}
          <span
            data-hero-role="creative"
            className={`${styles.introAccentTrigger} ${styles.introAccentTriggerCreative}`}
            data-dissolve-control=""
            onPointerEnter={handleCreativeAccent}
            onPointerLeave={handleDefaultAccent}
          >
            {dissolve(CREATIVE_TECHNOLOGIST_PHRASE, 3)}
          </span>
          {dissolve(afterCreative, 4)}
        </>
      );
    },
    [handleCreativeAccent, handleDefaultAccent, handleWebAccent],
  );

  const renderHeadingToken = useCallback(
    (token: string, tokenIndex: number) => {
      if (!token.includes(STUFF_GAG_WORD)) {
        return renderHeadingCopy(token, HEADING_DISSOLVE_SEED + tokenIndex * 8, mobileHeadingBreakBefore);
      }

      const segments = token.split(new RegExp(`(${STUFF_GAG_WORD})`, "g"));
      return segments.map((segment, i) => {
        if (segment === STUFF_GAG_WORD) {
          return (
            <span
              key={`stuff-gag-${tokenIndex}-${i}`}
              ref={stuffAnchorRef}
              role="button"
              tabIndex={coarsePointer ? 0 : -1}
              className={styles.stuffGag}
              data-dissolve-control=""
              data-active={stuffGagMobileActive ? "true" : "false"}
              data-gag-open={gagActive ? "true" : "false"}
              aria-label="Alternate emphasis for “stuff”"
              aria-pressed={coarsePointer ? stuffGagMobileActive : undefined}
              onPointerEnter={handleStuffPointerEnter}
              onPointerLeave={handleStuffPointerLeave}
              onClick={() => {
                if (typeof window !== "undefined" && window.matchMedia(COARSE_POINTER_QUERY).matches) {
                  toggleStuffGagMobile();
                }
              }}
              onKeyDown={(event) => {
                if (typeof window === "undefined" || !window.matchMedia(COARSE_POINTER_QUERY).matches) {
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleStuffGagMobile();
                }
              }}
            >
              <span
                className={`${styles.stuffSurface} ${styles.dissolveChar}`}
                data-dissolve-at="0.5"
                data-dissolve-phase={0}
              >
                <span ref={strikeLineRef} className={styles.stuffStrikeLine} aria-hidden="true" />
                <span ref={stuffGlyphRef} className={styles.stuffGlyph}>
                  {STUFF_GAG_WORD}
                </span>
              </span>
            </span>
          );
        }

        return (
          <Fragment key={`stuff-seg-${tokenIndex}-${i}`}>
            {segment ? (
              renderHeadingCopy(segment, HEADING_DISSOLVE_SEED + tokenIndex * 8 + i, mobileHeadingBreakBefore)
            ) : null}
          </Fragment>
        );
      });
    },
    [
      coarsePointer,
      mobileHeadingBreakBefore,
      gagActive,
      handleStuffPointerEnter,
      handleStuffPointerLeave,
      stuffGagMobileActive,
      toggleStuffGagMobile,
    ],
  );

  const renderCtaToken = useCallback((token: string) => {
    return (
      <a
        href="#contact"
        className={["link-underline", styles.heroCtaLink, ctaClassName].filter(Boolean).join(" ")}
        data-dissolve-control=""
      >
        {ctaAdornment}
        {ctaAdornment ? (
          <span data-hero-cta-label=""><DissolveText text={token} seed={CTA_DISSOLVE_SEED} /></span>
        ) : <DissolveText text={token} seed={CTA_DISSOLVE_SEED} />}
      </a>
    );
  }, [ctaClassName, ctaAdornment]);
  const renderDescriptionToken = useCallback((token: string, tokenIndex: number) => (
    <DissolveText text={token} seed={DESCRIPTION_DISSOLVE_SEED + tokenIndex * 8} />
  ), []);

  return (
    <section
      id="hero"
      className={styles.section}
      onPointerEnter={handleHeroPointerEnter}
      onPointerLeave={handleHeroPointerLeave}
    >
      <div className={`page-shell ${styles.inner}`}>
        <div ref={stageRef} className={styles.stage} data-hero-stage="">
          <div ref={contentRevealGateRef} className={styles.content} data-hero-content="">
            <RevealLines
              elementRef={introRef}
              as="p"
              className={[styles.intro, introClassName].filter(Boolean).join(" ")}
              text={introText}
              lines={introLines}
              offset={0}
              total={sequenceTotal}
              stepMs={INTRO_REVEAL_STEP_MS}
              renderToken={renderIntroToken}
              immediate={bypassHeroReplay}
              visible={bypassHeroReplay ? true : heroContentRevealVisible}
            />
            <RevealLines
              elementRef={headingRef}
              as="h1"
              className={styles.heading}
              text={headingText}
              lines={headingLines}
              offset={introLines.length}
              total={sequenceTotal}
              stepMs={HEADING_REVEAL_STEP_MS}
              renderToken={renderHeadingToken}
              immediate={bypassHeroReplay}
              visible={bypassHeroReplay ? true : heroContentRevealVisible}
            />
            {descriptionText ? (
              <RevealLines
                elementRef={descriptionRef}
                as="p"
                className={styles.description}
                text={descriptionText}
                lines={descriptionLines}
                offset={introLines.length + headingLines.length}
                total={sequenceTotal}
                stepMs={HEADING_REVEAL_STEP_MS}
                renderToken={renderDescriptionToken}
                immediate={bypassHeroReplay}
                visible={bypassHeroReplay ? true : heroContentRevealVisible}
              />
            ) : null}
            {hasCta ? (
              <RevealLines
                elementRef={ctaRef}
                as="p"
                className={styles.heroCta}
                text={ctaTextUpper}
                lines={ctaLines}
                measureLines={false}
                offset={introLines.length + headingLines.length + descriptionLineCount}
                total={sequenceTotal}
                stepMs={HEADING_REVEAL_STEP_MS}
                renderToken={renderCtaToken}
                immediate={bypassHeroReplay}
                visible={bypassHeroReplay ? true : heroContentRevealVisible}
              />
            ) : null}
            <HeroDetailRevealContext.Provider value={detailReveal}>
              {supportingContent}
            </HeroDetailRevealContext.Provider>
          </div>

          <div
            className={styles.visualPanel}
            data-hero-visual=""
            data-visible={walkerActive ? "true" : "false"}
            data-accent={hoverAccent ?? "default"}
            aria-hidden={asciiInteraction ? undefined : true}
            data-interactive={asciiInteraction ? "true" : undefined}
          >
            <div className={styles.visualPanelInner} aria-hidden={asciiInteraction ? true : undefined}>
              <ASCIIAnimation
                className={styles.walkerShell}
                preClassName={styles.walker}
                frameFolder={frameFolder}
                quality="high"
                frameCount={WALKER_FRAME_COUNT}
                fps={WALKER_FPS}
                lazy={false}
                paused={!walkerActive}
                visible={walkerActive}
                scale={touchLayout ? WALKER_COARSE_SCALE : 1}
                anchorEnd={!asciiInteraction}
                repeatCount={asciiInteraction ? asciiTileCount : 1}
                repeatStepPx={asciiTileStepPx}
                repeatStepEm={0}
                /* Delayed touch intro reveals cell by cell rather than popping in from the preloader hand-off. */
                randomVisibilityReveal={!walkerRevealPlayedInPreloader || walkerWaitsForText}
                randomVisibilityDurationMs={
                  coarsePointer ? WALKER_TOUCH_INTRO_REVEAL_DURATION_MS : WALKER_HOVER_REVEAL_DURATION_MS
                }
                scrollDissolve
                color={
                  hoverAccent === "web"
                    ? "var(--hero-walker-web-color)"
                    : hoverAccent === "creative"
                      ? "var(--hero-walker-creative-color)"
                      : "var(--walker-color)"
                }
                ariaLabel="ASCII walking animation"
              />
            </div>
            {asciiInteraction ? (
              <button type="button" className={styles.asciiToggle} onClick={asciiInteraction.onToggle}
                aria-label={asciiInteraction.expanded ? "Restore compact ASCII" : "Make ASCII absurdly large"}
                aria-pressed={asciiInteraction.expanded}>
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {portalMounted &&
        showGagPortalLayer &&
        shitPortalLayout &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            className={styles.shitPortalWrap}
            style={{
              position: "fixed",
              left: shitPortalLayout.x,
              top: shitPortalLayout.y,
              /* 1em = rendered “stuff” size — `.shitPortal` scales with em */
              fontSize: shitPortalLayout.emBasePx,
            }}
            aria-hidden="true"
          >
            {/* Tilt lives only in CSS so GSAP scale/opacity never clears rotation mid-tween */}
            <span className={styles.shitPortalTilt}>
              <span ref={shitPortalRef} className={styles.shitPortal}>
                shit
              </span>
            </span>
          </span>,
          document.body,
        )}
    </section>
  );
}
