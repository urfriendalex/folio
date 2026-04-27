"use client";

import { useEffect, useState } from "react";

/**
 * True when the device is likely to use touch as the primary input
 * (touch events, touch points, or coarse pointer), so hover-based UI
 * should fall back to other behaviors.
 */
export function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const getIsTouchDevice = () => {
      const hasTouchEvent = "ontouchstart" in window;
      const hasTouchPoints = navigator.maxTouchPoints > 0;
      const hasCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;

      return hasTouchEvent || hasTouchPoints || hasCoarsePointer;
    };

    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const handleChange = () => {
      setIsTouchDevice(getIsTouchDevice());
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isTouchDevice;
}
