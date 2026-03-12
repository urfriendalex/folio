import Link from "next/link";
import { contactContent } from "@/content/contact";
import { TimeZoneStatus } from "./TimeZoneStatus";
import styles from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.group}>
          <span className="section-label">Footer</span>
          <span>{contactContent.location}</span>
          <TimeZoneStatus />
        </div>
        <div className={styles.group}>
          <a href={`mailto:${contactContent.email}`} className="text-link">
            {contactContent.email}
          </a>
          <div className={styles.links}>
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
        <div className={styles.group}>
          <span>© 2026 Alexander Yansons</span>
          <Link href="/" className="text-link">
            Back to top
          </Link>
        </div>
      </div>
    </footer>
  );
}
