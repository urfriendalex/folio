"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import packageJson from "../../../package.json";
import ASCIIAnimation from "@/components/Preloader/ascii";
import { contactContent } from "@/content/contact";
import { heroContent } from "@/content/hero";
import { wordmarkFontSizePxForWidth } from "@/lib/footerWordmarkFitPretext";
import { getLenis, scrollToTop } from "@/lib/smoothScroll";
import { useTimeZoneStatus } from "./TimeZoneStatus";
import styles from "./Footer.module.scss";

function footerCopyrightLine(year: number, legalEntity?: string) {
  const base = `© ${year} Alexander Yansons`;
  const trimmed = legalEntity?.trim();
  return trimmed ? `${base} · ${trimmed}` : base;
}

function portalIntoHost(hostId: string, node: ReactNode) {
  if (typeof document === "undefined") {
    return null;
  }
  const host = document.getElementById(hostId);
  return host ? createPortal(node, host) : null;
}

type Theme = "dark" | "light";
type FooterMode = "toolbar" | "minimal";
type StartSubmenu = "about" | "contact" | "connect" | null;
type StartSubmenuKey = "about" | "contact" | "connect";

type QuickLink = {
  href: string;
  label: string;
  shortLabel: string;
};

const QUICK_LINKS: QuickLink[] = [
  { href: contactContent.instagram, label: "Instagram", shortLabel: "IG" },
  { href: contactContent.linkedin, label: "LinkedIn", shortLabel: "LI" },
  { href: contactContent.threads, label: "Threads", shortLabel: "TH" },
  { href: contactContent.github, label: "GitHub", shortLabel: "GH" },
];

const MOBILE_QUERY = "(max-width: 48rem)";

function formatLocalTimeWithShortZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(date);
}

function subscribeToDocumentAttribute(attributeName: string, onStoreChange: () => void) {
  if (typeof document === "undefined") {
    return () => {};
  }

  const observer = new MutationObserver(() => {
    onStoreChange();
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [attributeName],
  });

  return () => observer.disconnect();
}

function subscribeTheme(onStoreChange: () => void) {
  return subscribeToDocumentAttribute("data-theme", onStoreChange);
}

function subscribeFooterMode(onStoreChange: () => void) {
  return subscribeToDocumentAttribute("data-footer-mode", onStoreChange);
}

function subscribeMobileViewport(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getMobileViewportSnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerMobileViewportSnapshot(): boolean {
  return false;
}

function getThemeSnapshot(): Theme {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function getFooterModeSnapshot(): FooterMode {
  if (typeof document === "undefined") {
    return "toolbar";
  }

  return document.documentElement.getAttribute("data-footer-mode") === "minimal" ? "minimal" : "toolbar";
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

function getServerFooterModeSnapshot(): FooterMode {
  return "toolbar";
}

function setRootTheme(nextTheme: Theme) {
  const html = document.documentElement;
  html.setAttribute("data-theme", nextTheme);

  try {
    localStorage.setItem("theme", nextTheme);
  } catch {}
}

function setRootFooterMode(nextFooterMode: FooterMode) {
  const html = document.documentElement;
  html.setAttribute("data-footer-mode", nextFooterMode);

  try {
    localStorage.setItem("footerMode", nextFooterMode);
  } catch {}
}

const FOOTER_WORDMARK_LINE = "ALEXANDER YANSONS";

/** One-line wordmark: font size from Pretext canvas measurement (no scrollWidth reflow). */
function FooterWordmarkStrip({ theme }: { theme: Theme }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLParagraphElement | null>(null);

  useLayoutEffect(() => {
    void theme;
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) {
      return;
    }

    let rafId = 0;
    let cancelled = false;

    const fit = () => {
      /* Content box of the full-bleed strip (viewport minus safe-area padding only). */
      const maxW = container.clientWidth;
      if (maxW <= 1) {
        return;
      }

      const cs = getComputedStyle(text);
      const fontAtSize = (px: number) =>
        `${cs.fontStyle} ${cs.fontWeight} ${px}px ${cs.fontFamily}`;

      const px = wordmarkFontSizePxForWidth(FOOTER_WORDMARK_LINE, maxW, fontAtSize);
      text.style.fontSize = `${px}px`;
    };

    const scheduleFit = () => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        if (!cancelled) {
          fit();
        }
      });
    };

    const run = () => {
      if (cancelled) {
        return;
      }
      scheduleFit();
    };

    void document.fonts.ready.then(run);
    run();

    const resizeObserver = new ResizeObserver(run);
    resizeObserver.observe(container);

    window.addEventListener("resize", run, { passive: true });
    const vv = window.visualViewport;
    vv?.addEventListener("resize", run);
    vv?.addEventListener("scroll", run);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", run);
      vv?.removeEventListener("resize", run);
      vv?.removeEventListener("scroll", run);
      text.style.removeProperty("font-size");
    };
  }, [theme]);

  return (
    <div className={styles.wordmarkReveal}>
      <div ref={containerRef} className={styles.wordmarkRevealInner}>
        <p ref={textRef} className={styles.wordmark} aria-label="Alexander Yansons">
          {FOOTER_WORDMARK_LINE}
        </p>
      </div>
    </div>
  );
}

export function Footer() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);
  const footerMode = useSyncExternalStore(
    subscribeFooterMode,
    getFooterModeSnapshot,
    getServerFooterModeSnapshot,
  );
  const timeZoneStatus = useTimeZoneStatus();
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayMenuOpen, setDisplayMenuOpen] = useState(false);
  const [startSubmenu, setStartSubmenu] = useState<StartSubmenu>(null);
  const isMobileViewport = useSyncExternalStore(
    subscribeMobileViewport,
    getMobileViewportSnapshot,
    getServerMobileViewportSnapshot,
  );
  const [toolbarHovered, setToolbarHovered] = useState(false);
  const [asciiRevealKey, setAsciiRevealKey] = useState(0);
  const [clientPortalsReady, setClientPortalsReady] = useState(false);
  const footerRef = useRef<HTMLElement | null>(null);
  const launcherButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstMenuActionRef = useRef<HTMLButtonElement | null>(null);
  const displayToggleRef = useRef<HTMLButtonElement | null>(null);
  const toolbarModeButtonRef = useRef<HTMLButtonElement | null>(null);
  const minimalModeButtonRef = useRef<HTMLButtonElement | null>(null);
  const year = new Date().getFullYear();
  const localClock =
    timeZoneStatus.visitorTimeZone !== "Resolving local timezone..."
      ? formatLocalTimeWithShortZone(new Date(), timeZoneStatus.visitorTimeZone)
      : "—";

  /** Same offset as Warsaw — avoid repeating local vs studio clocks. */
  const sameAsWarsaw = timeZoneStatus.offsetMinutes === 0;

  /** Mobile always uses the editorial “minimal” layout; no toolbar chrome. */
  const minimalFooter = isMobileViewport || footerMode === "minimal";
  /** Desktop + toolbar: only the taskbar (editorial + wordmark hidden). */
  const desktopToolbar = !isMobileViewport && footerMode === "toolbar";
  const showDisplayModeToggle = footerMode === "minimal" && !isMobileViewport;

  useLayoutEffect(() => {
    queueMicrotask(() => setClientPortalsReady(true));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMenuOpen(false);
        setDisplayMenuOpen(false);
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  /**
   * Fixed wordmark lives in AppShell. Show only once the footer's vertical midpoint has crossed the
   * viewport bottom (not when the window bottom merely meets the footer's top).
   */
  useEffect(() => {
    const host = document.getElementById("footer-wordmark-underlay");
    if (!host) {
      return;
    }

    if (!minimalFooter) {
      host.removeAttribute("data-footer-wordmark-active");
      return;
    }

    const footer = footerRef.current;
    if (!footer) {
      return;
    }

    const update = () => {
      const rect = footer.getBoundingClientRect();
      const vh = window.innerHeight;
      const centerY = rect.top + rect.height * 0.5;
      const footerIntersectsViewport = rect.top < vh && rect.bottom > 0;
      const centerPastBottomEdge = centerY <= vh;
      const active = footerIntersectsViewport && centerPastBottomEdge;

      if (active) {
        host.setAttribute("data-footer-wordmark-active", "true");
      } else {
        host.removeAttribute("data-footer-wordmark-active");
      }
    };

    update();

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(footer);

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    const lenis = getLenis();
    const unsubscribeLenis = lenis?.on("scroll", update);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      unsubscribeLenis?.();
      host.removeAttribute("data-footer-wordmark-active");
    };
  }, [minimalFooter]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (footerRef.current?.contains(target)) {
        return;
      }

      setMenuOpen(false);
      setDisplayMenuOpen(false);
      setStartSubmenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setMenuOpen(false);
      setDisplayMenuOpen(false);
      setStartSubmenu(null);
      window.requestAnimationFrame(() => {
        launcherButtonRef.current?.focus();
      });
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const focusModeButton = (mode: FooterMode) => {
    window.requestAnimationFrame(() => {
      if (mode === "minimal") {
        minimalModeButtonRef.current?.focus();
        return;
      }

      toolbarModeButtonRef.current?.focus();
    });
  };

  const closeMenu = (returnFocus = false) => {
    setMenuOpen(false);
    setDisplayMenuOpen(false);
    setStartSubmenu(null);

    if (returnFocus) {
      window.requestAnimationFrame(() => {
        launcherButtonRef.current?.focus();
      });
    }
  };

  const openMenu = (focusFirstAction = false) => {
    setMenuOpen(true);
    setDisplayMenuOpen(false);
    setStartSubmenu(null);

    if (focusFirstAction) {
      window.requestAnimationFrame(() => {
        firstMenuActionRef.current?.focus();
      });
    }
  };

  const toggleTheme = () => {
    setRootTheme(theme === "dark" ? "light" : "dark");
  };

  const setFooterMode = (nextFooterMode: FooterMode) => {
    setRootFooterMode(nextFooterMode);
    setDisplayMenuOpen(false);

    if (nextFooterMode === "minimal") {
      setMenuOpen(false);
    }
  };

  const handleLauncherKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      return;
    }

    event.preventDefault();

    if (menuOpen) {
      closeMenu(true);
      return;
    }

    openMenu(true);
  };

  const handleDisplayToggle = () => {
    const nextOpen = !displayMenuOpen;
    setDisplayMenuOpen(nextOpen);
    if (nextOpen) {
      setStartSubmenu(null);
      focusModeButton(footerMode);
    }
  };

  const handleDisplayToggleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowRight", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setDisplayMenuOpen(true);
      focusModeButton(footerMode);
      return;
    }

    if (event.key === "ArrowLeft" && displayMenuOpen) {
      event.preventDefault();
      setDisplayMenuOpen(false);
    }
  };

  const handleDisplayModeKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    nextFocus: FooterMode,
  ) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      focusModeButton(nextFocus);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setDisplayMenuOpen(false);
      window.requestAnimationFrame(() => {
        displayToggleRef.current?.focus();
      });
    }
  };

  const handleBackToTop = () => {
    scrollToTop();
    closeMenu();
  };

  const handleCascadingRowEnter = (key: StartSubmenuKey) => () => {
    setDisplayMenuOpen(false);
    setStartSubmenu(key);
  };

  const handleCascadingRowLeave =
    (key: StartSubmenuKey) => (event: ReactMouseEvent<HTMLDivElement>) => {
      const next = event.nativeEvent.relatedTarget;
      if (next instanceof Node && event.currentTarget.contains(next)) return;
      setStartSubmenu((current) => (current === key ? null : current));
    };

  const handleDisplayRowEnter = () => {
    setStartSubmenu(null);
    setDisplayMenuOpen(true);
  };

  const handleDisplayRowLeave = (event: ReactMouseEvent<HTMLDivElement>) => {
    const next = event.nativeEvent.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setDisplayMenuOpen(false);
  };

  const displayControlBlock = (
    <div className={styles.displayControl}>
      <button
        ref={displayToggleRef}
        type="button"
        className={styles.inlineControlButton}
        aria-expanded={displayMenuOpen}
        aria-controls="footer-display-menu-inline"
        aria-haspopup="menu"
        onClick={handleDisplayToggle}
        onKeyDown={handleDisplayToggleKeyDown}
      >
        <span>Display</span>
        <span className={styles.inlineControlChevron} aria-hidden="true">
          ▸
        </span>
      </button>

      <div
        id="footer-display-menu-inline"
        className={styles.displayMenu}
        data-open={displayMenuOpen}
        role="menu"
      >
        <button
          ref={toolbarModeButtonRef}
          type="button"
          role="menuitemradio"
          aria-checked={footerMode === "toolbar"}
          className={styles.winMenuChoice}
          data-active={footerMode === "toolbar"}
          onClick={() => setFooterMode("toolbar")}
          onKeyDown={(event) => handleDisplayModeKeyDown(event, "minimal")}
        >
          <span className={styles.winMenuCheck} aria-hidden="true">
            {footerMode === "toolbar" ? "✓" : ""}
          </span>
          Toolbar
        </button>
        <button
          ref={minimalModeButtonRef}
          type="button"
          role="menuitemradio"
          aria-checked={footerMode === "minimal"}
          className={styles.winMenuChoice}
          data-active={footerMode === "minimal"}
          onClick={() => setFooterMode("minimal")}
          onKeyDown={(event) => handleDisplayModeKeyDown(event, "toolbar")}
        >
          <span className={styles.winMenuCheck} aria-hidden="true">
            {footerMode === "minimal" ? "✓" : ""}
          </span>
          Minimal
        </button>
      </div>
    </div>
  );

  return (
    <footer
      ref={footerRef}
      className={`${styles.footer} ${desktopToolbar ? styles.footerToolbarOnly : ""}`}
      data-footer-mode={footerMode}
      data-footer-presentation={minimalFooter ? "minimal" : "toolbar"}
    >
      {minimalFooter && (
        <>
          <div className={styles.minimalFooterCover}>
            <div className={`page-shell ${styles.inner}`}>
              <div className={styles.editorial}>
                <div className={styles.editorialCol}>
                  <p className={styles.editorialLead}>{contactContent.availability}</p>
                  {contactContent.availabilityAi.trim() ? (
                    <p className={styles.editorialBody}>{contactContent.availabilityAi}</p>
                  ) : null}
                  <p className={styles.editorialBody}>{contactContent.responseTime}</p>
                </div>

                <div className={styles.editorialCol}>
                  <p className={styles.editorialIntro}>{contactContent.editorialIntro}</p>
                  <a
                    href={`mailto:${contactContent.email}`}
                    className={`link-underline ${styles.editorialEmail}`}
                  >
                    {contactContent.email}
                  </a>
                  <span className={styles.connectLabel}>Connect</span>
                  <ul className={styles.connectList}>
                    {QUICK_LINKS.map((link) => (
                      <li key={link.label}>
                        <a href={link.href} className={`link-underline ${styles.connectLink}`}>
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={styles.editorialCol}>
                  <div className={styles.localeBlock}>
                    <span className={styles.localeLabel}>Location</span>
                    <span className={styles.localeValue}>{contactContent.location}</span>
                  </div>
                  {sameAsWarsaw ? (
                    <div className={styles.localeBlock}>
                      <span className={styles.localeLabel}>Time</span>
                      <span className={styles.localeValue}>{localClock}</span>
                      <p className={styles.localeMeta}>
                        {`${timeZoneStatus.visitorTimeZone} · ${timeZoneStatus.offsetLabel}`}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className={styles.localeBlock}>
                        <span className={styles.localeLabel}>Your time</span>
                        <span className={styles.localeValue}>{localClock}</span>
                      </div>
                      <div className={styles.localeBlock}>
                        <span className={styles.localeLabel}>Warsaw (studio)</span>
                        <span className={styles.localeValue}>{`${timeZoneStatus.warsawTime} · WAW`}</span>
                      </div>
                      <p className={styles.localeMeta}>{timeZoneStatus.offsetLabel}</p>
                    </>
                  )}

                  <div className={styles.columnControls}>
                    <button
                      type="button"
                      className={`link-underline ${styles.columnControlBtn}`}
                      onClick={toggleTheme}
                      aria-pressed={theme === "dark"}
                    >
                      {theme === "dark" ? "Light mode" : "Dark mode"}
                    </button>
                    <button
                      type="button"
                      className={`link-underline ${styles.columnControlBtn}`}
                      onClick={() => scrollToTop()}
                    >
                      Back to top
                    </button>
                    {showDisplayModeToggle && displayControlBlock}
                  </div>
                </div>
              </div>

              <div className={styles.brand}>
                {contactContent.footerStatement.trim() ? (
                  <p className={styles.brandStatement}>{contactContent.footerStatement}</p>
                ) : null}
                <div className={styles.brandMeta}>
                  <div className={styles.brandMetaStart}>
                    <span className={styles.brandTagline}>{heroContent.position}</span>
                  </div>
                  <span className={styles.brandCopyright}>
                    {footerCopyrightLine(year, contactContent.footerLegalEntity)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {clientPortalsReady &&
            portalIntoHost("footer-wordmark-underlay", <FooterWordmarkStrip theme={theme} />)}
        </>
      )}

      {desktopToolbar &&
        clientPortalsReady &&
        portalIntoHost(
          "toolbar-ascii-portal",
          <div
            className={styles.asciiViewportOverlay}
            data-visible={toolbarHovered}
            aria-hidden={!toolbarHovered}
          >
            {toolbarHovered ? (
              <ASCIIAnimation
                key={asciiRevealKey}
                fillParent
                randomCellReveal
                randomCellRevealDurationMs={560}
                transparentCanvasBackground
                className={styles.asciiViewportInner}
                frameFolder="animations/0be291eb7c81020bd899984d1fdfdb48"
                frameCount={1}
                fps={15}
                lazy={false}
                quality="high"
                sourceFormat="color"
              />
            ) : null}
          </div>,
        )}

      {desktopToolbar && (
        <div className={styles.taskbarOuter}>
          <div
            className={styles.toolbarShell}
            onMouseEnter={() => {
              setToolbarHovered(true);
              setAsciiRevealKey((k) => k + 1);
            }}
            onMouseLeave={() => setToolbarHovered(false)}
          >
            <div className={styles.taskbar} role="group" aria-label="Portfolio footer taskbar">
              <div className={styles.taskbarLeft}>
                <button
                  ref={launcherButtonRef}
                  type="button"
                  className={styles.startButton}
                  aria-expanded={menuOpen}
                  aria-controls="footer-launcher-menu"
                  aria-label={menuOpen ? "Close Start menu" : "Open Start menu"}
                  onClick={() => {
                    if (menuOpen) {
                      closeMenu();
                      return;
                    }

                    openMenu();
                  }}
                  onKeyDown={handleLauncherKeyDown}
                >
                  <span className={styles.winFlag} aria-hidden="true" />
                  <span className={styles.startLabel}>Start</span>
                </button>

                <span className={styles.taskbarGroove} aria-hidden="true" />

                <div className={styles.quickLaunch} aria-label="Quick links">
                  {QUICK_LINKS.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className={styles.quickLaunchBtn}
                      title={link.label}
                      aria-label={link.label}
                    >
                      <span aria-hidden="true">{link.shortLabel}</span>
                    </a>
                  ))}
                </div>

                <span className={styles.taskbarGroove} aria-hidden="true" />
              </div>

              <div className={styles.taskbarRight}>
                <button
                  type="button"
                  className={styles.taskbarIconButton}
                  onClick={toggleTheme}
                  aria-pressed={theme === "dark"}
                  aria-label={`Theme is ${theme}. Switch to ${theme === "dark" ? "light" : "dark"} mode.`}
                >
                  <span className={styles.themeLamp} data-theme={theme} aria-hidden="true" />
                </button>

                <span className={styles.taskbarGroove} aria-hidden="true" />

                <div
                  className={styles.clockTray}
                  tabIndex={0}
                  aria-label={`Warsaw time ${timeZoneStatus.warsawDateTime}. Your local time ${timeZoneStatus.visitorDateTime}. ${timeZoneStatus.offsetLabel}.`}
                >
                  <span className={styles.clockValue}>{`${timeZoneStatus.warsawTime} WAW`}</span>
                  <div className={styles.clockTooltip} role="tooltip">
                    <div className={styles.winMenuPanel}>
                      {sameAsWarsaw ? (
                        <>
                          <p className={styles.winMenuTooltipPrimary}>{timeZoneStatus.warsawDateTime}</p>
                          <p className={styles.winMenuTooltipMeta}>
                            {`${timeZoneStatus.visitorTimeZone} · ${timeZoneStatus.offsetLabel}`}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className={styles.winMenuRow}>
                            <span className={styles.winMenuRowLabel}>Warsaw</span>
                            <span className={styles.winMenuRowValue}>{timeZoneStatus.warsawDateTime}</span>
                          </div>
                          <div className={styles.winMenuSeparator} aria-hidden="true" />
                          <div className={styles.winMenuRow}>
                            <span className={styles.winMenuRowLabel}>Your time</span>
                            <span className={styles.winMenuRowValue}>{timeZoneStatus.visitorDateTime}</span>
                          </div>
                          <p className={styles.winMenuTooltipMeta}>
                            {`${timeZoneStatus.visitorTimeZone} · ${timeZoneStatus.offsetLabel}`}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <span className={styles.taskbarVersion} title={`folio v${packageJson.version}`}>
                  v{packageJson.version}
                </span>
              </div>
            </div>

            <div
              id="footer-launcher-menu"
              className={styles.menuPanel}
              data-open={menuOpen}
              aria-hidden={!menuOpen}
            >
              <div className={styles.menuRail} aria-hidden="true">
                <span className={styles.menuRailCopyright}>
                  {footerCopyrightLine(year, contactContent.footerLegalEntity)}
                </span>
              </div>

              <div className={styles.menuContent}>
                <div className={styles.startMenuLayout}>
                  <nav className={styles.winMenuPanel} aria-label="Start menu">
                    <div
                      className={styles.startMenuRow}
                      onMouseEnter={handleCascadingRowEnter("about")}
                      onMouseLeave={handleCascadingRowLeave("about")}
                    >
                      <button
                        ref={firstMenuActionRef}
                        type="button"
                        className={styles.startMenuParent}
                        aria-expanded={startSubmenu === "about"}
                        aria-controls="footer-start-submenu-about"
                        id="footer-start-about"
                        onClick={() => {
                          setDisplayMenuOpen(false);
                          setStartSubmenu(startSubmenu === "about" ? null : "about");
                        }}
                      >
                        <span>About</span>
                        <span className={styles.menuSubmenuChevron} aria-hidden="true">
                          ▸
                        </span>
                      </button>
                      {startSubmenu === "about" ? (
                        <div
                          id="footer-start-submenu-about"
                          className={styles.startMenuFlyout}
                          role="menu"
                          aria-labelledby="footer-start-about"
                        >
                          <div className={styles.winMenuPanel}>
                            <p className={styles.menuProse}>{contactContent.availability}</p>
                            {contactContent.availabilityAi.trim() ? (
                              <p className={styles.menuProse}>{contactContent.availabilityAi}</p>
                            ) : null}
                            <p className={styles.menuProse}>{contactContent.responseTime}</p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div
                      className={styles.startMenuRow}
                      onMouseEnter={handleCascadingRowEnter("contact")}
                      onMouseLeave={handleCascadingRowLeave("contact")}
                    >
                      <button
                        type="button"
                        className={styles.startMenuParent}
                        aria-expanded={startSubmenu === "contact"}
                        aria-controls="footer-start-submenu-contact"
                        id="footer-start-contact"
                        onClick={() => {
                          setDisplayMenuOpen(false);
                          setStartSubmenu(startSubmenu === "contact" ? null : "contact");
                        }}
                      >
                        <span>Contact</span>
                        <span className={styles.menuSubmenuChevron} aria-hidden="true">
                          ▸
                        </span>
                      </button>
                      {startSubmenu === "contact" ? (
                        <div
                          id="footer-start-submenu-contact"
                          className={styles.startMenuFlyout}
                          role="menu"
                          aria-labelledby="footer-start-contact"
                        >
                          <div className={styles.winMenuPanel}>
                            <p className={styles.menuProse}>{heroContent.position}</p>
                            <p className={styles.menuProseMuted}>{contactContent.location}</p>
                            <a
                              href={`mailto:${contactContent.email}`}
                              className={styles.winMenuLink}
                              role="menuitem"
                              onClick={() => closeMenu()}
                            >
                              {contactContent.email}
                            </a>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div
                      className={styles.startMenuRow}
                      onMouseEnter={handleCascadingRowEnter("connect")}
                      onMouseLeave={handleCascadingRowLeave("connect")}
                    >
                      <button
                        type="button"
                        className={styles.startMenuParent}
                        aria-expanded={startSubmenu === "connect"}
                        aria-controls="footer-start-submenu-connect"
                        id="footer-start-connect"
                        onClick={() => {
                          setDisplayMenuOpen(false);
                          setStartSubmenu(startSubmenu === "connect" ? null : "connect");
                        }}
                      >
                        <span>Connect</span>
                        <span className={styles.menuSubmenuChevron} aria-hidden="true">
                          ▸
                        </span>
                      </button>
                      {startSubmenu === "connect" ? (
                        <div
                          id="footer-start-submenu-connect"
                          className={styles.startMenuFlyout}
                          role="menu"
                          aria-labelledby="footer-start-connect"
                        >
                          <div className={styles.winMenuPanel}>
                            {QUICK_LINKS.map((link) => (
                              <a
                                key={link.label}
                                href={link.href}
                                className={styles.winMenuLink}
                                role="menuitem"
                                onClick={() => closeMenu()}
                              >
                                {link.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className={styles.winMenuSeparator} aria-hidden="true" />
                    <button type="button" className={styles.winMenuItem} onClick={handleBackToTop}>
                      Back to top
                    </button>
                    <div
                      className={`${styles.startMenuRow} ${styles.displayControl}`}
                      onMouseEnter={handleDisplayRowEnter}
                      onMouseLeave={handleDisplayRowLeave}
                    >
                      <button
                        ref={displayToggleRef}
                        type="button"
                        className={styles.startMenuParent}
                        aria-expanded={displayMenuOpen}
                        aria-controls="footer-display-menu-panel"
                        aria-haspopup="menu"
                        onClick={handleDisplayToggle}
                        onKeyDown={handleDisplayToggleKeyDown}
                      >
                        <span>Display</span>
                        <span className={styles.menuSubmenuChevron} aria-hidden="true">
                          ▸
                        </span>
                      </button>

                      <div
                        id="footer-display-menu-panel"
                        className={styles.displayMenu}
                        data-open={displayMenuOpen}
                        role="menu"
                      >
                        <button
                          ref={toolbarModeButtonRef}
                          type="button"
                          role="menuitemradio"
                          aria-checked
                          className={styles.winMenuChoice}
                          data-active
                          onClick={() => setFooterMode("toolbar")}
                          onKeyDown={(event) => handleDisplayModeKeyDown(event, "minimal")}
                        >
                          <span className={styles.winMenuCheck} aria-hidden="true">
                            ✓
                          </span>
                          Toolbar
                        </button>
                        <button
                          ref={minimalModeButtonRef}
                          type="button"
                          role="menuitemradio"
                          aria-checked={false}
                          className={styles.winMenuChoice}
                          data-active={false}
                          onClick={() => setFooterMode("minimal")}
                          onKeyDown={(event) => handleDisplayModeKeyDown(event, "toolbar")}
                        >
                          <span className={styles.winMenuCheck} aria-hidden="true" />
                          Minimal
                        </button>
                      </div>
                    </div>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
