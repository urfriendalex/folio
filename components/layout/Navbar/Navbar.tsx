"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOverlay } from "@/components/ui/Overlay/OverlayProvider";
import styles from "./Navbar.module.scss";

function getAnchor(pathname: string, id: "work" | "contact") {
  return pathname === "/" ? `#${id}` : `/#${id}`;
}

export function Navbar() {
  const pathname = usePathname();
  const { openAbout } = useOverlay();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo} aria-label="Alexander Yansons">
          <span aria-hidden="true">A</span>
          <span aria-hidden="true" className={styles.hiddenPart}>
            LEXANDER
          </span>
          <span aria-hidden="true" className={styles.endingPart}>
            Y.
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <button type="button" onClick={openAbout} className="pill-button">
            About
          </button>
          <a href={getAnchor(pathname, "work")} className="pill-button">
            Work
          </a>
          <Link href="/archive" className="pill-button">
            Archive
          </Link>
          <a href={getAnchor(pathname, "contact")} className="pill-button">
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
}
