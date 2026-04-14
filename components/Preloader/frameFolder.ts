const DARK_FRAME_FOLDER = "ascii/clean-walk-01-dark";
const LIGHT_FRAME_FOLDER = "ascii/clean-walk-01-light-invert";

export { DARK_FRAME_FOLDER, LIGHT_FRAME_FOLDER };

export function getFrameFolderForTheme(themeValue: string | null) {
  return themeValue === "dark" ? DARK_FRAME_FOLDER : LIGHT_FRAME_FOLDER;
}

export function getInitialFrameFolder() {
  if (typeof document === "undefined") {
    return LIGHT_FRAME_FOLDER;
  }

  return getFrameFolderForTheme(document.documentElement.getAttribute("data-theme"));
}
