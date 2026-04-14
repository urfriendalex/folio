/**
 * Approximate whether the painted surface behind a point is light (needs dark text)
 * or dark (needs light text), using computed solid backgrounds up the DOM tree.
 */

const LIGHT_THRESHOLD = 0.52;

function channelToLinear(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(r: number, g: number, b: number) {
  const R = channelToLinear(r);
  const G = channelToLinear(g);
  const B = channelToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function parseCssRgb(input: string): { r: number; g: number; b: number; a: number } | null {
  const s = input.trim();
  if (!s || s === "transparent") {
    return null;
  }

  const rgba = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/,
  );
  if (rgba) {
    const a = rgba[4] !== undefined ? Number.parseFloat(rgba[4]) : 1;
    return a < 0.02 ? null : { r: +rgba[1], g: +rgba[2], b: +rgba[3], a };
  }

  const hex = s.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hex) {
    const h = hex[1];
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);
    return { r, g, b, a: 1 };
  }

  return null;
}

function luminanceFromCssColor(css: string): number | null {
  const p = parseCssRgb(css);
  if (!p) {
    return null;
  }
  return relativeLuminance(p.r, p.g, p.b);
}

/** Unique #hex colors in a gradient string (computed style may list several stops). */
function hexColorsInGradientString(bgImage: string): string[] {
  const matches = bgImage.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const full = `#${m[1]}`;
    if (!seen.has(full)) {
      seen.add(full);
      out.push(full);
    }
  }
  return out;
}

/** rgb/rgba stops in a gradient (computed styles often use these with no hex). */
function rgbStopsInGradientString(bgImage: string): Array<{ r: number; g: number; b: number }> {
  const out: Array<{ r: number; g: number; b: number }> = [];
  const re =
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bgImage)) !== null) {
    const a = m[4] !== undefined ? Number.parseFloat(m[4]) : 1;
    if (a < 0.02) {
      continue;
    }
    out.push({ r: +m[1], g: +m[2], b: +m[3] });
  }
  return out;
}

/**
 * Multi-stop gradients: average luminance across all #hex stops, or all rgb() stops if no hex
 * (computed `background-image` often has no hex). Using only the first stop misread light regions.
 */
function luminanceFromGradientOrNull(bgImage: string): number | null {
  const hexes = hexColorsInGradientString(bgImage);
  if (hexes.length > 0) {
    let sum = 0;
    let n = 0;
    for (const hex of hexes) {
      const L = luminanceFromCssColor(hex);
      if (L !== null) {
        sum += L;
        n += 1;
      }
    }
    if (n > 0) {
      return sum / n;
    }
  }

  const rgbs = rgbStopsInGradientString(bgImage);
  if (rgbs.length === 0) {
    return null;
  }
  let sum = 0;
  for (const { r, g, b } of rgbs) {
    sum += relativeLuminance(r, g, b);
  }
  return sum / rgbs.length;
}

function isLightFromLuminance(L: number) {
  return L > LIGHT_THRESHOLD;
}

/** Downscaled bitmap read for `<img>` — same-origin only; CORS-tainted canvases return null. */
const IMAGE_LUMINANCE_SAMPLE_MAX_SIDE = 48;

function sampleImageAverageLuminance01(img: HTMLImageElement): number | null {
  if (!img.complete || img.naturalWidth === 0) {
    return null;
  }

  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const scale = Math.min(1, IMAGE_LUMINANCE_SAMPLE_MAX_SIDE / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    ctx.drawImage(img, 0, 0, cw, ch);
    const { data } = ctx.getImageData(0, 0, cw, ch);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 16) {
      const a = data[i + 3];
      if (a < 8) {
        continue;
      }
      sum += relativeLuminance(data[i], data[i + 1], data[i + 2]);
      n += 1;
    }
    if (n === 0) {
      return null;
    }
    return sum / n;
  } catch {
    return null;
  }
}

function ambientLuminance01(): number {
  for (const el of [document.documentElement, document.body] as HTMLElement[]) {
    const L = luminanceFromCssColor(getComputedStyle(el).backgroundColor);
    if (L !== null) {
      return L;
    }
  }
  return 0.12;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

type LuminanceProbe = { luminance: number; isContent: boolean };

/**
 * Walk ancestors from the hit element, checking CSS backgrounds, gradients, and `<img>` pixels.
 * Returns the luminance AND whether it came from actual painted content vs the ambient body/html
 * fallback. Transparent gaps (grid gutters, margins) return `isContent: false`.
 */
function probeSurfaceLuminance(hit: Element | null, options?: LightSurfaceOptions): LuminanceProbe {
  const root = options?.stopAtRoot;
  let node: Element | null = hit;

  while (node) {
    if (root && !root.contains(node)) {
      break;
    }

    if (node instanceof HTMLImageElement) {
      const L = sampleImageAverageLuminance01(node);
      if (L !== null) {
        return { luminance: L, isContent: true };
      }
    }

    const style = getComputedStyle(node);
    const bg = style.backgroundColor;
    const parsed = parseCssRgb(bg);
    if (parsed && parsed.a >= 0.88) {
      return { luminance: relativeLuminance(parsed.r, parsed.g, parsed.b), isContent: true };
    }

    if (style.backgroundImage && style.backgroundImage !== "none") {
      const L = luminanceFromGradientOrNull(style.backgroundImage);
      if (L !== null) {
        return { luminance: L, isContent: true };
      }
    }

    node = node.parentElement;
  }

  return { luminance: ambientLuminance01(), isContent: false };
}

/**
 * Relative luminance 0–1 for the painted surface behind a hit (CSS paints + decoded `<img>` pixels).
 * Does not read frosted navbar output — only DOM / raster under the probe.
 */
export function estimateSurfaceLuminance01(hit: Element | null, options?: LightSurfaceOptions): number {
  return probeSurfaceLuminance(hit, options).luminance;
}

export type LightSurfaceOptions = {
  /**
   * Stop walking before leaving this subtree (e.g. `[data-app-main]`) so we read section/hero
   * surfaces instead of `body` / `html` theme fills when ancestors are transparent.
   */
  stopAtRoot?: HTMLElement;
};

/**
 * Walk ancestors from the hit target and estimate whether the visible area is
 * predominantly light (true) or dark (false). Uses CSS paints and decoded `<img>` pixels when
 * the probe lands on a raster thumbnail.
 */
export function isLightSurfaceBehindElement(hit: Element | null, options?: LightSurfaceOptions): boolean {
  return isLightFromLuminance(estimateSurfaceLuminance01(hit, options));
}

function isLightFromAmbientDocument(): boolean {
  return isLightFromLuminance(ambientLuminance01());
}

/**
 * Fixed transparent chrome stacked above `main` (e.g. AppShell’s ASCII portal host) must not win
 * `elementsFromPoint` — otherwise luminance walks to the shell/html background instead of the
 * section actually under the navbar.
 */
export function shouldSkipSurfaceLuminanceHit(el: Element): boolean {
  return el.closest("[data-toolbar-ascii-portal]") !== null;
}

/** Topmost element at (x,y) that lives inside `root` (paint order = first match in stack). */
function pickHitInsideRoot(stack: Element[], root: HTMLElement): Element | null {
  for (const el of stack) {
    if (root.contains(el)) {
      return el;
    }
  }
  return null;
}

/**
 * Stacked gradient-blur layers sit inside `<header>` and extend below the content row. A point at
 * `header.getBoundingClientRect().bottom + offset` can still hit only those layers; they are
 * filtered out (`header.contains`), leaving an empty stack and a wrong ambient fallback. Step
 * downward until `main` is hit or the viewport ends.
 */
const NAVBAR_SURFACE_VERTICAL_STEP_PX = 28;
const NAVBAR_SURFACE_MAX_ATTEMPTS = 12;

function pickMainHitBelowNavbarChrome(
  x: number,
  startY: number,
  header: HTMLElement,
  main: HTMLElement | null,
): Element | null {
  const maxY = window.innerHeight - 1;
  let y = Math.round(Math.min(maxY, Math.max(0, startY)));

  for (let attempt = 0; attempt < NAVBAR_SURFACE_MAX_ATTEMPTS; attempt++) {
    const stack = document
      .elementsFromPoint(x, y)
      .filter((el) => !header.contains(el) && !shouldSkipSurfaceLuminanceHit(el));
    const hit = main ? pickHitInsideRoot(stack, main) : (stack[0] ?? null);
    if (hit) {
      return hit;
    }

    const nextY = Math.min(maxY, y + NAVBAR_SURFACE_VERTICAL_STEP_PX);
    if (nextY === y) {
      break;
    }
    y = nextY;
  }

  return null;
}

function pickMainHitBelowAppNavbarChrome(x: number, startY: number, main: HTMLElement): Element | null {
  const maxY = window.innerHeight - 1;
  let y = Math.round(Math.min(maxY, Math.max(0, startY)));

  for (let attempt = 0; attempt < NAVBAR_SURFACE_MAX_ATTEMPTS; attempt++) {
    const stack = document.elementsFromPoint(x, y).filter(
      (el) => !shouldSkipSurfaceLuminanceHit(el) && !el.closest("[data-app-navbar]"),
    );
    const hit = pickHitInsideRoot(stack, main);
    if (hit) {
      return hit;
    }

    const nextY = Math.min(maxY, y + NAVBAR_SURFACE_VERTICAL_STEP_PX);
    if (nextY === y) {
      break;
    }
    y = nextY;
  }

  return null;
}

export function isLightSurfaceAtPoint(x: number, y: number, header: HTMLElement): boolean {
  const main = document.querySelector<HTMLElement>("[data-app-main]");
  const hit = pickMainHitBelowNavbarChrome(x, y, header, main);
  if (!hit) {
    return isLightFromAmbientDocument();
  }
  return isLightSurfaceBehindElement(hit, main ? { stopAtRoot: main } : undefined);
}

/** Matches `<header data-contrast>`: `light` = dark ink on the bar; `dark` = light ink. */
export type NavbarContrastMode = "light" | "dark";

const NAVBAR_CONTRAST_SAMPLE_OFFSET_PX = 8;
const NAVBAR_PROBE_COUNT = 20;

/**
 * Dense horizontal probes just under the stacked blur. Only content hits (images, opaque fills,
 * gradients) count toward the median — transparent gaps (grid gutters, page margins) that fall
 * through to `body` are excluded so dark-theme gaps between light cards don't dilute the signal.
 */
export function resolveNavbarContrast(header: HTMLElement): NavbarContrastMode {
  const main = document.querySelector<HTMLElement>("[data-app-main]");
  const rect = header.getBoundingClientRect();
  const sampleY = Math.round(
    Math.min(window.innerHeight - 1, Math.max(0, rect.bottom + NAVBAR_CONTRAST_SAMPLE_OFFSET_PX)),
  );

  const inset = 12;
  const span = rect.width - inset * 2;
  const step = span / (NAVBAR_PROBE_COUNT - 1);

  const opts = main ? { stopAtRoot: main } : undefined;
  const contentLuminances: number[] = [];
  let ambientFallback = 0.12;

  for (let i = 0; i < NAVBAR_PROBE_COUNT; i++) {
    const rawX = rect.left + inset + step * i;
    const x = Math.round(Math.min(window.innerWidth - 1, Math.max(0, rawX)));
    const hit = pickMainHitBelowNavbarChrome(x, sampleY, header, main);
    const probe = probeSurfaceLuminance(hit, opts);
    if (probe.isContent) {
      contentLuminances.push(probe.luminance);
    } else {
      ambientFallback = probe.luminance;
    }
  }

  if (contentLuminances.length === 0) {
    return isLightFromLuminance(ambientFallback) ? "light" : "dark";
  }

  return isLightFromLuminance(median(contentLuminances)) ? "light" : "dark";
}

/**
 * Sample a band below the header (where About will sit) so immersive overlay frosted glass + ink
 * match the scrolled content, not only `data-theme` (light site over a dark hero, etc.).
 */
export function getImmersiveOverlayTone(): "light" | "dark" {
  if (typeof document === "undefined") {
    return "light";
  }

  const main = document.querySelector<HTMLElement>("[data-app-main]");
  if (!main) {
    return "light";
  }

  const headerRaw = getComputedStyle(document.documentElement).getPropertyValue("--header-height").trim();
  const headerPx = Number.parseFloat(headerRaw) || 72;
  const h = window.innerHeight;
  const w = window.innerWidth;
  /* Band under chrome + mid-viewport (where centered overlay copy sits), not only a strip under the header. */
  const sampleYs = [
    Math.round(Math.min(h - 1, Math.max(0, headerPx + 40))),
    Math.round(Math.min(h - 1, Math.max(headerPx + 64, h * 0.38))),
    Math.round(Math.min(h - 1, Math.max(headerPx + 80, h * 0.52))),
  ];
  const sampleXs = [0.12, 0.5, 0.88].map((t) => t * w);
  let lightVotes = 0;
  let total = 0;

  for (const sampleY of sampleYs) {
    for (const rawX of sampleXs) {
      const x = Math.round(Math.min(w - 1, Math.max(0, rawX)));
      const hit = pickMainHitBelowAppNavbarChrome(x, sampleY, main);
      total += 1;
      if (isLightSurfaceBehindElement(hit, { stopAtRoot: main })) {
        lightVotes += 1;
      }
    }
  }

  return lightVotes > total / 2 ? "light" : "dark";
}
