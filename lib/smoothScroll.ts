import type Lenis from "lenis";

type ScrollTarget = number | string | HTMLElement;
const DEFAULT_HEADER_HEIGHT_PX = 72;
const DEFAULT_SECTION_SCROLL_MARGIN_PX = 16;

type SmoothScrollOptions = {
  offset?: number;
  immediate?: boolean;
  lock?: boolean;
  force?: boolean;
};

function usesViewportCenterAlignment(target: ScrollTarget): boolean {
  if (typeof target === "number") {
    return false;
  }

  if (typeof target === "string") {
    const t = target.trim();
    return t === "#contact" || t === "#contact-form";
  }

  return target.id === "contact" || target.id === "contact-form";
}

/** `#contact-form` is a small in-section anchor; center the `#contact` block instead. */
function resolveViewportCenterElement(target: ScrollTarget): HTMLElement | null {
  const el = typeof target === "number" ? null : resolveTargetElement(target);

  if (!el) {
    return null;
  }

  if (el.id === "contact") {
    return el;
  }

  if (el.id === "contact-form") {
    return document.getElementById("contact") ?? el;
  }

  return null;
}

function getContactSectionScrollTop(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const elementTopDoc = rect.top + scrollY;
  const elementCenterDoc = elementTopDoc + rect.height / 2;
  const viewH = window.innerHeight;
  const clearancePx =
    readRootCssLengthPx("--header-height", DEFAULT_HEADER_HEIGHT_PX) + DEFAULT_SECTION_SCROLL_MARGIN_PX;
  const lenis = getLenis();
  const maxY = lenis ? lenis.limit : Math.max(0, document.documentElement.scrollHeight - viewH);
  /** Vertical center of the viewport region below the navbar (same clearance as `#work`). */
  const usableH = Math.max(0, viewH - clearancePx);
  const viewportCenterBelowNav = clearancePx + usableH / 2;
  const y = elementCenterDoc - viewportCenterBelowNav;

  return Math.min(maxY, Math.max(0, y));
}

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

function getFallbackBehavior(immediate = false): ScrollBehavior {
  if (typeof window === "undefined") {
    return "auto";
  }

  if (immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return "auto";
  }

  return "smooth";
}

function readRootCssLengthPx(variableName: string, fallback: number) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  const value = Number.parseFloat(raw);

  if (Number.isNaN(value)) {
    return fallback;
  }

  if (raw.endsWith("rem")) {
    const fontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return value * fontSize;
  }

  return value;
}

function resolveTargetElement(target: ScrollTarget) {
  if (typeof target === "string") {
    return document.querySelector<HTMLElement>(target);
  }

  if (typeof target === "number") {
    return null;
  }

  return target;
}

function getScrollClearancePx(target: ScrollTarget) {
  const element = resolveTargetElement(target);

  if (!element || element.id === "hero") {
    return 0;
  }

  return readRootCssLengthPx("--header-height", DEFAULT_HEADER_HEIGHT_PX) + DEFAULT_SECTION_SCROLL_MARGIN_PX;
}

function fallbackScrollTo(target: ScrollTarget, behavior: ScrollBehavior, clearancePx: number) {
  if (typeof target === "number") {
    window.scrollTo({ top: target, left: 0, behavior });
    return;
  }

  const element = resolveTargetElement(target);

  if (!element) {
    return;
  }

  const top = Math.max(0, window.scrollY + element.getBoundingClientRect().top - clearancePx);

  window.scrollTo({ top, left: 0, behavior });
}

export function getLenis() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.__lenis ?? null;
}

export function scrollToTarget(target: ScrollTarget | null | undefined, options: SmoothScrollOptions = {}) {
  if (typeof window === "undefined" || target == null) {
    return;
  }

  if (usesViewportCenterAlignment(target)) {
    const centerEl = resolveViewportCenterElement(target);

    if (centerEl) {
      const top = getContactSectionScrollTop(centerEl);
      const lenis = getLenis();
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (lenis && !reduceMotion) {
        lenis.scrollTo(top, {
          offset: 0,
          immediate: options.immediate ?? false,
          lock: options.lock ?? false,
          force: options.force ?? false,
        });
      } else {
        window.scrollTo({ top, left: 0, behavior: getFallbackBehavior(options.immediate) });
      }

      return;
    }
  }

  const clearancePx = options.offset ?? getScrollClearancePx(target);
  const lenis = getLenis();

  if (lenis && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    lenis.scrollTo(target, {
      offset: typeof target === "number" ? clearancePx : -clearancePx,
      immediate: options.immediate ?? false,
      lock: options.lock ?? false,
      force: options.force ?? false,
    });
    return;
  }

  fallbackScrollTo(target, getFallbackBehavior(options.immediate), clearancePx);
}

export function scrollElementIntoView(element: HTMLElement | null, options?: SmoothScrollOptions) {
  scrollToTarget(element, options);
}

export function scrollToTop(options?: SmoothScrollOptions) {
  scrollToTarget(0, options);
}

export function getAnchorScrollOffset(target: ScrollTarget) {
  return -getScrollClearancePx(target);
}

export function clearLocationHash() {
  if (typeof window === "undefined" || !window.location.hash) {
    return;
  }

  window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
}

export function scrollToHeroSection() {
  const el = document.getElementById("hero");

  if (el) {
    scrollElementIntoView(el);
  } else {
    scrollToTop();
  }
}

/** After browser / Next restores scroll position, Lenis can be out of sync — snap immediately. */
export function syncLenisToWindowScroll() {
  if (typeof window === "undefined") {
    return;
  }

  const lenis = getLenis();

  if (!lenis) {
    return;
  }

  const y = window.scrollY || document.documentElement.scrollTop || 0;

  lenis.scrollTo(y, { immediate: true, force: true });
}
