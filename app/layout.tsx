import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistPixelGrid, GeistPixelSquare } from "geist/font/pixel";
import { Geist, Geist_Mono } from "next/font/google";
import { PreloaderGate } from "@/components/Preloader/PreloaderGate";
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
      </body>
    </html>
  );
}
