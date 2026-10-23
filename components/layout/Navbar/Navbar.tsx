"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IntentPrefetchLink } from "@/components/navigation/IntentPrefetchLink";
import { allowNavigatorRoutePrefetch } from "@/lib/allowNavigatorRoutePrefetch";
import { pathnameFromHref, setRoutePending, useNavigationFlightLock } from "@/lib/useNavigationFlightLock";
import { DayShift, LiveClock, useTimeZoneInfo } from "@/components/layout/Footer/TimeZoneStatus";
import { useOverlay } from "@/components/ui/Overlay/OverlayProvider";
import { contactContent } from "@/content/contact";
import { getAnchor } from "@/lib/navLinks";
import { lockBodyScroll, onBodyScrollLock, skipNextScrollRestore, unlockBodyScroll } from "@/lib/scrollLock";
import { clearLocationHash, scrollToHeroSection } from "@/lib/smoothScroll";
import styles from "./Navbar.module.scss";
import { NavbarWordmark } from "./NavbarWordmark";

export function NavbarGradientBlur() {
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
  const { openAbout, closeOverlay, activeOverlay } = useOverlay();
  const [menuOpen, setMenuOpen] = useState(false);
  const firstMenuActionRef = useRef<HTMLButtonElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const prevOverlayRef = useRef<typeof activeOverlay>(null);
  const closeMenuOnRouteChange = useEffectEvent(() => {
    setMenuOpen(false);
  });
  /* Per-second ticking is isolated in <LiveClock>; the navbar itself re-renders at most once a minute. */
  const sameAsWarsaw = useTimeZoneInfo().offsetMinutes === 0;
  const { guardedPush, cancelPendingNav } = useNavigationFlightLock(pathname);
  /* Closing the menu means "stay here": a route still loading must not swap in afterwards. */
  const dismissMenu = () => {
    cancelPendingNav();
    setMenuOpen(false);
  };
  const dismissMenuOnEscape = useEffectEvent(dismissMenu);

  useEffect(() => {
    if (!allowNavigatorRoutePrefetch()) {
      return;
    }

    if (pathname === "/") {
      router.prefetch("/projects");
      return;
    }

    if (pathname !== "/archive" && pathname !== "/projects" && !pathname.startsWith("/projects/")) {
      return;
    }

    router.prefetch("/");
  }, [pathname, router]);

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
    const frame = window.requestAnimationFrame(closeMenuOnRouteChange);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  useEffect(() => {
    const html = document.documentElement;

    if (menuOpen) {
      html.classList.add("is-nav-open");
      lockBodyScroll();
    } else {
      html.classList.remove("is-nav-open");
    }

    return () => {
      if (menuOpen) {
        html.classList.remove("is-nav-open");
        unlockBodyScroll();
      }
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissMenuOnEscape();
      }
    };

    const menuButton = menuButtonRef.current;
    const frame = window.requestAnimationFrame(() => {
      firstMenuActionRef.current?.focus();
    });

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);

      const overlay = document.getElementById("mobile-navigation");
      if (overlay?.contains(document.activeElement)) {
        menuButton?.focus();
      }
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

  const handleOpenAbout = () => {
    cancelPendingNav();
    openAbout();
  };

  const openAboutFromMenu = () => {
    cancelPendingNav();
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

    if (activeOverlay === "about") {
      event.preventDefault();
      const unsubscribe = onBodyScrollLock({
        afterUnlock: () => {
          unsubscribe();
          window.requestAnimationFrame(() => {
            if (pathname === "/") {
              cancelPendingNav("/");
              clearLocationHash();
              scrollToHeroSection();
            } else {
              guardedPush("/", { scroll: true });
            }
          });
        },
      });
      closeOverlay();
      return;
    }

    if (pathname === "/") {
      event.preventDefault();
      cancelPendingNav("/");
      clearLocationHash();

      if (menuOpen) {
        /* Body is scroll-locked under the menu: land on the hero (top) instead of restoring the old offset. */
        skipNextScrollRestore();
        setMenuOpen(false);
        window.setTimeout(scrollToHeroSection, 0);
        return;
      }

      scrollToHeroSection();
      return;
    }

    event.preventDefault();
    guardedPush("/", { scroll: true });
  };

  /* Contact: in-page on `/` (keep the hash URL, drop any pending route); elsewhere the scroll provider
     pushes `/` itself, which supersedes whatever was loading. */
  const handleContactClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    const href = event.currentTarget.getAttribute("href") ?? "";

    if (href.startsWith("#")) {
      cancelPendingNav(`${window.location.pathname}${window.location.search}${href}`);
    } else {
      setRoutePending(null);
    }
  };

  const handleMobileContactClick = (event: MouseEvent<HTMLAnchorElement>) => {
    handleContactClick(event);
    setMenuOpen(false);
  };

  /* Cross-route menu links keep the overlay up while the next page loads; the pathname effect closes it
     once the new route has committed, so the fade reveals the destination instead of the old page. */
  const handleMobileRouteLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const href = event.currentTarget.getAttribute("href");
    if (
      !href ||
      pathnameFromHref(href) === pathname ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      setMenuOpen(false);
      return;
    }

    /* The body lock would otherwise restore the old page's scroll offset onto the new one. */
    skipNextScrollRestore();
  };

  const logoLink = (
    <NextLink
      href="/"
      prefetch={false}
      className={styles.logo}
      aria-label="Alexander Yansons"
      onClick={handleLogoClick}
    >
      <NavbarWordmark expanded={activeOverlay === "about"} />
    </NextLink>
  );

  return (
    <>
      <header className={styles.header} data-about-open={activeOverlay === "about"}>
        <div className={`page-shell ${styles.inner}`}>
          {logoLink}

          <nav className={styles.nav} aria-label="Primary">
            <button type="button" onClick={handleOpenAbout} className={`link-underline ${styles.navLink}`}>
              About
            </button>
            <IntentPrefetchLink
              href="/projects"
              className={`link-underline ${styles.navLink}`}
            >
              Work
            </IntentPrefetchLink>
            <IntentPrefetchLink
              href="/archive"
              className={`link-underline ${styles.navLink} ${styles.archiveNavLink}`}
            >
              Archive
            </IntentPrefetchLink>
            <a
              href={getAnchor(pathname, "contact")}
              className={`link-underline ${styles.navLink}`}
              onClick={handleContactClick}
            >
              Contact
            </a>
          </nav>

          <button
            ref={menuButtonRef}
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => (menuOpen ? dismissMenu() : setMenuOpen(true))}
          >
            <span className={styles.menuButtonLine} />
            <span className={styles.menuButtonLine} />
          </button>
        </div>
        <div className={styles.workToolbarSlot} data-work-toolbar-slot="true" />

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
              <IntentPrefetchLink
                href="/projects"
                className={`link-underline ${styles.mobileNavLink}`}
                style={{ "--item-index": 1 } as CSSProperties}
                onClick={handleMobileRouteLinkClick}
              >
                Work
              </IntentPrefetchLink>
              <IntentPrefetchLink
                href="/archive"
                className={`link-underline ${styles.mobileNavLink} ${styles.archiveNavLink}`}
                style={{ "--item-index": 2 } as CSSProperties}
                onClick={handleMobileRouteLinkClick}
              >
                Archive
              </IntentPrefetchLink>
              <a
                href={getAnchor(pathname, "contact")}
                className={`link-underline ${styles.mobileNavLink}`}
                style={{ "--item-index": 3 } as CSSProperties}
                onClick={handleMobileContactClick}
              >
                Contact
              </a>
            </nav>

            <div className={styles.mobileFooterRow}>
              <div className={styles.mobileClockBlock}>
                <span className={styles.mobileClock}>
                  <span className={styles.mobileClockLabel}>Warsaw</span>
                  <LiveClock zone="warsaw" format="time" className={styles.mobileClockValue} />
                </span>
                {sameAsWarsaw ? null : (
                  <span className={styles.mobileClock}>
                    <span className={styles.mobileClockLabel}>Your time</span>
                    <span className={styles.mobileClockValue}>
                      <LiveClock zone="visitor" format="time" />
                      <DayShift className={styles.mobileClockDayShift} />
                    </span>
                  </span>
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
    </>
  );
}
