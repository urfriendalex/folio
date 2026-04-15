"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ProjectFullInfoOverlay } from "@/components/projects/ProjectFullInfoOverlay";
import { AboutOverlayContent } from "@/content/about";
import { contactContent } from "@/content/contact";
import type { ProjectEntry } from "@/content/projects/types";
import { RevealLines } from "@/components/motion";
import { PixelText } from "@/components/type/PixelText/PixelText";
import { Overlay } from "./Overlay";
import styles from "./OverlayProvider.module.scss";

type OverlayType = "about" | "contact" | "project" | null;

type OverlayContextValue = {
  activeOverlay: OverlayType;
  closeOverlay: () => void;
  openAbout: () => void;
  openContactForm: () => void;
  openProjectFullInfo: (project: ProjectEntry) => void;
};

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function useOverlay() {
  const context = useContext(OverlayContext);

  if (!context) {
    throw new Error("useOverlay must be used within OverlayProvider");
  }

  return context;
}

type OverlayProviderProps = {
  children: ReactNode;
};

const ABOUT_REVEAL_STEP_MS = 28;
const ABOUT_TOKEN_TRANSITION_MS = 620;
const ABOUT_EXIT_BUFFER_MS = 80;
const BASE_OVERLAY_EXIT_MS = 420;
const ABOUT_FOOTER_COUNT = 3;
const ABOUT_INTRO_COUNT = AboutOverlayContent.intro.split("\n").length;

/** Rough token count for stagger (RevealLines line tokens); keeps meta/footer offsets in sync with the about body. */
function estimateAboutLineTokens(text: string): number {
  return text.split("\n").reduce((sum, chunk) => sum + Math.max(1, Math.ceil(chunk.length / 48)), 0);
}

let aboutSequenceCursor = ABOUT_INTRO_COUNT;
const ABOUT_DESCRIPTION_OFFSET = aboutSequenceCursor;
aboutSequenceCursor += estimateAboutLineTokens(AboutOverlayContent.description);
const ABOUT_DETAILS_OFFSET = aboutSequenceCursor;

/** Horizontal stagger between column rule draws (overlap OK — next column need not wait for the previous). */
const META_COLUMN_STAGGER_MS = 88;
/** Small gap after each rule starts before that column’s label + list begin (does not wait for the 560ms draw). */
const META_TEXT_GAP_MS = 44;

const { detailSequences: ABOUT_DETAIL_SEQUENCES, footerOffset: ABOUT_FOOTER_OFFSET } = (() => {
  let cursor = ABOUT_DETAILS_OFFSET;
  const metaBaseMs = ABOUT_DETAILS_OFFSET * ABOUT_REVEAL_STEP_MS;
  const partial = AboutOverlayContent.details.map((detail, colIndex) => {
    const lineEnterDelayMs = metaBaseMs + colIndex * META_COLUMN_STAGGER_MS;

    const titleEst = estimateAboutLineTokens(detail.label);
    const titleOffset = cursor;
    const titleTargetMs = lineEnterDelayMs + META_TEXT_GAP_MS;
    const titleRevealDelayMs = Math.round(titleTargetMs - titleOffset * ABOUT_REVEAL_STEP_MS);
    cursor += titleEst;

    let lastBlockEndMs =
      titleOffset * ABOUT_REVEAL_STEP_MS +
      titleRevealDelayMs +
      Math.max(0, titleEst - 1) * ABOUT_REVEAL_STEP_MS;

    const itemOffsets: number[] = [];
    const itemRevealDelaysMs: number[] = [];

    for (const item of detail.items) {
      const est = estimateAboutLineTokens(item);
      const itemOffset = cursor;
      const itemTargetMs = lastBlockEndMs + ABOUT_REVEAL_STEP_MS;
      const itemRevealDelayMs = Math.round(itemTargetMs - itemOffset * ABOUT_REVEAL_STEP_MS);
      itemOffsets.push(itemOffset);
      itemRevealDelaysMs.push(itemRevealDelayMs);
      cursor += est;
      lastBlockEndMs =
        itemOffset * ABOUT_REVEAL_STEP_MS +
        itemRevealDelayMs +
        Math.max(0, est - 1) * ABOUT_REVEAL_STEP_MS;
    }

    return {
      detail,
      titleOffset,
      titleRevealDelayMs,
      itemOffsets,
      itemRevealDelaysMs,
      lineEnterDelayMs,
    };
  });

  const maxLineEnterMs = Math.max(...partial.map((d) => d.lineEnterDelayMs));
  const detailSequences = partial.map((d) => ({
    ...d,
    lineExitDelayMs: maxLineEnterMs - d.lineEnterDelayMs,
  }));

  return { detailSequences, footerOffset: cursor };
})();
const ABOUT_SEQUENCE_TOTAL = ABOUT_FOOTER_OFFSET + ABOUT_FOOTER_COUNT;
const ABOUT_OVERLAY_EXIT_MS =
  (ABOUT_SEQUENCE_TOTAL - 1) * ABOUT_REVEAL_STEP_MS +
  ABOUT_TOKEN_TRANSITION_MS +
  ABOUT_EXIT_BUFFER_MS;
const OVERLAY_BLUR_PENDING_CLASS = "is-overlay-blur-pending";
const OVERLAY_BLUR_CLOSING_CLASS = "is-overlay-blur-closing";

export function OverlayProvider({ children }: OverlayProviderProps) {
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);
  const [projectOverlay, setProjectOverlay] = useState<ProjectEntry | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayContentVisible, setOverlayContentVisible] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeShellTimerRef = useRef<number | null>(null);
  const closeUnmountTimerRef = useRef<number | null>(null);
  const openFrameRef = useRef<number | null>(null);
  const openContentFrameRef = useRef<number | null>(null);

  const setPendingBlurHandoff = () => {
    document.documentElement.classList.add(OVERLAY_BLUR_PENDING_CLASS);
  };

  const clearPendingBlurHandoff = () => {
    document.documentElement.classList.remove(OVERLAY_BLUR_PENDING_CLASS);
  };

  const setClosingBlurHandoff = () => {
    document.documentElement.classList.add(OVERLAY_BLUR_CLOSING_CLASS);
  };

  const clearClosingBlurHandoff = () => {
    document.documentElement.classList.remove(OVERLAY_BLUR_CLOSING_CLASS);
  };

  useEffect(() => {
    return () => {
      clearPendingBlurHandoff();
      clearClosingBlurHandoff();

      if (closeShellTimerRef.current) {
        window.clearTimeout(closeShellTimerRef.current);
      }

      if (closeUnmountTimerRef.current) {
        window.clearTimeout(closeUnmountTimerRef.current);
      }

      if (openFrameRef.current) {
        window.cancelAnimationFrame(openFrameRef.current);
      }

      if (openContentFrameRef.current) {
        window.cancelAnimationFrame(openContentFrameRef.current);
      }
    };
  }, []);

  const clearOverlayTimers = () => {
    if (closeShellTimerRef.current) {
      window.clearTimeout(closeShellTimerRef.current);
      closeShellTimerRef.current = null;
    }

    if (closeUnmountTimerRef.current) {
      window.clearTimeout(closeUnmountTimerRef.current);
      closeUnmountTimerRef.current = null;
    }

    if (openFrameRef.current) {
      window.cancelAnimationFrame(openFrameRef.current);
      openFrameRef.current = null;
    }

    if (openContentFrameRef.current) {
      window.cancelAnimationFrame(openContentFrameRef.current);
      openContentFrameRef.current = null;
    }
  };

  const closeOverlay = () => {
    if (!activeOverlay) {
      clearPendingBlurHandoff();
      clearClosingBlurHandoff();
      return;
    }

    if (activeOverlay === "about") {
      window.dispatchEvent(new CustomEvent("folio:before-about-close"));
    }

    clearOverlayTimers();
    clearPendingBlurHandoff();
    setClosingBlurHandoff();
    setOverlayContentVisible(false);

    const finishClose = () => {
      clearPendingBlurHandoff();
      clearClosingBlurHandoff();
      setActiveOverlay(null);
      setProjectOverlay(null);
      setOverlayVisible(false);
      setOverlayContentVisible(false);
      closeUnmountTimerRef.current = null;
      window.requestAnimationFrame(() => {
        triggerRef.current?.focus({ preventScroll: true });
      });
    };

    if (activeOverlay === "about") {
      closeShellTimerRef.current = window.setTimeout(() => {
        setOverlayVisible(false);
        closeShellTimerRef.current = null;
      }, ABOUT_OVERLAY_EXIT_MS);

      closeUnmountTimerRef.current = window.setTimeout(
        finishClose,
        ABOUT_OVERLAY_EXIT_MS + BASE_OVERLAY_EXIT_MS,
      );
      return;
    }

    setOverlayVisible(false);
    closeUnmountTimerRef.current = window.setTimeout(finishClose, BASE_OVERLAY_EXIT_MS);
  };

  const openOverlay = (type: Exclude<OverlayType, "project">) => {
    clearOverlayTimers();
    setPendingBlurHandoff();
    clearClosingBlurHandoff();
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setProjectOverlay(null);
    setActiveOverlay(type);
    setOverlayVisible(false);
    setOverlayContentVisible(false);
    openFrameRef.current = window.requestAnimationFrame(() => {
      setOverlayVisible(true);
      openFrameRef.current = null;
      openContentFrameRef.current = window.requestAnimationFrame(() => {
        setOverlayContentVisible(true);
        openContentFrameRef.current = null;
      });
    });
  };

  const openProjectFullInfo = (project: ProjectEntry) => {
    clearOverlayTimers();
    setPendingBlurHandoff();
    clearClosingBlurHandoff();
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setProjectOverlay(project);
    setActiveOverlay("project");
    setOverlayVisible(false);
    setOverlayContentVisible(false);
    openFrameRef.current = window.requestAnimationFrame(() => {
      setOverlayVisible(true);
      openFrameRef.current = null;
      openContentFrameRef.current = window.requestAnimationFrame(() => {
        setOverlayContentVisible(true);
        openContentFrameRef.current = null;
      });
    });
  };

  return (
    <OverlayContext.Provider
      value={{
        activeOverlay,
        closeOverlay,
        openAbout: () => openOverlay("about"),
        openContactForm: () => openOverlay("contact"),
        openProjectFullInfo,
      }}
    >
      {children}
      {activeOverlay === "about" ? (
        <Overlay
          onClose={closeOverlay}
          title="Information"
          variant="immersive"
          showTitle={false}
          visible={overlayVisible}
          contentVisible={overlayContentVisible}
        >
          <div className={styles.about} data-content-visible={overlayContentVisible}>
            <div className={styles.aboutScroll} data-lenis-prevent="">
              <div className={styles.aboutLead}>
                <RevealLines
                  as="p"
                  className={styles.aboutLeadText}
                  text={AboutOverlayContent.intro}
                  offset={0}
                  stepMs={ABOUT_REVEAL_STEP_MS}
                  total={ABOUT_SEQUENCE_TOTAL}
                  visible={overlayContentVisible}
                />
              </div>

              <div className={styles.aboutDescription}>
                <RevealLines
                  as="p"
                  className={styles.aboutParagraph}
                  text={AboutOverlayContent.description}
                  offset={ABOUT_DESCRIPTION_OFFSET}
                  stepMs={ABOUT_REVEAL_STEP_MS}
                  total={ABOUT_SEQUENCE_TOTAL}
                  visible={overlayContentVisible}
                />
              </div>

              <div className={styles.metaGrid}>
                  {ABOUT_DETAIL_SEQUENCES.map(
                    ({
                      detail,
                      itemOffsets,
                      itemRevealDelaysMs,
                      titleOffset,
                      titleRevealDelayMs,
                      lineEnterDelayMs,
                      lineExitDelayMs,
                    }) => (
                    <section
                      key={detail.label}
                      className={styles.metaBlock}
                      style={
                        {
                          "--meta-line-enter-delay": `${lineEnterDelayMs}ms`,
                          "--meta-line-exit-delay": `${lineExitDelayMs}ms`,
                        } as CSSProperties
                      }
                    >
                      <RevealLines
                        as="span"
                        className={`section-label ${styles.metaTitle}`}
                        text={detail.label}
                        offset={titleOffset}
                        revealDelayMs={titleRevealDelayMs}
                        stepMs={ABOUT_REVEAL_STEP_MS}
                        total={ABOUT_SEQUENCE_TOTAL}
                        visible={overlayContentVisible}
                      />
                      <ul>
                        {detail.items.map((item, itemIndex) => (
                          <RevealLines
                            key={item}
                            as="li"
                            className={styles.metaItem}
                            text={item}
                            offset={itemOffsets[itemIndex]}
                            revealDelayMs={itemRevealDelaysMs[itemIndex]}
                            stepMs={ABOUT_REVEAL_STEP_MS}
                            total={ABOUT_SEQUENCE_TOTAL}
                            visible={overlayContentVisible}
                          />
                        ))}
                      </ul>
                    </section>
                  ),
                  )}
                </div>
              </div>

            <div className={styles.aboutFooter}>
              <div className={styles.aboutFooterLinks}>
                <a
                  href={contactContent.instagram}
                  className={`link-underline ${styles.aboutFooterLink}`}
                >
                  <RevealLines
                    as="span"
                    text="Instagram"
                    measureLines={false}
                    offset={ABOUT_FOOTER_OFFSET}
                    stepMs={ABOUT_REVEAL_STEP_MS}
                    total={ABOUT_SEQUENCE_TOTAL}
                    visible={overlayContentVisible}
                  />
                </a>
                <a
                  href={contactContent.linkedin}
                  className={`link-underline ${styles.aboutFooterLink}`}
                >
                  <RevealLines
                    as="span"
                    text="LinkedIn"
                    measureLines={false}
                    offset={ABOUT_FOOTER_OFFSET + 1}
                    stepMs={ABOUT_REVEAL_STEP_MS}
                    total={ABOUT_SEQUENCE_TOTAL}
                    visible={overlayContentVisible}
                  />
                </a>
              </div>
              <span className={styles.aboutCopyright}>
                <RevealLines
                  as="span"
                  text="© 2026 Alexander Yansons"
                  measureLines={false}
                  offset={ABOUT_FOOTER_OFFSET + 2}
                  stepMs={ABOUT_REVEAL_STEP_MS}
                  total={ABOUT_SEQUENCE_TOTAL}
                  visible={overlayContentVisible}
                />
              </span>
            </div>
          </div>
        </Overlay>
      ) : null}
      {activeOverlay === "project" && projectOverlay ? (
        <Overlay
          onClose={closeOverlay}
          title={projectOverlay.title}
          variant="immersive"
          showTitle={false}
          visible={overlayVisible}
          contentVisible={overlayContentVisible}
        >
          <ProjectFullInfoOverlay project={projectOverlay} contentVisible={overlayContentVisible} />
        </Overlay>
      ) : null}
      {activeOverlay === "contact" ? (
        <Overlay
          onClose={closeOverlay}
          title="Contact"
          visible={overlayVisible}
          contentVisible={overlayContentVisible}
        >
          <div className={styles.contactOverlay}>
            <div className={styles.contactLead}>
              <span className="section-label">Get in touch</span>
              <PixelText as="h2" className={styles.contactTitle} text="LET'S TALK" pixelFrom={62} />
              <p>
                Start with a short note. If forms are not your thing, email or socials work just as well.
              </p>
              <div className={styles.metaLinks}>
                <a href={`mailto:${contactContent.email}`} className="text-link">
                  {contactContent.email}
                </a>
                <a href={contactContent.instagram} className="text-link">
                  Instagram
                </a>
                <a href={contactContent.github} className="text-link">
                  GitHub
                </a>
                <a href={contactContent.linkedin} className="text-link">
                  LinkedIn
                </a>
              </div>
            </div>

            <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
              <label className={styles.field}>
                <span>Name</span>
                <input type="text" name="name" placeholder="Your name" />
              </label>
              <label className={styles.field}>
                <span>Email</span>
                <input type="email" name="email" placeholder="you@example.com" />
              </label>
              <label className={styles.field}>
                <span>Message</span>
                <textarea name="message" placeholder="Project, collaboration, idea." />
              </label>
              <button type="submit" className="pill-button">
                Send
              </button>
            </form>
          </div>
        </Overlay>
      ) : null}
    </OverlayContext.Provider>
  );
}
