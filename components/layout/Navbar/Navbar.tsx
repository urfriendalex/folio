"use client";

import { useEffect, useEffectEvent, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTimeZoneStatus } from "@/components/layout/Footer/TimeZoneStatus";
import { useOverlay } from "@/components/ui/Overlay/OverlayProvider";
import { contactContent } from "@/content/contact";
import { getAnchor } from "@/lib/navLinks";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";
import { scrollElementIntoView, scrollToHeroSection } from "@/lib/smoothScroll";
import styles from "./Navbar.module.scss";

function GradientBlur() {
  return (
    <div className={styles.gradientBlur} aria-hidden="true">
      <div className={styles.gradientBlurStrip}>
        {Array.from({ length: 8 }, (_, index) => (
          <span
            key={index}
            className={styles.gradientBlurLayer}
            data-layer={index}
          />
        ))}
        <div className={styles.gradientBlurAtmosphere} />
      </div>
      <div className={styles.gradientBlurOverlay} />
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { openAbout, activeOverlay } = useOverlay();
  const [menuOpen, setMenuOpen] = useState(false);
  const firstMenuActionRef = useRef<HTMLButtonElement | null>(null);
  const prevOverlayRef = useRef<typeof activeOverlay>(null);
  const closeMenuOnRouteChange = useEffectEvent(() => {
    setMenuOpen(false);
  });
  const timeZoneStatus = useTimeZoneStatus();
  const sameAsWarsaw = timeZoneStatus.offsetMinutes === 0;

  useEffect(() => {
    let frame = 0;

    if (prevOverlayRef.current === "about" && activeOverlay === null) {
      frame = window.requestAnimationFrame(() => {
        setMenuOpen(false);
      });
    }

    prevOverlayRef.current = activeOverlay;

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [activeOverlay]);

  useEffect(() => {
    const onBeforeAboutClose = () => {
      document.documentElement.classList.add("nav-overlay-instant");
      setMenuOpen(false);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document.documentElement.classList.remove("nav-overlay-instant");
        });
      });
    };

    window.addEventListener("folio:before-about-close", onBeforeAboutClose);

    return () => {
      window.removeEventListener("folio:before-about-close", onBeforeAboutClose);
    };
  }, []);

  useEffect(() => {
    closeMenuOnRouteChange();
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

    if (window.location.hash !== "#hero") {
      return;
    }

    const el = document.getElementById("hero");

    if (!el) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollElementIntoView(el);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const html = document.documentElement;

    if (menuOpen) {
      lockBodyScroll();
      html.classList.add("is-nav-open");
    } else {
      html.classList.remove("is-nav-open");
      unlockBodyScroll();
    }

    return () => {
      html.classList.remove("is-nav-open");
      unlockBodyScroll();
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    const frame = window.requestAnimationFrame(() => {
      firstMenuActionRef.current?.focus();
    });

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 48.0625rem)");

    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMenuOpen(false);
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const openAboutFromMenu = () => {
    document.documentElement.classList.add("nav-overlay-instant");
    setMenuOpen(false);
    openAbout();
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.documentElement.classList.remove("nav-overlay-instant");
      });
    });
  };

  const handleLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    if (pathname === "/") {
      event.preventDefault();
      scrollToHeroSection();
      return;
    }

    event.preventDefault();
    router.push("/#hero");
  };

  return (
    <header className={styles.header}>
      <GradientBlur />
      <div className={`page-shell ${styles.inner}`}>
        <Link
          href="/#hero"
          scroll={false}
          className={styles.logo}
          aria-label="Alexander Yansons"
          onClick={handleLogoClick}
        >
          <span aria-hidden="true">A</span>
          <span aria-hidden="true" className={styles.hiddenPart}>
            LEXANDER
          </span>
          <span aria-hidden="true" className={styles.initialY}>
            Y
          </span>
          <span aria-hidden="true" className={styles.hiddenSurname}>
            ANSONS
          </span>
          <span aria-hidden="true" className={styles.dot}>
            .
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <button type="button" onClick={openAbout} className={`link-underline ${styles.navLink}`}>
            About
          </button>
          <a href={getAnchor(pathname, "work")} className={`link-underline ${styles.navLink}`}>
            Work
          </a>
          <Link
            href="/archive"
            className={`link-underline ${styles.navLink} ${styles.archiveNavLink}`}
          >
            Archive
          </Link>
          <a href={getAnchor(pathname, "contact")} className={`link-underline ${styles.navLink}`}>
            Contact
          </a>
        </nav>

        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span className={styles.menuButtonLine} />
          <span className={styles.menuButtonLine} />
        </button>
      </div>

      <div
        id="mobile-navigation"
        className={styles.mobileOverlay}
        data-open={menuOpen}
        aria-hidden={!menuOpen}
      >
        <div className={`page-shell ${styles.mobileOverlayInner}`}>
          <nav className={styles.mobileNav} aria-label="Mobile primary">
            <button
              ref={firstMenuActionRef}
              type="button"
              className={`link-underline ${styles.mobileNavLink}`}
              style={{ "--item-index": 0 } as CSSProperties}
              onClick={openAboutFromMenu}
            >
              About
            </button>
            <a
              href={getAnchor(pathname, "work")}
              className={`link-underline ${styles.mobileNavLink}`}
              style={{ "--item-index": 1 } as CSSProperties}
              onClick={() => setMenuOpen(false)}
            >
              Work
            </a>
            <Link
              href="/archive"
              className={`link-underline ${styles.mobileNavLink} ${styles.archiveNavLink}`}
              style={{ "--item-index": 2 } as CSSProperties}
              onClick={() => setMenuOpen(false)}
            >
              Archive
            </Link>
            <a
              href={getAnchor(pathname, "contact")}
              className={`link-underline ${styles.mobileNavLink}`}
              style={{ "--item-index": 3 } as CSSProperties}
              onClick={() => setMenuOpen(false)}
            >
              Contact
            </a>
          </nav>

          <div className={styles.mobileFooterRow}>
            <div className={styles.mobileClockBlock}>
              {sameAsWarsaw ? (
                <span className={styles.mobileClockMono}>{timeZoneStatus.warsawClockLine}</span>
              ) : (
                <>
                  <span className={styles.mobileClockLine}>
                    <span className={styles.mobileClockLabel}>Warsaw</span>
                    <span className={styles.mobileClockValue}>{timeZoneStatus.warsawClockLine}</span>
                  </span>
                  <span className={styles.mobileClockLine}>
                    <span className={styles.mobileClockLabel}>Your time</span>
                    <span className={styles.mobileClockValue}>{timeZoneStatus.visitorClockLine}</span>
                  </span>
                </>
              )}
            </div>
            <div className={styles.mobileFooterLinks}>
              <a
                href={contactContent.instagram}
                className={`link-underline ${styles.mobileFooterLink}`}
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
              <a
                href={contactContent.linkedin}
                className={`link-underline ${styles.mobileFooterLink}`}
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
