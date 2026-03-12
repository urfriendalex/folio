"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CustomCursor } from "@/components/Cursor/CustomCursor";
import { SmoothScrollProvider } from "@/components/Scroll/SmoothScrollProvider";
import { siteMeta } from "@/lib/site-data";
import styles from "./SiteShell.module.scss";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("is-nav-open", navOpen);

    const scopedWindow = window as Window & {
      __lenis?: { start?: () => void; stop?: () => void };
    };

    if (navOpen) {
      scopedWindow.__lenis?.stop?.();
    } else {
      scopedWindow.__lenis?.start?.();
    }

    return () => {
      html.classList.remove("is-nav-open");
      scopedWindow.__lenis?.start?.();
    };
  }, [navOpen]);

  const toggleTheme = () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  return (
    <SmoothScrollProvider>
      <CustomCursor />
      <div className={styles.shell} data-app-shell="true">
        <header className={`${styles.header} panel-surface`}>
          <Link href="/" className={styles.brand} data-cursor-hidden="true">
            <span className={styles.brandMark}>AY</span>
            <span className={styles.brandName}>Alexander Y.</span>
          </Link>
          <div className={styles.headerActions}>
            <button
              type="button"
              onClick={toggleTheme}
              className={`${styles.themeButton} pill-button`}
            >
              theme
            </button>
            <button
              type="button"
              onClick={() => setNavOpen((open) => !open)}
              className={`${styles.menuButton} pill-button`}
            >
              {navOpen ? "Close" : "Menu"}
            </button>
          </div>
        </header>

        <div className={styles.nav} data-open={navOpen}>
          <div className={`${styles.navPanel} panel-surface`}>
            <nav className={styles.navLinks}>
              <Link href="/" onClick={() => setNavOpen(false)} data-cursor-hidden="true">
                Home
              </Link>
              <Link href="/#selected-work" onClick={() => setNavOpen(false)} data-cursor-hidden="true">
                Projects
              </Link>
              <Link href="/archive" onClick={() => setNavOpen(false)} data-cursor-hidden="true">
                Archive
              </Link>
              <a href="#contact" onClick={() => setNavOpen(false)} data-cursor-hidden="true">
                Contact
              </a>
            </nav>

            <aside className={styles.navAside}>
              <div>
                <span className="section-eyebrow">About</span>
                <p>{siteMeta.overlayBio}</p>
              </div>
              <div className={styles.navMeta}>
                <span>{siteMeta.email}</span>
                <span>{siteMeta.location}</span>
              </div>
            </aside>
          </div>
        </div>

        <div className={styles.content}>{children}</div>

        <footer id="contact" className={styles.footer}>
          <div className={`${styles.footerPanel} panel-surface`}>
            <div>
              <span className="section-eyebrow">Contact</span>
              <h2 className={styles.footerTitle}>contact</h2>
              <p className={styles.footerCopy}>{siteMeta.intro}</p>
            </div>
            <div className={styles.footerGroup}>
              <span>Get in touch</span>
              <a href={`mailto:${siteMeta.email}`} className="link-underline" data-cursor-hidden="true">
                {siteMeta.email}
              </a>
              <a href={siteMeta.instagram} className="link-underline" data-cursor-hidden="true">
                Instagram
              </a>
              <a href={siteMeta.linkedin} className="link-underline" data-cursor-hidden="true">
                LinkedIn
              </a>
            </div>
            <div className={styles.footerGroup}>
              <span>Info</span>
              <p>{siteMeta.location}</p>
              <p>minimal build.</p>
            </div>
          </div>
        </footer>
      </div>
    </SmoothScrollProvider>
  );
}
