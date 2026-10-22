import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GeistPixelGrid, GeistPixelSquare } from "geist/font/pixel";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { SiteAnalytics } from "@/components/analytics/SiteAnalytics";
import { PreloaderGate } from "@/components/Preloader/PreloaderGate";
import {
  FALLBACK_THEME_COLORS,
  ROOT_BACKGROUND_COLOR_VAR,
  ROOT_THEME_ATTRIBUTE,
} from "@/lib/browserChrome";
import { SITE_URL } from "@/lib/site";
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE, SITE_TITLE } from "@/lib/metadata";
import "@/styles/globals.scss";

const screenBody = Geist({
  subsets: ["latin"],
  variable: "--font-body",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});
const fontVariables = `${GeistPixelGrid.variable} ${GeistPixelSquare.variable} ${screenBody.variable} ${geistMono.variable}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    url: SITE_URL,
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE.url],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: FALLBACK_THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: FALLBACK_THEME_COLORS.dark },
  ],
};

const bootstrapScript = `
(() => {
  const html = document.documentElement;
  html.classList.add("js-enabled");

  // Reveal policy (lib/revealRestore.ts): reload / back-forward documents are restores — content at or
  // above the landing position is already known, so its entrances are skipped.
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    // Hash destinations are positioned after hydration; never paint Home at the top in between.
    if (location.pathname === "/" && ["#work", "#contact", "#contact-form"].includes(location.hash) && nav?.type !== "back_forward") {
      html.classList.add("home-section-initial-pending");
    }
    if (nav && (nav.type === "reload" || nav.type === "back_forward")) {
      html.classList.add("reveal-restore");
    }
  } catch (_error) {}

  // Track input before hydration, including programmatic dialog focus/restore.
  // Start in pointer mode: focus rings appear only once someone actually navigates by keyboard,
  // never for programmatic focus (dialog autofocus, focus restore) or non-navigation keys
  // like Escape / Space / scrolling.
  html.setAttribute("data-input-modality", "pointer");
  document.addEventListener("pointerdown", () => {
    html.setAttribute("data-input-modality", "pointer");
  }, { capture: true, passive: true });
  const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"];
  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const active = document.activeElement;
    const focusIsOnControl = active && active !== document.body && active !== html;
    if (event.key === "Tab" || (focusIsOnControl && ARROW_KEYS.includes(event.key))) {
      html.setAttribute("data-input-modality", "keyboard");
    }
  }, true);

  let theme = "light";
  try {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      theme = storedTheme;
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    }
  } catch (_error) {}
  html.setAttribute("${ROOT_THEME_ATTRIBUTE}", theme);

  const chromeColor = getComputedStyle(html)
    .getPropertyValue("${ROOT_BACKGROUND_COLOR_VAR}")
    .trim() || (theme === "dark" ? "${FALLBACK_THEME_COLORS.dark}" : "${FALLBACK_THEME_COLORS.light}");
  let themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement("meta");
    themeColorMeta.setAttribute("name", "theme-color");
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.setAttribute("content", chromeColor);

  let footerMode = "minimal";
  try {
    const storedFooterMode = localStorage.getItem("footerMode");
    if (storedFooterMode === "toolbar" || storedFooterMode === "minimal") {
      footerMode = storedFooterMode;
    }
  } catch (_error) {}
  html.setAttribute("data-footer-mode", footerMode);

  let shouldRun = true;
  try {
    shouldRun = sessionStorage.getItem("preloaded") !== "true";
  } catch (_error) {
    shouldRun = true;
  }

  html.setAttribute("data-preloader", shouldRun ? "run" : "skip");
  if (shouldRun) {
    html.classList.add("is-loading");
  } else {
    html.classList.remove("is-loading");
  }

  let bypassReveals = false;
  let degradeContact = false;
  try {
    const connection = navigator.connection;
    degradeContact = connection?.saveData === true;
    bypassReveals =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      degradeContact;
  } catch (_error) {}

  // Restores keep server-rendered content visible until hydration decides what is already "seen";
  // RevealPolicyController enables reveals in the same pre-paint commit, so nothing on screen hides.
  html.classList.toggle("reveals-enabled", !bypassReveals && !html.classList.contains("reveal-restore"));
  html.classList.toggle("reveals-bypassed", bypassReveals);
  html.classList.toggle("contact-degraded", degradeContact);
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      className={fontVariables}
      lang="en"
      data-theme="light"
      data-footer-mode="minimal"
      data-preloader="run"
      suppressHydrationWarning
    >
      <head>
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicons/dark/favicon-32x32.png"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicons/dark/favicon-16x16.png"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          href="/favicons/dark/favicon.ico"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-icon"
          href="/favicons/dark/apple-touch-icon.png"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicons/light/favicon-32x32.png"
          media="(prefers-color-scheme: dark)"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicons/light/favicon-16x16.png"
          media="(prefers-color-scheme: dark)"
        />
        <link
          rel="icon"
          href="/favicons/light/favicon.ico"
          media="(prefers-color-scheme: dark)"
        />
        <link
          rel="apple-touch-icon"
          href="/favicons/light/apple-touch-icon.png"
          media="(prefers-color-scheme: dark)"
        />
        <script dangerouslySetInnerHTML={{ __html: bootstrapScript }} />
      </head>
      <body>
        <PreloaderGate>
          {children}
        </PreloaderGate>
        <SpeedInsights />
        <Analytics />
        <SiteAnalytics />
      </body>
    </html>
  );
}
