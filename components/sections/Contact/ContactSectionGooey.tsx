"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { flushSync } from "react-dom";
import { useRevealOnView } from "@/components/motion/shared/useRevealOnView";
import {
  registerHomeContactFormOpener,
  type HomeContactFormOpenOptions,
} from "@/lib/homeContactForm";
import { CalBookingTrigger } from "@/components/booking/CalBookingTrigger";
import { hapticTick } from "@/lib/haptics";
import { DURATION_MS } from "@/lib/motion";
import { scrollElementIntoView } from "@/lib/smoothScroll";
import { LiveClock } from "@/components/layout/Footer/TimeZoneStatus";
import { BookingButtonAscii } from "@/components/layout/Footer/BookingButtonAscii";
import { cellRevealHash01 } from "@/components/Preloader/ascii";
import { GLYPH_GLITCH_THRESHOLD_MAX } from "@/lib/glyphGlitch";
import { AsciiFlowField, type AsciiFieldHandle } from "./AsciiFlowField";
import { copyText } from "./contactCopy";
import { CopyToast, type CopyToastState } from "./CopyToast";
import { GooeyContactEmail } from "./GooeyContactEmail";
import layoutStyles from "./ContactLayout.module.scss";
import workSectionStyles from "../Work/WorkSection.module.scss";
import styles from "./ContactSection.module.scss";

type ContactSectionGooeyProps = {
  content: {
    email: string;
    location: string;
    availability: string;
    responseTime: string;
    instagram: string;
    github: string;
    linkedin: string;
  };
  /** Second line in the gooey swap (hover). */
  hoverPhrase?: string;
};

type ContactView = "email" | "form";

/** Email stack exits on `--duration-exit`; swap to the form right after, with no dead pause. */
const EMAIL_TRANSITION_MS = DURATION_MS.exit + 20;
const FORM_EXIT_MS = DURATION_MS.exit + 20;
/** Mobile actions use a quieter glyph field than the desktop row. */
const COMPACT_CELLS_QUERY = "(max-width: 48rem)";

/** Inline form open — distinct from `#contact` (email/actions) so back closes the form, not history. */
const CONTACT_FORM_ELEMENT_ID = "contact-form";

function peekHash(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.hash.replace(/^#/, "");
}

/** Pushes `#contact-form` unless the URL already has it (e.g. shared link); callers set `contactFormHistorySealRef` only when this returns true. */
function pushContactFormHistoryEntry(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (peekHash() === CONTACT_FORM_ELEMENT_ID) {
    return false;
  }

  const url = new URL(window.location.href);
  url.hash = CONTACT_FORM_ELEMENT_ID;
  window.history.pushState({ folioContactForm: true }, "", url.toString());
  return true;
}

function stripContactFormHashIfPresent(): void {
  if (typeof window === "undefined") {
    return;
  }
  if (peekHash() !== CONTACT_FORM_ELEMENT_ID) {
    return;
  }
  const url = new URL(window.location.href);
  url.hash = "contact";
  window.history.replaceState(window.history.state, "", url.toString());
}

/** Cell text split into glyphs that the cell's field glitches on and off (see `BookingButtonAscii`'s `glitch`).
    The cell carries the accessible name, so the glyphs are hidden from assistive tech. */
function GlitchText({ text, seed, className }: { text: string; seed: number; className: string }) {
  return (
    <span className={className} aria-hidden="true">
      {Array.from(text, (char, index) =>
        char === " " ? (
          " "
        ) : (
          <span
            key={index}
            className={styles.glitchChar}
            data-glitch-at={(cellRevealHash01(index, seed) * GLYPH_GLITCH_THRESHOLD_MAX).toFixed(3)}
            data-glitch-phase={cellRevealHash01(index, seed + 1) < 0.5 ? 0 : 1}
          >
            {char}
          </span>
        ),
      )}
    </span>
  );
}

export function ContactSectionGooey({
  content,
  hoverPhrase = "Let's work together",
}: ContactSectionGooeyProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const switchTimerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  /* Start the cascade when the heading enters, before the email and actions below it. */
  const revealAnchorRef = useRef<HTMLDivElement | null>(null);
  const sectionVisible = useRevealOnView(revealAnchorRef, {
    rootMargin: "0px 0px -4% 0px",
    threshold: 0.1,
  });
  const [view, setView] = useState<ContactView>("email");
  const [toast, setToast] = useState<CopyToastState>(null);
  const toastTimerRef = useRef<number | null>(null);
  const trailRef = useRef<AsciiFieldHandle | null>(null);
  const [emailVisible, setEmailVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const viewRef = useRef(view);
  useLayoutEffect(() => {
    viewRef.current = view;
  }, [view]);
  /** Extra `history.pushState` is active — Back / Escape should use `history.back()` so gestures match. */
  const contactFormHistorySealRef = useRef(false);

  useEffect(() => {
    return () => {
      if (switchTimerRef.current) {
        window.clearTimeout(switchTimerRef.current);
      }

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!sectionVisible || view !== "email") {
      return;
    }

    const id = window.requestAnimationFrame(() => {
      setEmailVisible(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, [sectionVisible, view]);

  const clearScheduledMotion = useCallback(() => {
    if (switchTimerRef.current) {
      window.clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }

    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const openForm = useCallback(
    (opts?: HomeContactFormOpenOptions) => {
      const instant = opts?.instant === true;

      if (view === "form") {
        scrollElementIntoView(sectionRef.current, instant ? { immediate: true } : undefined);
        return;
      }

      if (view !== "email") {
        return;
      }

      clearScheduledMotion();
      setFormError(null);
      setFormSuccess(false);

      if (instant) {
        flushSync(() => {
          setEmailVisible(false);
          setView("form");
          setFormVisible(false);
        });
        scrollElementIntoView(sectionRef.current, { immediate: true });
        if (pushContactFormHistoryEntry()) {
          contactFormHistorySealRef.current = true;
        }
        frameRef.current = window.requestAnimationFrame(() => {
          setFormVisible(true);
          frameRef.current = null;
        });
        return;
      }

      setEmailVisible(false);
      // Scroll while the email stack leaves. The section's top doesn't move when its content swaps,
      // so the form lands centered with no second correction.
      scrollElementIntoView(sectionRef.current);

      switchTimerRef.current = window.setTimeout(() => {
        setView("form");
        setFormVisible(false);
        switchTimerRef.current = null;
        if (pushContactFormHistoryEntry()) {
          contactFormHistorySealRef.current = true;
        }
        frameRef.current = window.requestAnimationFrame(() => {
          setFormVisible(true);
          frameRef.current = null;
        });
      }, EMAIL_TRANSITION_MS);
    },
    [view, clearScheduledMotion],
  );

  useEffect(() => {
    return registerHomeContactFormOpener(openForm);
  }, [openForm]);

  const showEmail = useCallback(() => {
    if (view !== "form") {
      return;
    }

    contactFormHistorySealRef.current = false;
    stripContactFormHashIfPresent();

    clearScheduledMotion();
    setFormError(null);
    setFormSuccess(false);
    setFormVisible(false);
    scrollElementIntoView(sectionRef.current);

    switchTimerRef.current = window.setTimeout(() => {
      setView("email");
      setEmailVisible(false);
      switchTimerRef.current = null;
      frameRef.current = window.requestAnimationFrame(() => {
        setEmailVisible(true);
        frameRef.current = null;
      });
    }, FORM_EXIT_MS);
  }, [view, clearScheduledMotion]);

  const showEmailRef = useRef(showEmail);
  useLayoutEffect(() => {
    showEmailRef.current = showEmail;
  }, [showEmail]);

  /** UI control or Escape — prefer `history.back()` when we own the `#contact-form` stack entry. */
  const dismissFormSheet = useCallback(() => {
    if (contactFormHistorySealRef.current) {
      window.history.back();
      return;
    }
    showEmail();
  }, [showEmail]);

  useEffect(() => {
    function onPopState() {
      if (document.documentElement.classList.contains("is-overlay-open")) {
        return;
      }
      if (viewRef.current !== "form") {
        return;
      }
      contactFormHistorySealRef.current = false;
      showEmailRef.current();
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useLayoutEffect(() => {
    if (peekHash() !== CONTACT_FORM_ELEMENT_ID || view !== "email") {
      return;
    }
    const id = window.requestAnimationFrame(() => {
      openForm({ instant: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [view, openForm]);

  useEffect(() => {
    if (view !== "form") {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      dismissFormSheet();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, dismissFormSheet]);

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    const form = event.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    setFormSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data: { error?: string } = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Could not send your message.");
        return;
      }
      form.reset();
      setFormSuccess(true);
    } catch {
      setFormError("Network error. Check your connection and try again.");
    } finally {
      setFormSubmitting(false);
    }
  };

  /** Copy the address with old-school feedback (goo morph + Win98 tooltip); mail app if copying is blocked. */
  const handleCopy = async (event: ReactMouseEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const keyboard = event.detail === 0;
    const pointX = keyboard ? 0 : event.clientX;
    const pointY = keyboard ? 0 : event.clientY;
    hapticTick();
    const copied = await copyText(content.email);
    if (!copied) {
      window.location.href = `mailto:${content.email}`;
      return;
    }

    // Tooltip is positioned inside the contact container (the positioned box that also hosts the trail field).
    const host = target.closest<HTMLElement>("[data-contact-content]") ?? sectionRef.current;
    if (!host) return;
    const box = host.getBoundingClientRect();
    const anchor = target.getBoundingClientRect();
    const x = keyboard ? anchor.left + anchor.width / 2 : pointX;
    const y = keyboard ? anchor.top + anchor.height / 2 : pointY;

    trailRef.current?.burst(x, y, 1.4);
    setToast({ x: x - box.left, y: y - box.top, key: Date.now() });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToast(null);
    }, 1400);
  };

  useEffect(
    () => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    },
    [],
  );

  return (
    <section
      ref={sectionRef}
      id="contact"
      className={`page-shell ${styles.section} ${view === "form" ? styles.sectionFormOpen : ""}`}
    >
      <span
        id={CONTACT_FORM_ELEMENT_ID}
        className={styles.contactFormHashAnchor}
        aria-hidden
        tabIndex={-1}
      />
      <div className={styles.stage}>
        {view === "email" ? (
          /* Contact: gooey email + direction-aware ink. Flow glyphs follow the pointer (or a dragging
             finger) inside the content block; clicks/taps anywhere send a ripple; action cells take a
             glyph wipe from the edge you enter and drain toward the edge you leave. */
          <div
            ref={revealAnchorRef}
            className={`${styles.emailView} ${layoutStyles.emailView}`}
            data-visible={emailVisible}
            data-contact-content=""
          >
            <div className={styles.mobileSectionTitle}>
              <h2 className={workSectionStyles.title}>Contact Me</h2>
            </div>

            <AsciiFlowField className={layoutStyles.field} handleRef={trailRef} />

            <div className={layoutStyles.block}>
              <p
                className={`${styles.contactStatus} ${layoutStyles.status}`}
                data-visible={emailVisible}
                style={{ "--contact-reveal-index": 0 } as CSSProperties}
              >
                <span className={styles.revealLine}>
                  <span className={styles.revealLineText}>
                    <span className={layoutStyles.statusLed} aria-hidden="true" />
                    Open to new projects
                  </span>
                </span>
                <span className={`${styles.revealLine} ${layoutStyles.statusResponse}`}>
                  <span className={styles.revealLineText}>{content.responseTime.replace(/\.$/, "")}</span>
                </span>
                <span className={styles.revealLine}>
                  <span className={styles.revealLineText}>
                    Warsaw <LiveClock zone="warsaw" format="time" className={layoutStyles.statusClock} />
                  </span>
                </span>
              </p>

              {/* The whole card copies (not just the glyphs); the inner link keeps keyboard access and
                  modifier-click → mail app. Touch swipes on the card scrub the goo instead (GooeyContactEmail). */}
              <div
                className={`${styles.contactGooeyCard} ${layoutStyles.gooCard}`}
                data-visible={emailVisible}
                data-gooey-area=""
                style={{ "--contact-reveal-index": 1 } as CSSProperties}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("a")) return;
                  void handleCopy(event);
                }}
              >
                <GooeyContactEmail
                  email={content.email}
                  hoverPhrase={hoverPhrase}
                  visible={emailVisible}
                  onActivate={handleCopy}
                />
              </div>

              <ul className={layoutStyles.actions}>
                <li>
                  {/* The banner above already copies; this is the other half: open a draft. */}
                  <a
                    href={`mailto:${content.email}`}
                    className={`${styles.contactChannelButton} ${layoutStyles.action}`}
                    data-action="mail"
                    aria-label="Open mail app"
                    data-visible={emailVisible}
                    style={{ "--contact-reveal-index": 2 } as CSSProperties}
                  >
                    <BookingButtonAscii className={layoutStyles.wipe} accent="--fg-color" clearance="text" quietQuery={COMPACT_CELLS_QUERY} directional glitch />
                    <GlitchText className={layoutStyles.actionNum} text="01" seed={11} />
                    <GlitchText className={styles.glitchLabel} text="Open mail app" seed={14} />
                    <GlitchText className={layoutStyles.actionMeta} text="↗" seed={16} />
                  </a>
                </li>
                <li>
                  <CalBookingTrigger
                    className={`${styles.contactChannelButton} ${layoutStyles.action}`}
                    data-action="call"
                    aria-label="Book a call"
                    data-visible={emailVisible}
                    style={{ "--contact-reveal-index": 3 } as CSSProperties}
                  >
                    <BookingButtonAscii className={layoutStyles.wipe} accent="--taskbar-flag-blue" clearance="text" quietQuery={COMPACT_CELLS_QUERY} directional glitch />
                    <GlitchText className={layoutStyles.actionNum} text="02" seed={23} />
                    <GlitchText className={styles.glitchLabel} text="Book a call" seed={26} />
                    <GlitchText className={layoutStyles.actionMeta} text="→" seed={28} />
                  </CalBookingTrigger>
                </li>
                <li>
                  <button
                    type="button"
                    className={`${styles.contactChannelButton} ${layoutStyles.action}`}
                    data-action="brief"
                    aria-label="Send a message"
                    data-visible={emailVisible}
                    style={{ "--contact-reveal-index": 4 } as CSSProperties}
                    onClick={() => openForm()}
                  >
                    <BookingButtonAscii className={layoutStyles.wipe} accent="--signal-color" clearance="text" quietQuery={COMPACT_CELLS_QUERY} directional glitch />
                    <GlitchText className={layoutStyles.actionNum} text="03" seed={37} />
                    <GlitchText className={styles.glitchLabel} text="Send a message" seed={40} />
                    <GlitchText className={layoutStyles.actionMeta} text="→" seed={42} />
                  </button>
                </li>
              </ul>
            </div>

            <CopyToast toast={toast} />
          </div>
        ) : null}

        {view === "form" ? (
          <div className={styles.formView} data-visible={formVisible}>
            <div className={styles.formColumn}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Send a message</h2>
                <button
                  type="button"
                  className={styles.formBackScreen}
                  data-visible={formVisible}
                  onClick={dismissFormSheet}
                >
                  Back
                </button>
              </div>

              <form
                className={styles.form}
                onSubmit={handleFormSubmit}
                aria-busy={formSubmitting}
                noValidate
              >
                <label className={styles.field} style={{ "--field-index": 0 } as CSSProperties}>
                  <span>Name</span>
                  <input type="text" name="name" autoComplete="name" required disabled={formSubmitting} />
                </label>

                <label className={styles.field} style={{ "--field-index": 1 } as CSSProperties}>
                  <span>Email</span>
                  <input type="email" name="email" autoComplete="email" required disabled={formSubmitting} />
                </label>

                <label
                  className={`${styles.field} ${styles.fieldWide}`}
                  style={{ "--field-index": 2 } as CSSProperties}
                >
                  <span>Message</span>
                  <textarea name="message" required disabled={formSubmitting} />
                </label>

                <div className={styles.formActions} style={{ "--field-index": 3 } as CSSProperties}>
                  <button
                    type="submit"
                    className={`link-underline ${styles.submitButton}`}
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? "Sending…" : "Send"}
                  </button>
                </div>

                {formError ? (
                  <p
                    className={`${styles.formStatus} ${styles.formStatusError}`}
                    style={{ "--field-index": 4 } as CSSProperties}
                    role="alert"
                  >
                    {formError}
                  </p>
                ) : null}
                {formSuccess ? (
                  <p
                    className={`${styles.formStatus} ${styles.formStatusSuccess}`}
                    style={{ "--field-index": 4 } as CSSProperties}
                    role="status"
                  >
                    Message sent. Thank you.
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
