"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useClientMounted } from "@/lib/useClientMounted";
import styles from "./ExploreCue.module.scss";

const FOLLOW_DURATION = 0.18;
const FOLLOW_EASE = "power3.out";
const EXIT_MS = 420;
const HANDOFF_MS = 80;

export type ExploreCueShowOptions = {
  label?: string;
  /** Viewport pointer. Overlay follow only — never a host-local point. */
  pointer?: { x: number; y: number };
  /** Keyboard only. Ignored once a pointer has been seen. */
  at?: { x: number; y: number };
};

type ExploreCueApi = {
  show: (host: HTMLElement, options?: ExploreCueShowOptions) => void;
  hide: (host?: HTMLElement) => void;
};

const ExploreCueContext = createContext<ExploreCueApi | null>(null);

const noopApi: ExploreCueApi = {
  show() {},
  hide() {},
};

export function useExploreCue(): ExploreCueApi {
  return useContext(ExploreCueContext) ?? noopApi;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isFinePointer(pointerType: string) {
  return pointerType === "mouse" || pointerType === "pen";
}

function overlayBlocksCue() {
  const html = document.documentElement;
  return (
    html.classList.contains("is-overlay-open") ||
    html.classList.contains("is-nav-open") ||
    html.classList.contains("is-loading")
  );
}

type ExploreCueProviderProps = {
  children: ReactNode;
};

export function ExploreCueProvider({ children }: ExploreCueProviderProps) {
  const frostRef = useRef<HTMLSpanElement | null>(null);
  const blendRef = useRef<HTMLSpanElement | null>(null);
  const hostRef = useRef<HTMLElement | null>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const hasPointerRef = useRef(false);
  const followRef = useRef<{
    xTo: ReturnType<typeof gsap.quickTo>;
    yTo: ReturnType<typeof gsap.quickTo>;
  } | null>(null);
  const exitTimerRef = useRef(0);
  const hideGenRef = useRef(0);
  const activeRef = useRef(false);
  const [active, setActive] = useState(false);
  const [label, setLabel] = useState("explore");
  const labelRef = useRef("explore");
  const mounted = useClientMounted();
  const pathname = usePathname();

  const layout = useCallback(() => {
    const x = `${posRef.current.x}px`;
    const y = `${posRef.current.y}px`;
    frostRef.current?.style.setProperty("--cue-x", x);
    frostRef.current?.style.setProperty("--cue-y", y);
    blendRef.current?.style.setProperty("--cue-x", x);
    blendRef.current?.style.setProperty("--cue-y", y);
  }, []);

  const followTo = useCallback(
    (clientX: number, clientY: number) => {
      hasPointerRef.current = true;

      if (prefersReducedMotion() || !followRef.current) {
        posRef.current.x = clientX;
        posRef.current.y = clientY;
        layout();
        return;
      }

      followRef.current.xTo(clientX);
      followRef.current.yTo(clientY);
    },
    [layout],
  );

  const seedAt = useCallback(
    (clientX: number, clientY: number) => {
      posRef.current.x = clientX;
      posRef.current.y = clientY;
      layout();
    },
    [layout],
  );

  const show = useCallback(
    (host: HTMLElement, options?: ExploreCueShowOptions) => {
      if (overlayBlocksCue()) {
        return;
      }

      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = 0;
      }

      hideGenRef.current += 1;
      hostRef.current = host;

      const nextLabel = options?.label ?? "explore";
      if (labelRef.current !== nextLabel) {
        labelRef.current = nextLabel;
        setLabel(nextLabel);
      }

      if (options?.pointer) {
        followTo(options.pointer.x, options.pointer.y);
      } else if (!hasPointerRef.current && options?.at) {
        seedAt(options.at.x, options.at.y);
      }

      if (activeRef.current) {
        return;
      }

      activeRef.current = true;
      setActive(true);
    },
    [followTo, seedAt],
  );

  const hideNow = useCallback(() => {
    hideGenRef.current += 1;

    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = 0;
    }

    hostRef.current = null;

    if (!activeRef.current) {
      return;
    }

    activeRef.current = false;
    setActive(false);
  }, []);

  const hide = useCallback((host?: HTMLElement) => {
    if (host && hostRef.current !== host) {
      return;
    }

    if (exitTimerRef.current) {
      return;
    }

    const gen = hideGenRef.current + 1;
    hideGenRef.current = gen;
    exitTimerRef.current = window.setTimeout(() => {
      if (hideGenRef.current !== gen) {
        return;
      }

      activeRef.current = false;
      setActive(false);
      exitTimerRef.current = window.setTimeout(() => {
        if (hideGenRef.current !== gen) {
          return;
        }

        if (!activeRef.current) {
          hostRef.current = null;
        }

        exitTimerRef.current = 0;
      }, EXIT_MS);
    }, HANDOFF_MS);
  }, []);

  const api = useMemo<ExploreCueApi>(
    () => ({
      show,
      hide,
    }),
    [hide, show],
  );

  useLayoutEffect(() => {
    const pos = posRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const createFollow = () => {
      gsap.killTweensOf(pos);
      const duration = reduce.matches ? 0 : FOLLOW_DURATION;
      const ease = reduce.matches ? "none" : FOLLOW_EASE;
      followRef.current = {
        xTo: gsap.quickTo(pos, "x", {
          duration,
          ease,
          overwrite: true,
          onUpdate: layout,
        }),
        yTo: gsap.quickTo(pos, "y", {
          duration,
          ease,
          overwrite: true,
          onUpdate: layout,
        }),
      };
    };

    createFollow();
    reduce.addEventListener("change", createFollow);

    return () => {
      reduce.removeEventListener("change", createFollow);
      gsap.killTweensOf(pos);
      followRef.current = null;
    };
  }, [layout]);

  useLayoutEffect(() => {
    hideNow();
  }, [hideNow, pathname]);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      if (overlayBlocksCue() && activeRef.current) {
        hideNow();
      }
    });

    observer.observe(html, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
    };
  }, [hideNow]);

  useLayoutEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!isFinePointer(event.pointerType)) {
        return;
      }

      if (overlayBlocksCue()) {
        if (activeRef.current) {
          hideNow();
        }
        return;
      }

      followTo(event.clientX, event.clientY);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true, capture: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove, { capture: true });
    };
  }, [followTo, hideNow]);

  useLayoutEffect(() => {
    return () => {
      gsap.killTweensOf(posRef.current);
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const overlay = (
    <>
      <span
        ref={frostRef}
        className={styles.frost}
        data-explore-cue="true"
        data-active={active ? "true" : "false"}
        aria-hidden="true"
      />
      <span
        ref={blendRef}
        className={styles.blend}
        data-explore-cue-label="true"
        data-active={active ? "true" : "false"}
        aria-hidden="true"
      >
        <span className={styles.label}>
          <span className={styles.labelClip}>
            <span key={label} className={styles.labelText}>
              {label}
            </span>
          </span>
        </span>
      </span>
    </>
  );

  return (
    <ExploreCueContext.Provider value={api}>
      {children}
      {mounted ? createPortal(overlay, document.body) : null}
    </ExploreCueContext.Provider>
  );
}
