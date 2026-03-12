"use client";

import { useEffect, useRef } from "react";

export type PreloadAsset = {
  id: string;
  type: "image" | "font";
  src: string;
};

const MIN_DURATION_MS = 800;
const MAX_DURATION_MS = 4000;
const DEBUG_MIN_DURATION_MS = 12600;
const DEBUG_MAX_DURATION_MS = 122000;

export const CRITICAL_PRELOAD_ASSETS: readonly PreloadAsset[] = [
  {
    id: "hero-image",
    type: "image",
    src: "/images/hero-placeholder.svg",
  },
];

function loadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
}

function loadFont(asset: PreloadAsset): Promise<void> {
  return new Promise((resolve) => {
    if (typeof FontFace === "undefined" || !("fonts" in document)) {
      resolve();
      return;
    }

    const face = new FontFace(`preload-${asset.id}`, `url(${asset.src})`);
    face
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
      })
      .catch(() => undefined)
      .finally(() => resolve());
  });
}

function loadAsset(asset: PreloadAsset): Promise<void> {
  if (asset.type === "font") {
    return loadFont(asset);
  }

  return loadImage(asset.src);
}

export function usePreloaderAssets(
  assets: readonly PreloadAsset[] = CRITICAL_PRELOAD_ASSETS,
  enabled = true,
) {
  const actualProgressRef = useRef(0);
  const isCompleteRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      actualProgressRef.current = 0;
      isCompleteRef.current = false;
      return;
    }

    let cancelled = false;
    let loaded = 0;
    let minDurationTimer: number | null = null;
    const html = document.documentElement;
    const debugMode = html.getAttribute("data-preloader-debug") === "on";
    const minDurationMs = debugMode ? DEBUG_MIN_DURATION_MS : MIN_DURATION_MS;
    const maxDurationMs = debugMode ? DEBUG_MAX_DURATION_MS : MAX_DURATION_MS;

    const startedAt = performance.now();
    const totalAssets = assets.length;

    actualProgressRef.current = totalAssets === 0 ? 1 : 0;
    isCompleteRef.current = false;

    const settleProgress = () => {
      actualProgressRef.current = totalAssets === 0 ? 1 : loaded / totalAssets;
    };

    const finalize = () => {
      if (cancelled || isCompleteRef.current) {
        return;
      }

      actualProgressRef.current = 1;
      isCompleteRef.current = true;
    };

    const scheduleCompletion = () => {
      if (loaded < totalAssets || cancelled || isCompleteRef.current) {
        return;
      }

      const elapsed = performance.now() - startedAt;
      const waitTime = Math.max(minDurationMs - elapsed, 0);

      if (waitTime === 0) {
        finalize();
        return;
      }

      minDurationTimer = window.setTimeout(() => {
        finalize();
      }, waitTime);
    };

    assets.forEach((asset) => {
      loadAsset(asset).finally(() => {
        if (cancelled || isCompleteRef.current) {
          return;
        }

        loaded += 1;
        settleProgress();
        scheduleCompletion();
      });
    });

    if (totalAssets === 0) {
      scheduleCompletion();
    }

    const timeoutTimer = window.setTimeout(() => {
      finalize();
    }, maxDurationMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutTimer);
      if (minDurationTimer !== null) {
        window.clearTimeout(minDurationTimer);
      }
    };
  }, [assets, enabled]);

  return {
    actualProgressRef,
    isCompleteRef,
  };
}
