"use client";

import { useCallback, useEffect, useRef, useState, type FocusEvent, type PointerEvent } from "react";
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
  const [hostNode, setHostNode] = useState<T | null>(null);
  const enabledRef = useRef(enabled);
  const labelRef = useRef(label);
  const overMediaRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  enabledRef.current = enabled;
  labelRef.current = label;

  const markOverMedia = useCallback((host: HTMLElement, over: boolean) => {
    overMediaRef.current = over;
    if (over) {
      host.setAttribute("data-cue-over-media", "true");
      return;
    }

    host.removeAttribute("data-cue-over-media");
  }, []);

  const setRef = useCallback((node: T | null) => {
    if (hostRef.current && hostRef.current !== node) {
      hostRef.current.removeAttribute("data-explore-cue-target");
      hostRef.current.removeAttribute("data-cue-over-media");
    }

    hostRef.current = node;
    setHostNode(node);

    if (node) {
      node.setAttribute("data-explore-cue-target", "true");
    }
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

  const onPointerEnter = useCallback(
    (event: PointerEvent<T>) => {
      if (!enabledRef.current || !isFinePointer(event.pointerType)) {
        return;
      }

      markFinePointer();
      syncPointer(event.currentTarget, event.clientX, event.clientY);
    },
    [syncPointer],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<T>) => {
      if (!enabledRef.current || !isFinePointer(event.pointerType)) {
        return;
      }

      markFinePointer();
      syncPointer(event.currentTarget, event.clientX, event.clientY);
    },
    [syncPointer],
  );

  const onPointerLeave = useCallback(
    (event: PointerEvent<T>) => {
      markFinePointer();
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
    [cue, markOverMedia],
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
    if (!enabled) {
      const host = hostRef.current;
      if (host) {
        markOverMedia(host, false);
        cue.hide(host);
      }
    }
  }, [cue, enabled, markOverMedia]);

  useEffect(() => {
    if (!hostNode || !enabled) {
      return;
    }

    const syncFromLoadedMedia = () => {
      if (!enabledRef.current) {
        return;
      }

      const last = lastPointerRef.current;
      if (last) {
        syncPointer(hostNode, last.x, last.y);
        return;
      }

      if (wasRecentFinePointer() || !hostNode.matches(":focus-visible")) {
        return;
      }

      const box = loadedMediaPaintBox(hostNode);
      if (!box) {
        markOverMedia(hostNode, false);
        cue.hide(hostNode);
        return;
      }

      markOverMedia(hostNode, true);
      cue.show(hostNode, {
        label: labelRef.current,
        at: {
          x: (box.left + box.right) / 2,
          y: (box.top + box.bottom) / 2,
        },
      });
    };

    const observer = new MutationObserver(syncFromLoadedMedia);
    observer.observe(hostNode, {
      attributes: true,
      subtree: true,
      attributeFilter: [...LOADED_MEDIA_ATTRS],
    });

    return () => {
      observer.disconnect();
    };
  }, [cue, enabled, hostNode, markOverMedia, syncPointer]);

  useEffect(() => {
    return () => {
      const host = hostRef.current;
      if (host) {
        markOverMedia(host, false);
        cue.hide(host);
      }
    };
  }, [cue, markOverMedia]);

  return {
    setRef,
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
    onFocus,
    onBlur,
  };
}
