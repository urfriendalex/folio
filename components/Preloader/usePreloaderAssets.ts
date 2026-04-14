"use client";

import { useEffect, useRef } from "react";
import { projects } from "@/content/projects";
import { archiveManifest } from "@/lib/generated/archive-manifest";

export type PreloadAsset =
  | {
      id: string;
      type: "image";
      src: string;
    }
  | {
      id: string;
      type: "fetch";
      src: string;
      responseType?: "arrayBuffer" | "json" | "text";
    }
  | {
      id: string;
      type: "fonts" | "lenis" | "window-load";
    };

const FOOTER_ASCII_FRAME_FOLDER = "/animations/0be291eb7c81020bd899984d1fdfdb48/high";

const sharedImageSources = Array.from(
  new Set([
    ...projects.map((project) => project.thumbnail),
    ...projects.flatMap((project) => project.stills),
    ...archiveManifest.map((entry) => entry.src),
  ]),
);

export const CRITICAL_PRELOAD_ASSETS: readonly PreloadAsset[] = [
  {
    id: "window-load",
    type: "window-load",
  },
  {
    id: "fonts",
    type: "fonts",
  },
  {
    id: "lenis",
    type: "lenis",
  },
  ...sharedImageSources.map((src) => ({
    id: `image:${src}`,
    type: "image" as const,
    src,
  })),
  {
    id: "toolbar-ascii-meta",
    type: "fetch",
    src: `${FOOTER_ASCII_FRAME_FOLDER}/meta.json`,
    responseType: "json",
  },
  {
    id: "toolbar-ascii-frame",
    type: "fetch",
    src: `${FOOTER_ASCII_FRAME_FOLDER}/frame_00001.bin`,
    responseType: "arrayBuffer",
  },
] as const;

const MAX_DURATION_MS = 12000;

function loadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    };

    image.decoding = "async";
    image.loading = "eager";
    image.onload = () => {
      if (typeof image.decode !== "function") {
        finish();
        return;
      }

      void image.decode().catch(() => undefined).finally(finish);
    };
    image.onerror = finish;
    image.src = src;

    if (image.complete) {
      if (typeof image.decode !== "function") {
        finish();
        return;
      }

      void image.decode().catch(() => undefined).finally(finish);
    }
  });
}

function waitForWindowLoad(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === "complete") {
      resolve();
      return;
    }

    window.addEventListener("load", () => resolve(), { once: true });
  });
}

function waitForFonts(): Promise<void> {
  return new Promise((resolve) => {
    if (!("fonts" in document)) {
      resolve();
      return;
    }

    void document.fonts.ready
      .catch(() => undefined)
      .finally(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
  });
}

function waitForLenis(): Promise<void> {
  return new Promise((resolve) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.__lenis) {
      resolve();
      return;
    }

    const startedAt = performance.now();
    const check = () => {
      if (window.__lenis || performance.now() - startedAt >= 2000) {
        resolve();
        return;
      }

      window.requestAnimationFrame(check);
    };

    window.requestAnimationFrame(check);
  });
}

async function loadFetchAsset(asset: Extract<PreloadAsset, { type: "fetch" }>): Promise<void> {
  try {
    const response = await fetch(asset.src, { credentials: "same-origin" });
    if (!response.ok) {
      return;
    }

    switch (asset.responseType) {
      case "json":
        await response.json();
        break;
      case "text":
        await response.text();
        break;
      case "arrayBuffer":
      default:
        await response.arrayBuffer();
        break;
    }
  } catch {
    // Best-effort warmup only.
  }
}

function loadAsset(asset: PreloadAsset): Promise<void> {
  switch (asset.type) {
    case "image":
      return loadImage(asset.src);
    case "fetch":
      return loadFetchAsset(asset);
    case "fonts":
      return waitForFonts();
    case "lenis":
      return waitForLenis();
    case "window-load":
      return waitForWindowLoad();
    default:
      return Promise.resolve();
  }
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
    const totalAssets = assets.length;

    actualProgressRef.current = totalAssets === 0 ? 1 : 0;
    isCompleteRef.current = false;

    const settleProgress = () => {
      if (totalAssets === 0) {
        actualProgressRef.current = 1;
        return;
      }

      actualProgressRef.current = loaded >= totalAssets ? 0.99 : loaded / totalAssets;
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

      finalize();
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
    }, MAX_DURATION_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutTimer);
    };
  }, [assets, enabled]);

  return {
    actualProgressRef,
    isCompleteRef,
  };
}
