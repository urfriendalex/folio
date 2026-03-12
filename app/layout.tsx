import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Geist,
  Geist_Mono,
  Silkscreen,
} from "next/font/google";
import { PreloaderGate } from "@/components/Preloader/PreloaderGate";
import "@/styles/globals.scss";

const isDev = process.env.NODE_ENV !== "production";
const forcePreloaderDebug = isDev && process.env.NEXT_PUBLIC_PRELOADER_DEBUG === "1";
const pixelDisplay = Silkscreen({
  subsets: ["latin"],
  variable: "--font-pixel",
  weight: ["400", "700"],
});
const screenBody = Geist({
  subsets: ["latin"],
  variable: "--font-body",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://yansons.online"),
  title: "Alexander Yansons — Developer & Creative Technologist",
  description: "Portfolio foundation for development, motion, systems thinking, and experimental work.",
  openGraph: {
    title: "Alexander Yansons — Developer & Creative Technologist",
    description:
      "Portfolio foundation for development, motion, systems thinking, and experimental work.",
    type: "website",
    url: "https://yansons.online",
  },
  twitter: {
    card: "summary_large_image",
    title: "Alexander Yansons — Developer & Creative Technologist",
    description:
      "Portfolio foundation for development, motion, systems thinking, and experimental work.",
  },
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
  html.setAttribute("data-theme", theme);

  let shouldRun = true;
  try {
    const params = new URLSearchParams(window.location.search);
    const preloaderParam = params.get("preloader");
    const isDev = ${JSON.stringify(isDev)};
    const forceDebug = ${JSON.stringify(forcePreloaderDebug)};
    const debugMode =
      forceDebug || (isDev && (preloaderParam === "debug" || preloaderParam === "dbg"));

    html.setAttribute("data-preloader-debug", debugMode ? "on" : "off");

    if (debugMode) {
      sessionStorage.removeItem("preloaded");
      shouldRun = true;
    } else if (isDev && preloaderParam === "reset") {
      sessionStorage.removeItem("preloaded");
      shouldRun = true;
    } else if (isDev && preloaderParam === "1") {
      shouldRun = true;
    } else {
      shouldRun = sessionStorage.getItem("preloaded") !== "true";
    }
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
      lang="en"
      data-theme="light"
      data-preloader="run"
      data-preloader-debug="off"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootstrapScript }} />
      </head>
      <body className={`${pixelDisplay.variable} ${screenBody.variable} ${geistMono.variable}`}>
        <noscript>
          <div className="noscript-loader" role="status" aria-live="polite">
            <span className="noscript-loader__spinner" />
            <span>Loading portfolio…</span>
          </div>
        </noscript>
        <PreloaderGate>
          {children}
        </PreloaderGate>
      </body>
    </html>
  );
}
