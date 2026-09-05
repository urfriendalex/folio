"use client";

import { useEffect, useRef } from "react";

const MAX_DURATION_MS = 12000;
const FONT_TIMEOUT_MS = 5000;
const COLLECT_MS = 280;
const COLLECT_QUIET_MS = 140;
const MAX_COLLECT_MS = 1600;

const IGNORED_INITIATORS = new Set([
  "audio",
  "beacon",
  "early-hints",
  "ping",
  "video",
]);

const IGNORED_NAME_PATTERN =
  /(?:^|\/)(?:_vercel\/(?:insights|speed-insights)|vitals|favicon|apple-touch-icon)|\/ascii\//i;

const PENDING_BYTES_BY_INITIATOR: Record<string, number> = {
  css: 12_288,
  fetch: 16_384,
  font: 24_576,
  img: 81_920,
  link: 12_288,
  script: 49_152,
  xmlhttprequest: 16_384,
};

function shouldTrackResource(name: string, initiatorType: string) {
  if (IGNORED_INITIATORS.has(initiatorType)) {
    return false;
  }

  if (name.startsWith("data:") || name.startsWith("blob:")) {
    return false;
  }

  return !IGNORED_NAME_PATTERN.test(name);
}

function isResourceFinished(entry: PerformanceResourceTiming) {
  return entry.responseEnd > 0;
}

function resourceWeight(entry: PerformanceResourceTiming) {
  const measured = entry.encodedBodySize || entry.transferSize || entry.decodedBodySize;

  if (measured > 0) {
    return measured;
  }

  return PENDING_BYTES_BY_INITIATOR[entry.initiatorType] ?? 16_384;
}

function isPreloaderOwnedImage(image: HTMLImageElement) {
  return Boolean(image.closest("[data-preloader-overlay='true']"));
}

function shouldTrackImage(image: HTMLImageElement) {
  if (isPreloaderOwnedImage(image)) {
    return false;
  }

  const source = image.currentSrc || image.getAttribute("src");

  if (!source) {
    return false;
  }

  if (image.loading === "lazy" && !image.complete && !image.currentSrc) {
    return false;
  }

  return true;
}

function getFontProgress() {
  if (!("fonts" in document)) {
    return 1;
  }

  if (document.fonts.status === "loaded") {
    return 1;
  }

  let loaded = 0;
  let total = 0;

  document.fonts.forEach((face) => {
    total += 1;

    if (face.status === "loaded" || face.status === "error") {
      loaded += 1;
    }
  });

  if (total === 0) {
    return document.fonts.status === "loading" ? 0.35 : 1;
  }

  return loaded / total;
}

function getDocumentProgress() {
  switch (document.readyState) {
    case "complete":
      return 1;
    case "interactive":
      return 0.72;
    default:
      return 0.28;
  }
}

function waitForFonts(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (!("fonts" in document)) {
      resolve();
      return;
    }

    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      resolve();
    };

    const timeoutId = window.setTimeout(finish, timeoutMs);

    void document.fonts.ready.catch(() => undefined).finally(finish);
  });
}

function waitForDocumentComplete(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === "complete") {
      resolve();
      return;
    }

    const onLoad = () => {
      window.removeEventListener("load", onLoad);
      resolve();
    };

    window.addEventListener("load", onLoad, { once: true });
  });
}

export function usePreloaderAssets(enabled = true) {
  const actualProgressRef = useRef(0);
  const isCompleteRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      actualProgressRef.current = 0;
      isCompleteRef.current = false;
      return;
    }

    let cancelled = false;
    let collectionLocked = false;
    let fontsReady = false;
    let documentReady = document.readyState === "complete";
    let lastResourceAt = performance.now();
    let lockTimer: number | null = null;

    const resources = new Map<string, PerformanceResourceTiming>();
    const images = new Set<HTMLImageElement>();
    const imageListeners = new Map<HTMLImageElement, () => void>();

    actualProgressRef.current = 0;
    isCompleteRef.current = false;

    const finalize = () => {
      if (cancelled || isCompleteRef.current) {
        return;
      }

      actualProgressRef.current = 1;
      isCompleteRef.current = true;
    };

    const computeProgress = () => {
      let loadedBytes = 0;
      let totalBytes = 0;

      resources.forEach((entry) => {
        const weight = resourceWeight(entry);
        totalBytes += weight;

        if (isResourceFinished(entry)) {
          loadedBytes += weight;
        }
      });

      const resourceProgress = totalBytes === 0 ? 1 : loadedBytes / totalBytes;

      let settledImages = 0;
      images.forEach((image) => {
        if (image.complete) {
          settledImages += 1;
        }
      });

      const imageProgress = images.size === 0 ? 1 : settledImages / images.size;
      const fontProgress = fontsReady ? 1 : getFontProgress();
      const documentProgress = documentReady ? 1 : getDocumentProgress();

      const combined =
        resources.size > 0
          ? resourceProgress * 0.7 + imageProgress * 0.12 + fontProgress * 0.12 + documentProgress * 0.06
          : imageProgress * 0.45 + fontProgress * 0.35 + documentProgress * 0.2;

      return Math.max(0, Math.min(0.99, combined));
    };

    const resourcesFinished = () => {
      if (resources.size === 0) {
        return true;
      }

      for (const entry of resources.values()) {
        if (!isResourceFinished(entry)) {
          return false;
        }
      }

      return true;
    };

    const imagesFinished = () => {
      for (const image of images) {
        if (!image.complete) {
          return false;
        }
      }

      return true;
    };

    const settleProgress = () => {
      if (cancelled || isCompleteRef.current) {
        return;
      }

      actualProgressRef.current = Math.max(actualProgressRef.current, computeProgress());
    };

    const scheduleCompletion = () => {
      if (
        cancelled ||
        isCompleteRef.current ||
        !collectionLocked ||
        !fontsReady ||
        !documentReady ||
        !resourcesFinished() ||
        !imagesFinished()
      ) {
        return;
      }

      finalize();
    };

    const upsertResource = (entry: PerformanceResourceTiming) => {
      if (!shouldTrackResource(entry.name, entry.initiatorType)) {
        return;
      }

      if (collectionLocked && !resources.has(entry.name)) {
        return;
      }

      resources.set(entry.name, entry);
      lastResourceAt = performance.now();
      settleProgress();
      scheduleCompletion();
    };

    const attachImage = (image: HTMLImageElement) => {
      if (images.has(image) || !shouldTrackImage(image)) {
        return;
      }

      if (collectionLocked) {
        return;
      }

      images.add(image);

      const onSettled = () => {
        image.removeEventListener("load", onSettled);
        image.removeEventListener("error", onSettled);
        imageListeners.delete(image);
        settleProgress();
        scheduleCompletion();
      };

      if (!image.complete) {
        image.addEventListener("load", onSettled);
        image.addEventListener("error", onSettled);
        imageListeners.set(image, onSettled);
      }

      settleProgress();
      scheduleCompletion();
    };

    const collectImages = () => {
      Array.from(document.images).forEach(attachImage);
    };

    const lockCollection = () => {
      if (collectionLocked || cancelled) {
        return;
      }

      collectionLocked = true;
      collectImages();
      settleProgress();
      scheduleCompletion();
    };

    const scheduleLock = () => {
      if (collectionLocked || cancelled) {
        return;
      }

      if (lockTimer !== null) {
        window.clearTimeout(lockTimer);
      }

      const elapsed = performance.now() - startedAt;
      const quietFor = performance.now() - lastResourceAt;
      const canLock = elapsed >= COLLECT_MS && quietFor >= COLLECT_QUIET_MS;
      const mustLock = elapsed >= MAX_COLLECT_MS;

      if (canLock || mustLock) {
        lockCollection();
        return;
      }

      lockTimer = window.setTimeout(scheduleLock, 50);
    };

    const startedAt = performance.now();

    performance.getEntriesByType("resource").forEach((entry) => {
      upsertResource(entry as PerformanceResourceTiming);
    });

    collectImages();
    settleProgress();

    let resourceObserver: PerformanceObserver | null = null;

    try {
      resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          upsertResource(entry as PerformanceResourceTiming);
        });
        scheduleLock();
      });

      try {
        resourceObserver.observe({ type: "resource", buffered: true });
      } catch {
        resourceObserver.observe({ entryTypes: ["resource"] });
      }
    } catch {
      resourceObserver = null;
    }

    const mutationObserver = new MutationObserver(() => {
      if (collectionLocked) {
        return;
      }

      collectImages();
      scheduleLock();
    });

    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const onReadyStateChange = () => {
      if (document.readyState === "complete") {
        documentReady = true;
        settleProgress();
        scheduleCompletion();
      }
    };

    document.addEventListener("readystatechange", onReadyStateChange);
    void waitForDocumentComplete().then(() => {
      if (cancelled) {
        return;
      }

      documentReady = true;
      settleProgress();
      scheduleCompletion();
    });

    const onFontChange = () => {
      settleProgress();
      scheduleCompletion();
    };

    if ("fonts" in document) {
      document.fonts.addEventListener("loadingdone", onFontChange);
      document.fonts.addEventListener("loadingerror", onFontChange);
    }

    void waitForFonts(FONT_TIMEOUT_MS).then(() => {
      if (cancelled) {
        return;
      }

      fontsReady = true;
      settleProgress();
      scheduleCompletion();
    });

    scheduleLock();

    const timeoutTimer = window.setTimeout(() => {
      finalize();
    }, MAX_DURATION_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutTimer);

      if (lockTimer !== null) {
        window.clearTimeout(lockTimer);
      }

      resourceObserver?.disconnect();
      mutationObserver.disconnect();
      document.removeEventListener("readystatechange", onReadyStateChange);

      if ("fonts" in document) {
        document.fonts.removeEventListener("loadingdone", onFontChange);
        document.fonts.removeEventListener("loadingerror", onFontChange);
      }

      imageListeners.forEach((onSettled, image) => {
        image.removeEventListener("load", onSettled);
        image.removeEventListener("error", onSettled);
      });
    };
  }, [enabled]);

  return {
    actualProgressRef,
    isCompleteRef,
  };
}
