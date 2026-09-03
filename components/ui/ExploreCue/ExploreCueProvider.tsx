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
import gsap from "gsap";
import { getLenis } from "@/lib/smoothScroll";
import { useClientMounted } from "@/lib/useClientMounted";
import styles from "./ExploreCue.module.scss";

const FOLLOW_DURATION = 0.18;
const FOLLOW_EASE = "power3.out";
const EXIT_MS = 420;
const HANDOFF_MS = 160;

export type ExploreCueShowOptions = {
  label?: string;
};

type ExploreCueApi = {
  show: (
    host: HTMLElement,
    clientX: number,
    clientY: number,
    options?: ExploreCueShowOptions,
  ) => void;
  move: (clientX: number, clientY: number) => void;
  press: () => void;
  release: () => void;
  hide: (host?: HTMLElement, point?: { x: number; y: number }) => void;
};

const ExploreCueContext = createContext<ExploreCueApi | null>(null);

const noopApi: ExploreCueApi = {
  show() {},
  move() {},
  press() {},
  release() {},
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

function localPoint(host: HTMLElement, clientX: number, clientY: number) {
  const rect = host.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function cueTargetFromPoint(clientX: number, clientY: number) {
  const node = document.elementFromPoint(clientX, clientY);
  if (!(node instanceof Element)) {
    return null;
  }

  return node.closest<HTMLElement>("[data-explore-cue-target]");
}

type ExploreCueProviderProps = {
  children: ReactNode;
};

export function ExploreCueProvider({ children }: ExploreCueProviderProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLElement | null>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const followRef = useRef<{
    xTo: ReturnType<typeof gsap.quickTo>;
    yTo: ReturnType<typeof gsap.quickTo>;
  } | null>(null);
  const exitTimerRef = useRef(0);
  const hideGenRef = useRef(0);
  const activeRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [label, setLabel] = useState("explore");
  const mounted = useClientMounted();

  const layout = useCallback(() => {
    const overlay = overlayRef.current;
    const host = hostRef.current;
    if (!overlay || !host) {
      return;
    }

    const rect = host.getBoundingClientRect();
    overlay.style.setProperty("--cue-x", `${rect.left + posRef.current.x}px`);
    overlay.style.setProperty("--cue-y", `${rect.top + posRef.current.y}px`);
  }, []);

  const pauseFollow = useCallback(() => {
    followRef.current?.xTo.tween?.pause();
    followRef.current?.yTo.tween?.pause();
  }, []);

  const rememberPointer = useCallback((clientX: number, clientY: number) => {
    pointerRef.current.x = clientX;
    pointerRef.current.y = clientY;
  }, []);

  const snapToPointer = useCallback(
    (clientX: number, clientY: number) => {
      const host = hostRef.current;
      rememberPointer(clientX, clientY);
      pauseFollow();

      if (host) {
        const next = localPoint(host, clientX, clientY);
        posRef.current.x = next.x;
        posRef.current.y = next.y;
      }

      const overlay = overlayRef.current;
      if (overlay) {
        overlay.style.setProperty("--cue-x", `${clientX}px`);
        overlay.style.setProperty("--cue-y", `${clientY}px`);
      }
    },
    [pauseFollow, rememberPointer],
  );

  const followTo = useCallback(
    (host: HTMLElement, clientX: number, clientY: number) => {
      rememberPointer(clientX, clientY);
      const next = localPoint(host, clientX, clientY);

      if (prefersReducedMotion() || !followRef.current) {
        posRef.current.x = next.x;
        posRef.current.y = next.y;
        layout();
        return;
      }

      followRef.current.xTo(next.x);
      followRef.current.yTo(next.y);
    },
    [layout, rememberPointer],
  );

  const show = useCallback(
    (
      host: HTMLElement,
      clientX: number,
      clientY: number,
      options?: ExploreCueShowOptions,
    ) => {
      if (overlayBlocksCue()) {
        return;
      }

      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = 0;
      }

      hideGenRef.current += 1;

      const wasActive = activeRef.current;
      const prevHost = hostRef.current;
      if (prevHost && prevHost !== host && wasActive) {
        pauseFollow();
        const from = prevHost.getBoundingClientRect();
        const to = host.getBoundingClientRect();
        posRef.current.x = from.left + posRef.current.x - to.left;
        posRef.current.y = from.top + posRef.current.y - to.top;
      }

      hostRef.current = host;
      setLabel(options?.label ?? "explore");

      if (!wasActive) {
        snapToPointer(clientX, clientY);
        activeRef.current = true;
        setActive(true);
        return;
      }

      followTo(host, clientX, clientY);
    },
    [followTo, pauseFollow, snapToPointer],
  );

  const press = useCallback(() => {
    if (!activeRef.current) {
      return;
    }

    setPressed(true);
  }, []);

  const release = useCallback(() => {
    setPressed(false);
  }, []);

  const move = useCallback(
    (clientX: number, clientY: number) => {
      const host = hostRef.current;
      if (!host || !activeRef.current) {
        return;
      }

      followTo(host, clientX, clientY);
    },
    [followTo],
  );

  const hide = useCallback(
    (host?: HTMLElement, point?: { x: number; y: number }) => {
      if (host && hostRef.current !== host) {
        return;
      }

      if (point) {
        rememberPointer(point.x, point.y);
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

        snapToPointer(pointerRef.current.x, pointerRef.current.y);
        activeRef.current = false;
        setPressed(false);
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
    },
    [rememberPointer, snapToPointer],
  );

  const api = useMemo<ExploreCueApi>(
    () => ({
      show,
      move,
      press,
      release,
      hide,
    }),
    [hide, move, press, release, show],
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
    if (!pressed) {
      return;
    }

    const end = () => {
      setPressed(false);
    };

    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);

    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [pressed]);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      if (overlayBlocksCue() && activeRef.current) {
        hide();
      }
    });

    observer.observe(html, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
    };
  }, [hide]);

  useLayoutEffect(() => {
    const onScroll = () => {
      layout();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!hostRef.current || !activeRef.current || !isFinePointer(event.pointerType)) {
        return;
      }

      if (overlayBlocksCue()) {
        hide();
        return;
      }

      const nextHost = cueTargetFromPoint(event.clientX, event.clientY);
      if (nextHost && nextHost !== hostRef.current) {
        return;
      }

      const rect = hostRef.current.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (inside) {
        return;
      }

      followTo(hostRef.current, event.clientX, event.clientY);
      hide(hostRef.current, { x: event.clientX, y: event.clientY });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    const unsubscribeLenis = getLenis()?.on("scroll", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      unsubscribeLenis?.();
    };
  }, [followTo, hide, layout]);

  useLayoutEffect(() => {
    return () => {
      gsap.killTweensOf(posRef.current);
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const overlay = (
    <div
      ref={overlayRef}
      className={styles.root}
      data-explore-cue="true"
      data-active={active ? "true" : "false"}
      data-pressed={pressed ? "true" : "false"}
      aria-hidden="true"
    >
      <span className={styles.frost} />
      <span className={styles.blend}>
        <span className={styles.label}>
          <span className={styles.labelClip}>
            <span key={label} className={styles.labelText}>
              {label}
            </span>
          </span>
        </span>
      </span>
    </div>
  );

  return (
    <ExploreCueContext.Provider value={api}>
      {children}
      {mounted ? createPortal(overlay, document.body) : null}
    </ExploreCueContext.Provider>
  );
}
