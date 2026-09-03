"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
} from "react";
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
  const pointerSessionRef = useRef(false);
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

  const showAt = useCallback(
    (host: HTMLElement, clientX: number, clientY: number) => {
      cue.show(host, clientX, clientY, { label: labelRef.current });
    },
    [cue],
  );

  const onPointerEnter = useCallback(
    (event: PointerEvent<T>) => {
      if (!enabledRef.current || !isFinePointer(event.pointerType)) {
        return;
      }

      pointerSessionRef.current = true;
      markFinePointer();
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      const host = event.currentTarget;
      const over = isPointerOverLoadedMedia(host, event.clientX, event.clientY);
      markOverMedia(host, over);

      if (over) {
        showAt(host, event.clientX, event.clientY);
      }
    },
    [markOverMedia, showAt],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<T>) => {
      if (!enabledRef.current || !isFinePointer(event.pointerType)) {
        return;
      }

      pointerSessionRef.current = true;
      markFinePointer();
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      const host = event.currentTarget;
      const over = isPointerOverLoadedMedia(host, event.clientX, event.clientY);

      if (!over) {
        if (overMediaRef.current) {
          markOverMedia(host, false);
          cue.release();
          cue.hide(host, { x: event.clientX, y: event.clientY });
        }

        return;
      }

      if (!overMediaRef.current) {
        markOverMedia(host, true);
        showAt(host, event.clientX, event.clientY);
        return;
      }

      cue.move(event.clientX, event.clientY);
    },
    [cue, markOverMedia, showAt],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<T>) => {
      if (!enabledRef.current || !isFinePointer(event.pointerType)) {
        return;
      }

      pointerSessionRef.current = true;
      markFinePointer();
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      const host = event.currentTarget;
      const over = isPointerOverLoadedMedia(host, event.clientX, event.clientY);
      markOverMedia(host, over);

      if (!over) {
        return;
      }

      showAt(host, event.clientX, event.clientY);
      cue.press();
    },
    [cue, markOverMedia, showAt],
  );

  const onPointerUp = useCallback(() => {
    cue.release();
  }, [cue]);

  const onPointerCancel = useCallback(() => {
    cue.release();
  }, [cue]);

  const onPointerLeave = useCallback(
    (event: PointerEvent<T>) => {
      pointerSessionRef.current = false;
      markFinePointer();
      lastPointerRef.current = null;
      markOverMedia(event.currentTarget, false);

      const next =
        event.relatedTarget instanceof Element
          ? event.relatedTarget.closest("[data-explore-cue-target]")
          : null;

      cue.release();

      if (next && next !== event.currentTarget) {
        return;
      }

      cue.hide(event.currentTarget, { x: event.clientX, y: event.clientY });
    },
    [cue, markOverMedia],
  );

  const onFocus = useCallback(
    (event: FocusEvent<T>) => {
      if (!enabledRef.current) {
        return;
      }

      if (pointerSessionRef.current || wasRecentFinePointer()) {
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
      showAt(event.currentTarget, (box.left + box.right) / 2, (box.top + box.bottom) / 2);
    },
    [markOverMedia, showAt],
  );

  const onBlur = useCallback(
    (event: FocusEvent<T>) => {
      if (pointerSessionRef.current) {
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
        const over = isPointerOverLoadedMedia(hostNode, last.x, last.y);
        if (over) {
          if (!overMediaRef.current) {
            markOverMedia(hostNode, true);
            showAt(hostNode, last.x, last.y);
          }
          return;
        }

        if (overMediaRef.current) {
          markOverMedia(hostNode, false);
          cue.release();
          cue.hide(hostNode, last ?? undefined);
        }
        return;
      }

      if (
        pointerSessionRef.current ||
        wasRecentFinePointer() ||
        !hostNode.matches(":focus-visible")
      ) {
        return;
      }

      const box = loadedMediaPaintBox(hostNode);
      if (!box) {
        if (overMediaRef.current) {
          markOverMedia(hostNode, false);
          cue.hide(hostNode);
        }
        return;
      }

      markOverMedia(hostNode, true);
      showAt(hostNode, (box.left + box.right) / 2, (box.top + box.bottom) / 2);
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
  }, [cue, enabled, hostNode, markOverMedia, showAt]);

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
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    onFocus,
    onBlur,
  };
}
