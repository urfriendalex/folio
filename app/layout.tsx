import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GeistPixelGrid, GeistPixelSquare } from "geist/font/pixel";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PreloaderGate } from "@/components/Preloader/PreloaderGate";
import {
  FALLBACK_THEME_COLORS,
  ROOT_BACKGROUND_COLOR_VAR,
  ROOT_THEME_ATTRIBUTE,
} from "@/lib/browserChrome";
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
  metadataBase: new URL("https://yansons.online"),
  title: "Alexander Yansons | Web Developer & Creative Technologist",
  description: "Portfolio of Alexander Yansons. Building custom web experiences from creative portfolios to complex SaaS products.",
  openGraph: {
    title: "Alexander Yansons | Web Developer & Creative Technologist",
    description:
      "Portfolio of Alexander Yansons. Building custom web experiences from creative portfolios to complex SaaS products.",
    type: "website",
    url: "https://yansons.online",
  },
  twitter: {
    card: "summary_large_image",
    title: "Alexander Yansons | Web Developer & Creative Technologist",
    description:
      "Portfolio of Alexander Yansons. Building custom web experiences from creative portfolios to complex SaaS products.",
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

  let footerMode = "toolbar";
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
      data-footer-mode="toolbar"
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
        <noscript>
          <div className="noscript-loader" role="status" aria-live="polite">
            <span className="noscript-loader__spinner" />
            <span>Loading portfolio…</span>
          </div>
        </noscript>
        <PreloaderGate>
          {children}
        </PreloaderGate>
        <SpeedInsights />
      </body>
    </html>
  );
}
