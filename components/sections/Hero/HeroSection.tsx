"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import ASCIIAnimation from "@/components/Preloader/ascii";
import {
  getFrameFolderForTheme,
  getInitialFrameFolder,
} from "@/components/Preloader/frameFolder";
import { RevealLines } from "@/components/motion/RevealLines/RevealLines";
import { usePretextLines } from "@/components/motion/shared/usePretextLines";
import { useRevealOnView } from "@/components/motion/shared/useRevealOnView";
import { useOptionalHeroRevealTimeline } from "@/lib/heroRevealTimeline";
import { requestHomeContactFormOpen } from "@/lib/homeContactForm";
import {
  getHomeHeroRevealDone,
  setHomeHeroRevealDone,
  subscribeHomeHeroRevealDone,
} from "@/lib/homeHeroRevealSession";
import { usePreloaderComplete } from "@/lib/preloaderComplete";
import { useRevealMotionEnabled } from "@/lib/revealPolicy";
import { useRestoredScrollBypass } from "@/lib/restoredScroll";
import styles from "./HeroSection.module.scss";

/** Short stagger for the intro so the sequence stays snappy before the headline. */
const INTRO_REVEAL_STEP_MS = 44;
const HEADING_REVEAL_STEP_MS = 62;
const REVEAL_TRANSFORM_SETTLE_MS = 620;

/** Same breakpoint as Footer / Work — narrow viewports get a forced two-line role. */
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

/** Matches the phrases in `heroContent.position`. */
const INDEPENDENT_DEVELOPER_PHRASE = "Independent Developer";
const CREATIVE_TECHNOLOGIST_PHRASE = "Creative Technologist";
const WALKER_FRAME_COUNT = 37;
const WALKER_FPS = 20;

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
  const contentRevealGateRef = useRef<HTMLDivElement>(null);
  const [hoverAccent, setHoverAccent] = useState<HoverAccent>("default");
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

  const stackIntroLines = useSyncExternalStore(
    subscribeIntroStack,
    getIntroStackSnapshot,
    getServerIntroStackSnapshot,
  );

  const introText = useMemo(() => {
    if (stackIntroLines) {
      return `${INDEPENDENT_DEVELOPER_PHRASE}\n& ${CREATIVE_TECHNOLOGIST_PHRASE}`;
    }
    return content.position;
  }, [content.position, stackIntroLines]);

  const introLines = usePretextLines(introText, introRef, "pre-wrap", true);
  const headingLines = usePretextLines(content.statement, headingRef, "pre-wrap", true);

  const ctaTextUpper = useMemo(
    () => content.ctaLine?.trim().toUpperCase() ?? "",
    [content.ctaLine],
  );
  const hasCta = ctaTextUpper.length > 0;
  const ctaLines = useMemo(() => (hasCta ? [ctaTextUpper] : []), [hasCta, ctaTextUpper]);

  const sequenceTotal = introLines.length + headingLines.length + ctaLines.length;
  const walkerVisible = preloaderComplete && (bypassHeroReplay || heroContentRevealVisible);

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
    const ctaEndMs =
      hasCta
        ? (sequenceTotal - 1) * HEADING_REVEAL_STEP_MS + REVEAL_TRANSFORM_SETTLE_MS
        : 0;
    const revealCompleteMs = Math.max(introEndMs, headingEndMs, ctaEndMs);

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
    hasCta,
    headingLines.length,
    introLines.length,
    preloaderComplete,
    sequenceTotal,
  ]);

  /** Publish CTA stagger phase to {@link HeroRevealTimelineProvider} for Work reveals. */
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

    const ctaPhaseStartMs = hasCta
      ? (introLines.length + headingLines.length) * HEADING_REVEAL_STEP_MS
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
    headingLines.length,
    introLines.length,
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

  const handleDefaultAccent = useCallback(() => {
    if (!coarsePointer) {
      setHoverAccent("default");
    }
  }, [coarsePointer]);

  const handleWebAccent = useCallback(() => {
    if (coarsePointer) {
      setHoverAccent((current) => (current === "web" ? "default" : "web"));
      return;
    }
    setHoverAccent("web");
  }, [coarsePointer]);

  const handleCreativeAccent = useCallback(() => {
    if (coarsePointer) {
      setHoverAccent((current) => (current === "creative" ? "default" : "creative"));
      return;
    }
    setHoverAccent("creative");
  }, [coarsePointer]);

  const renderIntroToken = useCallback(
    (token: string) => {
      const webIndex = token.indexOf(INDEPENDENT_DEVELOPER_PHRASE);
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
              data-active={hoverAccent === "web" ? "true" : "false"}
              onPointerEnter={coarsePointer ? undefined : handleWebAccent}
              onPointerLeave={handleDefaultAccent}
              onClick={coarsePointer ? handleWebAccent : undefined}
            >
              <span className={styles.introPixelSquare}>{INDEPENDENT_DEVELOPER_PHRASE}</span>
            </span>
            {token.slice(webIndex + INDEPENDENT_DEVELOPER_PHRASE.length)}
          </>
        );
      }

      if (!hasWebPhrase && hasCreativePhrase) {
        return (
          <>
            {token.slice(0, creativeIndex)}
            <span
              className={`${styles.introAccentTrigger} ${styles.introAccentTriggerCreative}`}
              data-active={hoverAccent === "creative" ? "true" : "false"}
              onPointerEnter={coarsePointer ? undefined : handleCreativeAccent}
              onPointerLeave={handleDefaultAccent}
              onClick={coarsePointer ? handleCreativeAccent : undefined}
            >
              {CREATIVE_TECHNOLOGIST_PHRASE}
            </span>
            {token.slice(creativeIndex + CREATIVE_TECHNOLOGIST_PHRASE.length)}
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
          {token.slice(0, webIndex)}
          <span
            className={`${styles.introAccentTrigger} ${styles.introAccentTriggerWeb}`}
            data-active={hoverAccent === "web" ? "true" : "false"}
            onPointerEnter={coarsePointer ? undefined : handleWebAccent}
            onPointerLeave={handleDefaultAccent}
            onClick={coarsePointer ? handleWebAccent : undefined}
          >
            <span className={styles.introPixelSquare}>{INDEPENDENT_DEVELOPER_PHRASE}</span>
          </span>
          {beforeCreative}
          <span
            className={`${styles.introAccentTrigger} ${styles.introAccentTriggerCreative}`}
            data-active={hoverAccent === "creative" ? "true" : "false"}
            onPointerEnter={coarsePointer ? undefined : handleCreativeAccent}
            onPointerLeave={handleDefaultAccent}
            onClick={coarsePointer ? handleCreativeAccent : undefined}
          >
            {CREATIVE_TECHNOLOGIST_PHRASE}
          </span>
          {afterCreative}
        </>
      );
    },
    [coarsePointer, handleCreativeAccent, handleDefaultAccent, handleWebAccent, hoverAccent],
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
          <div ref={contentRevealGateRef} className={styles.content}>
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
              immediate={bypassHeroReplay}
              visible={bypassHeroReplay ? true : heroContentRevealVisible}
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
              immediate={bypassHeroReplay}
              visible={bypassHeroReplay ? true : heroContentRevealVisible}
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
                immediate={bypassHeroReplay}
                visible={bypassHeroReplay ? true : heroContentRevealVisible}
              />
            ) : null}
          </div>

          <div
            className={styles.visualPanel}
            data-visible={walkerVisible ? "true" : "false"}
            data-accent={hoverAccent}
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
                paused={!walkerVisible}
                visible={walkerVisible}
                randomVisibilityReveal
                randomVisibilityDurationMs={560}
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
    </section>
  );
}
