export type ThemeName = "dark" | "light";

export const ROOT_THEME_ATTRIBUTE = "data-theme";
export const ROOT_BACKGROUND_COLOR_VAR = "--bg-color";

export const FALLBACK_THEME_COLORS: Record<ThemeName, string> = {
  light: "#f7f6f2",
  dark: "#0d0d0d",
};

export function resolveBrowserChromeColor(theme: ThemeName): string {
  if (typeof document === "undefined") {
    return FALLBACK_THEME_COLORS[theme];
  }

  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue(ROOT_BACKGROUND_COLOR_VAR)
    .trim();

  return resolved || FALLBACK_THEME_COLORS[theme];
}

export function syncBrowserChromeTheme(theme: ThemeName) {
  if (typeof document === "undefined") {
    return;
  }

  const chromeColor = resolveBrowserChromeColor(theme);
  let themeColorMeta = document.querySelector('meta[name="theme-color"]');

  if (!themeColorMeta) {
    themeColorMeta = document.createElement("meta");
    themeColorMeta.setAttribute("name", "theme-color");
    document.head.appendChild(themeColorMeta);
  }

  themeColorMeta.setAttribute("content", chromeColor);
}
