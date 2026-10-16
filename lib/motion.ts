/**
 * JS mirror of the motion tokens in `styles/globals.scss` (`--ease-*`, `--duration-*`).
 * WAAPI `easing` cannot read CSS variables: `EASE` holds the cubic fallbacks; use `resolveEase`
 * to pick up the spring (`linear()`) version the stylesheet defines where supported.
 */
export const EASE = {
  out: "cubic-bezier(0.23, 1, 0.32, 1)",
  outStrong: "cubic-bezier(0.16, 1, 0.32, 1)",
  outSoft: "cubic-bezier(0.33, 1, 0.68, 1)",
  reveal: "cubic-bezier(0.2, 0.88, 0.24, 1)",
  move: "cubic-bezier(0.32, 0, 0.2, 1)",
  inOut: "cubic-bezier(0.77, 0, 0.175, 1)",
  draw: "cubic-bezier(0.5, 0, 0.2, 1)",
  drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
} as const;

/** Current value of an `--ease-*` token (spring `linear()` where supported), else the cubic fallback. */
export function resolveEase(token: keyof typeof EASE_TOKEN): string {
  if (typeof window === "undefined") {
    return EASE[token];
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(EASE_TOKEN[token]).trim();
  return value || EASE[token];
}

const EASE_TOKEN = {
  out: "--ease-out",
  outStrong: "--ease-out-strong",
  outSoft: "--ease-out-soft",
  reveal: "--ease-reveal",
  move: "--ease-move",
  inOut: "--ease-in-out",
  draw: "--ease-draw",
  drawer: "--ease-drawer",
} as const satisfies Record<keyof typeof EASE, string>;

export const DURATION_MS = {
  press: 120,
  release: 320,
  fast: 200,
  exit: 240,
  base: 280,
  revealFade: 420,
  revealMove: 720,
  draw: 820,
  drawLong: 1000,
} as const;

export const STAGGER_MS = {
  tight: 30,
  base: 70,
  loose: 110,
} as const;
