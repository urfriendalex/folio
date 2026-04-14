"use client";

import {
  Fragment,
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
import ASCIIAnimation from "@/components/Preloader/ascii";
import {
  getFrameFolderForTheme,
  getInitialFrameFolder,
} from "@/components/Preloader/frameFolder";
import { RevealLines } from "@/components/motion/RevealLines/RevealLines";
import { usePretextLines } from "@/components/motion/shared/usePretextLines";
import { requestHomeContactFormOpen } from "@/lib/homeContactForm";
import { getLenis } from "@/lib/smoothScroll";
import styles from "./HeroSection.module.scss";

/** Short stagger for the intro so the sequence stays snappy before the headline. */
const INTRO_REVEAL_STEP_MS = 44;
const HEADING_REVEAL_STEP_MS = 62;

/** Same breakpoint as Footer / Work — narrow viewports get a forced two-line intro. */
const INTRO_STACK_QUERY = "(max-width: 48rem)";
const COARSE_POINTER_QUERY = "(hover: none)";

function subscribeIntroStack(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const mq = window.matchMedia(INTRO_STACK_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getIntroStackSnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(INTRO_STACK_QUERY).matches;
}

function getServerIntroStackSnapshot(): boolean {
  return false;
}

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

/** Matches the phrase in `heroContent.position` (before "& Creative Technologist"). */
const WEB_DEVELOPER_PHRASE = "Web Developer";
const CREATIVE_TECHNOLOGIST_PHRASE = "Creative Technologist";
const WALKER_FRAME_COUNT = 37;
const WALKER_FPS = 20;

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
  ctaLine?: string;
};

type HeroSectionProps = {
  content: HeroContent;
};

export function HeroSection({ content }: HeroSectionProps) {
  const introRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLParagraphElement>(null);
  const stuffAnchorRef = useRef<HTMLSpanElement | null>(null);
  const strikeLineRef = useRef<HTMLSpanElement | null>(null);
  const stuffGlyphRef = useRef<HTMLSpanElement | null>(null);
  const shitPortalRef = useRef<HTMLSpanElement | null>(null);
  const gagPrevActiveRef = useRef(false);
  const [hoverAccent, setHoverAccent] = useState<HoverAccent | null>(null);
  const [stuffGagMobileActive, setStuffGagMobileActive] = useState(false);
  const [stuffGagHover, setStuffGagHover] = useState(false);
  /** Viewport center + em base (px) from the real “stuff” glyph so the portaled word tracks type scale on any screen. */
  const [shitPortalLayout, setShitPortalLayout] = useState<{
    x: number;
    y: number;
    emBasePx: number;
  } | null>(null);
  const [portalMounted, setPortalMounted] = useState(false);
  const [frameFolder, setFrameFolder] = useState(getInitialFrameFolder);

  const coarsePointer = useSyncExternalStore(
    subscribeCoarsePointer,
    getCoarsePointerSnapshot,
    getServerCoarsePointerSnapshot,
  );

  /** Fine pointers: hover only (no focus / no click-to-hold). Coarse: tap toggle. */
  const gagActive = coarsePointer ? stuffGagMobileActive : stuffGagHover;
  const showGagPortalLayer = gagActive;

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useLayoutEffect(() => {
    const anchor = stuffAnchorRef.current;
    if (!anchor) {
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

      setShitPortalLayout({
        x: r.left + r.width * 0.5,
        y: r.top + r.height * 0.5,
        emBasePx,
      });
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
  }, [content.statement, gagActive]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wasActive = gagPrevActiveRef.current;

    if (gagActive && !wasActive) {
      gagPrevActiveRef.current = true;

      gsap.killTweensOf(
        [strikeLineRef.current, stuffGlyphRef.current, shitPortalRef.current].filter(Boolean),
      );

      const runEnter = (attempt = 0) => {
        const s = strikeLineRef.current;
        const g = stuffGlyphRef.current;
        const h = shitPortalRef.current;
        if (!s || !g) {
          return;
        }

        if (!h && attempt < 14) {
          requestAnimationFrame(() => runEnter(attempt + 1));
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

      requestAnimationFrame(() => requestAnimationFrame(() => runEnter(0)));
      return;
    }

    if (!gagActive && wasActive) {
      gagPrevActiveRef.current = false;

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
        return;
      }

      if (h) {
        gsap.set(h, {
          autoAlpha: 0,
          immediateRender: true,
        });
      }
      if (g) {
        gsap.set(g, { opacity: 1 });
      }
      gsap.set(s, { scaleX: 0, transformOrigin: "left center" });
    }

    return undefined;
  }, [gagActive]);

  const handleStuffPointerEnter = useCallback(() => {
    if (!coarsePointer) {
      setStuffGagHover(true);
    }
  }, [coarsePointer]);

  const handleStuffPointerLeave = useCallback(() => {
    if (!coarsePointer) {
      setStuffGagHover(false);
    }
  }, [coarsePointer]);

  const stackIntroLines = useSyncExternalStore(
    subscribeIntroStack,
    getIntroStackSnapshot,
    getServerIntroStackSnapshot,
  );

  const introText = useMemo(() => {
    if (stackIntroLines) {
      return `Hi, I'm ${content.name}\n${content.position}`;
    }
    return `Hi, I'm ${content.name}, a ${content.position}`;
  }, [content.name, content.position, stackIntroLines]);

  const introLines = usePretextLines(introText, introRef, "pre-wrap", true);
  const headingLines = usePretextLines(content.statement, headingRef, "pre-wrap", true);

  const ctaTextUpper = useMemo(
    () => content.ctaLine?.trim().toUpperCase() ?? "",
    [content.ctaLine],
  );
  const hasCta = ctaTextUpper.length > 0;
  const ctaLines = useMemo(() => (hasCta ? [ctaTextUpper] : []), [hasCta, ctaTextUpper]);

  const sequenceTotal = introLines.length + headingLines.length + ctaLines.length;

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

  const handleContentPointerEnter = useCallback(() => {
    setHoverAccent((current) => current ?? "default");
  }, []);

  const handleContentPointerLeave = useCallback(() => {
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
      const webIndex = token.indexOf(WEB_DEVELOPER_PHRASE);
      const creativeIndex = token.indexOf(CREATIVE_TECHNOLOGIST_PHRASE);
      const hasWebPhrase = webIndex !== -1;
      const hasCreativePhrase = creativeIndex !== -1;

      if (!hasWebPhrase && !hasCreativePhrase) {
        return token;
      }

      /** Only one phrase matched — avoid rendering the full token twice (bug when casing drifted). */
      if (hasWebPhrase && !hasCreativePhrase) {
        return (
          <>
            {token.slice(0, webIndex)}
            <span
              className={`${styles.introAccentTrigger} ${styles.introAccentTriggerWeb}`}
              onPointerEnter={handleWebAccent}
              onPointerLeave={handleDefaultAccent}
            >
              <span className={styles.introPixelSquare}>{WEB_DEVELOPER_PHRASE}</span>
            </span>
            {token.slice(webIndex + WEB_DEVELOPER_PHRASE.length)}
          </>
        );
      }

      if (!hasWebPhrase && hasCreativePhrase) {
        return (
          <>
            {token.slice(0, creativeIndex)}
            <span
              className={`${styles.introAccentTrigger} ${styles.introAccentTriggerCreative}`}
              onPointerEnter={handleCreativeAccent}
              onPointerLeave={handleDefaultAccent}
            >
              {CREATIVE_TECHNOLOGIST_PHRASE}
            </span>
            {token.slice(creativeIndex + CREATIVE_TECHNOLOGIST_PHRASE.length)}
          </>
        );
      }

      const afterWeb = token.slice(webIndex + WEB_DEVELOPER_PHRASE.length);
      const relCreative = afterWeb.indexOf(CREATIVE_TECHNOLOGIST_PHRASE);
      const beforeCreative = relCreative === -1 ? afterWeb : afterWeb.slice(0, relCreative);
      const afterCreative =
        relCreative === -1
          ? ""
          : afterWeb.slice(relCreative + CREATIVE_TECHNOLOGIST_PHRASE.length);

      return (
        <>
          {token.slice(0, webIndex)}
          <span
            className={`${styles.introAccentTrigger} ${styles.introAccentTriggerWeb}`}
            onPointerEnter={handleWebAccent}
            onPointerLeave={handleDefaultAccent}
          >
            <span className={styles.introPixelSquare}>{WEB_DEVELOPER_PHRASE}</span>
          </span>
          {beforeCreative}
          <span
            className={`${styles.introAccentTrigger} ${styles.introAccentTriggerCreative}`}
            onPointerEnter={handleCreativeAccent}
            onPointerLeave={handleDefaultAccent}
          >
            {CREATIVE_TECHNOLOGIST_PHRASE}
          </span>
          {afterCreative}
        </>
      );
    },
    [handleCreativeAccent, handleDefaultAccent, handleWebAccent],
  );

  const renderHeadingToken = useCallback(
    (token: string, tokenIndex: number) => {
      if (!token.includes(STUFF_GAG_WORD)) {
        return token;
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
              data-active={stuffGagMobileActive ? "true" : "false"}
              data-gag-open={gagActive ? "true" : "false"}
              aria-label="Alternate emphasis for “stuff”"
              aria-pressed={coarsePointer ? stuffGagMobileActive : undefined}
              onPointerEnter={handleStuffPointerEnter}
              onPointerLeave={handleStuffPointerLeave}
              onClick={() => {
                if (typeof window !== "undefined" && window.matchMedia(COARSE_POINTER_QUERY).matches) {
                  setStuffGagMobileActive((v) => !v);
                }
              }}
              onKeyDown={(event) => {
                if (typeof window === "undefined" || !window.matchMedia(COARSE_POINTER_QUERY).matches) {
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setStuffGagMobileActive((v) => !v);
                }
              }}
            >
              <span className={styles.stuffSurface}>
                <span ref={strikeLineRef} className={styles.stuffStrikeLine} aria-hidden="true" />
                <span ref={stuffGlyphRef} className={styles.stuffGlyph}>
                  {STUFF_GAG_WORD}
                </span>
              </span>
            </span>
          );
        }

        return (
          <Fragment key={`stuff-seg-${tokenIndex}-${i}`}>{segment}</Fragment>
        );
      });
    },
    [coarsePointer, gagActive, handleStuffPointerEnter, handleStuffPointerLeave, stuffGagMobileActive],
  );

  const renderCtaToken = useCallback((token: string) => {
    return (
      <a
        href="#contact"
        className={`link-underline ${styles.heroCtaLink}`}
        onClick={(event) => {
          event.preventDefault();
          requestHomeContactFormOpen({ instant: true });
        }}
      >
        {token}
      </a>
    );
  }, []);

  return (
    <section id="hero" className={styles.section}>
      <div className={`page-shell ${styles.inner}`}>
        <div className={styles.stage}>
          <div
            className={styles.content}
            onPointerEnter={handleContentPointerEnter}
            onPointerLeave={handleContentPointerLeave}
          >
            <RevealLines
              elementRef={introRef}
              as="p"
              className={styles.intro}
              text={introText}
              lines={introLines}
              offset={0}
              total={sequenceTotal}
              stepMs={INTRO_REVEAL_STEP_MS}
              renderToken={renderIntroToken}
            />
            <RevealLines
              elementRef={headingRef}
              as="h1"
              className={styles.heading}
              text={content.statement}
              lines={headingLines}
              offset={introLines.length}
              total={sequenceTotal}
              stepMs={HEADING_REVEAL_STEP_MS}
              renderToken={renderHeadingToken}
            />
            {hasCta ? (
              <RevealLines
                elementRef={ctaRef}
                as="p"
                className={styles.heroCta}
                text={ctaTextUpper}
                lines={ctaLines}
                measureLines={false}
                offset={introLines.length + headingLines.length}
                total={sequenceTotal}
                stepMs={HEADING_REVEAL_STEP_MS}
                renderToken={renderCtaToken}
              />
            ) : null}
          </div>

          <div
            className={styles.visualPanel}
            data-visible={hoverAccent ? "true" : "false"}
            data-accent={hoverAccent ?? "default"}
            aria-hidden="true"
          >
            <div className={styles.visualPanelInner}>
              <ASCIIAnimation
                className={styles.walkerShell}
                preClassName={styles.walker}
                frameFolder={frameFolder}
                quality="high"
                frameCount={WALKER_FRAME_COUNT}
                fps={WALKER_FPS}
                lazy={false}
                paused={!hoverAccent}
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
