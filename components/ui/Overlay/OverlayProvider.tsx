"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AboutOverlayContent } from "@/content/about";
import { Overlay } from "./Overlay";
import styles from "./OverlayProvider.module.scss";

type OverlayType = "about" | "contact" | null;

type OverlayContextValue = {
  closeOverlay: () => void;
  openAbout: () => void;
  openContactForm: () => void;
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

export function OverlayProvider({ children }: OverlayProviderProps) {
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const closeOverlay = () => {
    setActiveOverlay(null);
    window.requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  };

  const openOverlay = (type: OverlayType) => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActiveOverlay(type);
  };

  return (
    <OverlayContext.Provider
      value={{
        closeOverlay,
        openAbout: () => openOverlay("about"),
        openContactForm: () => openOverlay("contact"),
      }}
    >
      {children}
      {activeOverlay === "about" ? (
        <Overlay onClose={closeOverlay} title="About">
          <div className={styles.stack}>
            <h2>{AboutOverlayContent.title}</h2>
            {AboutOverlayContent.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Overlay>
      ) : null}
      {activeOverlay === "contact" ? (
        <Overlay onClose={closeOverlay} title="Contact form">
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
        </Overlay>
      ) : null}
    </OverlayContext.Provider>
  );
}
