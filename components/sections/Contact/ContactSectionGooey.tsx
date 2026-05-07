"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { flushSync } from "react-dom";
import { useRevealOnView } from "@/components/motion/shared/useRevealOnView";
import {
  registerHomeContactFormOpener,
  type HomeContactFormOpenOptions,
} from "@/lib/homeContactForm";
import { CalBookingTrigger } from "@/components/booking/CalBookingTrigger";
import { scrollElementIntoView } from "@/lib/smoothScroll";
import { GooeyContactEmail } from "./GooeyContactEmail";
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

const EMAIL_TRANSITION_MS = 760;
const FORM_EXIT_MS = 420;

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

export function ContactSectionGooey({
  content,
  hoverPhrase = "Let's work together",
}: ContactSectionGooeyProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const switchTimerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const sectionVisible = useRevealOnView(sectionRef, { rootMargin: "0px 0px -12% 0px" });
  const [view, setView] = useState<ContactView>("email");
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
          scrollElementIntoView(sectionRef.current);
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
          <div className={styles.emailView} data-visible={emailVisible}>
            <div className={styles.mobileSectionTitle}>
              <h2 className={workSectionStyles.title}>Contact Me</h2>
            </div>
            <CalBookingTrigger
              className={`link-underline ${styles.contactChannelButton}`}
              data-visible={emailVisible}
            >
              Schedule a call
            </CalBookingTrigger>

            <div className={styles.contactGooeyCard} data-visible={emailVisible}>
              <GooeyContactEmail email={content.email} hoverPhrase={hoverPhrase} visible={emailVisible} />
            </div>

            <button
              type="button"
              className={`link-underline ${styles.contactChannelButton}`}
              data-visible={emailVisible}
              onClick={() => openForm()}
            >
              Open contact form
            </button>
          </div>
        ) : null}

        {view === "form" ? (
          <div className={styles.formView} data-visible={formVisible}>
            <div className={styles.formBackRow}>
              <button
                type="button"
                className={styles.formBackScreen}
                data-visible={formVisible}
                onClick={dismissFormSheet}
              >
                Back
              </button>
            </div>

            <div className={styles.formColumn}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Send a message</h2>
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
                    {formSubmitting ? "Sending…" : "Submit"}
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
