"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type FocusEvent, type PointerEvent } from "react";
import { useExploreCue } from "./ExploreCueProvider";
import { isPointerOverLoadedMedia, loadedMediaPaintBox } from "./loadedMediaHit";

function isFinePointer(pointerType: string) {
  return pointerType === "mouse" || pointerType === "pen";
}

let lastFinePointerAt = 0;

function markFinePointer() {
  lastFinePointerAt = performance.now();
}

function wasRecentFinePointer() {
  return performance.now() - lastFinePointerAt < 700;
}

const LOADED_MEDIA_ATTRS = [
  "data-ready",
  "data-media-width",
  "data-media-height",
  "data-fit",
] as const;

export type UseExploreCueTargetOptions = {
  enabled?: boolean;
  label?: string;
};

export function useExploreCueTarget<T extends HTMLElement>({
  enabled = true,
  label = "explore",
}: UseExploreCueTargetOptions = {}) {
  const cue = useExploreCue();
  const hostRef = useRef<T | null>(null);
  const enabledRef = useRef(enabled);
  const labelRef = useRef(label);
  const overMediaRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const moveRafRef = useRef(0);
  const pendingMoveRef = useRef<{ host: HTMLElement; x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    enabledRef.current = enabled;
    labelRef.current = label;
  }, [enabled, label]);

  const markOverMedia = useCallback((host: HTMLElement, over: boolean) => {
    overMediaRef.current = over;
    if (over) {
      host.setAttribute("data-cue-over-media", "true");
      return;
    }

    host.removeAttribute("data-cue-over-media");
  }, []);

  const notifyShow = useCallback(
    (host: HTMLElement) => {
      cue.show(host, {
        label: labelRef.current,
        pointer: lastPointerRef.current ?? undefined,
      });
    },
    [cue],
  );

  const syncPointer = useCallback(
    (host: HTMLElement, clientX: number, clientY: number) => {
      lastPointerRef.current = { x: clientX, y: clientY };
      const over = isPointerOverLoadedMedia(host, clientX, clientY);
      markOverMedia(host, over);

      if (over) {
        notifyShow(host);
        return;
      }

      cue.hide(host);
    },
    [cue, markOverMedia, notifyShow],
  );

  const cancelPendingMove = useCallback(() => {
    if (moveRafRef.current) {
      window.cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = 0;
    }

    pendingMoveRef.current = null;
  }, []);

  const attachObserver = useCallback(
    (node: T | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;

      if (!node || !enabledRef.current) {
        return;
      }

      const syncFromLoadedMedia = () => {
        if (!enabledRef.current) {
          return;
        }

        const last = lastPointerRef.current;
        if (last) {
          syncPointer(node, last.x, last.y);
          return;
        }

        if (wasRecentFinePointer() || !node.matches(":focus-visible")) {
          return;
        }

        const box = loadedMediaPaintBox(node);
        if (!box) {
          markOverMedia(node, false);
          cue.hide(node);
          return;
        }

        markOverMedia(node, true);
        cue.show(node, {
          label: labelRef.current,
          at: {
            x: (box.left + box.right) / 2,
            y: (box.top + box.bottom) / 2,
          },
        });
      };

      const observer = new MutationObserver(syncFromLoadedMedia);
      observer.observe(node, {
        attributes: true,
        subtree: true,
        attributeFilter: [...LOADED_MEDIA_ATTRS],
      });
      observerRef.current = observer;
    },
    [cue, markOverMedia, syncPointer],
  );

  const setRef = useCallback(
    (node: T | null) => {
      if (hostRef.current && hostRef.current !== node) {
        hostRef.current.removeAttribute("data-explore-cue-target");
        hostRef.current.removeAttribute("data-cue-over-media");
      }

      hostRef.current = node;

      if (node) {
        node.setAttribute("data-explore-cue-target", "true");
      }

      attachObserver(node);
    },
    [attachObserver],
  );

  const onPointerEnter = useCallback(
    (event: PointerEvent<T>) => {
      if (!enabledRef.current || !isFinePointer(event.pointerType)) {
        return;
      }

      cancelPendingMove();
      markFinePointer();
      syncPointer(event.currentTarget, event.clientX, event.clientY);
    },
    [cancelPendingMove, syncPointer],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<T>) => {
      if (!enabledRef.current || !isFinePointer(event.pointerType)) {
        return;
      }

      markFinePointer();
      pendingMoveRef.current = {
        host: event.currentTarget,
        x: event.clientX,
        y: event.clientY,
      };

      if (moveRafRef.current) {
        return;
      }

      moveRafRef.current = window.requestAnimationFrame(() => {
        moveRafRef.current = 0;
        const pending = pendingMoveRef.current;
        pendingMoveRef.current = null;

        if (!pending || !enabledRef.current) {
          return;
        }

        syncPointer(pending.host, pending.x, pending.y);
      });
    },
    [syncPointer],
  );

  const onPointerLeave = useCallback(
    (event: PointerEvent<T>) => {
      markFinePointer();
      cancelPendingMove();
      lastPointerRef.current = null;
      markOverMedia(event.currentTarget, false);

      const next =
        event.relatedTarget instanceof Element
          ? event.relatedTarget.closest("[data-explore-cue-target]")
          : null;

      if (next && next !== event.currentTarget) {
        return;
      }

      cue.hide(event.currentTarget);
    },
    [cancelPendingMove, cue, markOverMedia],
  );

  const onFocus = useCallback(
    (event: FocusEvent<T>) => {
      if (!enabledRef.current) {
        return;
      }

      if (wasRecentFinePointer()) {
        return;
      }

      if (!event.currentTarget.matches(":focus-visible")) {
        return;
      }

      const box = loadedMediaPaintBox(event.currentTarget);
      if (!box) {
        return;
      }

      markOverMedia(event.currentTarget, true);
      cue.show(event.currentTarget, {
        label: labelRef.current,
        at: {
          x: (box.left + box.right) / 2,
          y: (box.top + box.bottom) / 2,
        },
      });
    },
    [cue, markOverMedia],
  );

  const onBlur = useCallback(
    (event: FocusEvent<T>) => {
      if (wasRecentFinePointer()) {
        return;
      }

      markOverMedia(event.currentTarget, false);
      cue.hide(event.currentTarget);
    },
    [cue, markOverMedia],
  );

  useEffect(() => {
    attachObserver(enabled ? hostRef.current : null);

    if (!enabled) {
      const host = hostRef.current;
      if (host) {
        markOverMedia(host, false);
        cue.hide(host);
      }
    }
  }, [attachObserver, cue, enabled, markOverMedia]);

  useEffect(() => {
    return () => {
      cancelPendingMove();
      observerRef.current?.disconnect();
      observerRef.current = null;
      const host = hostRef.current;
      if (host) {
        markOverMedia(host, false);
        cue.hide(host);
      }
    };
  }, [cancelPendingMove, cue, markOverMedia]);

  return useMemo(() => ({
    setRef,
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
    onFocus,
    onBlur,
  }), [onBlur, onFocus, onPointerEnter, onPointerLeave, onPointerMove, setRef]);
}
