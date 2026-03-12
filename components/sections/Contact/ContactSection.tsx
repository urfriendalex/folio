"use client";

import { useOverlay } from "@/components/ui/Overlay/OverlayProvider";
import styles from "./ContactSection.module.scss";

type ContactSectionProps = {
  email: string;
};

export function ContactSection({ email }: ContactSectionProps) {
  const { openContactForm } = useOverlay();

  return (
    <section id="contact" className={styles.section}>
      <div className={styles.inner}>
        <span className="section-label">Contact</span>
        <a href={`mailto:${email}`} className={styles.email}>
          {email}
        </a>
        <button type="button" className="pill-button" onClick={openContactForm}>
          Open form
        </button>
      </div>
    </section>
  );
}
