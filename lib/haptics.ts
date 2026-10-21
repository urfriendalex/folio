/**
 * Tiny haptic tick for touch feedback. Must be called inside a user gesture (tap / pointerup).
 *
 * - Android / Chromium: the Vibration API (`navigator.vibrate`).
 * - iOS Safari has no Vibration API. Since iOS 18 a native `<input type="checkbox" switch>` plays the
 *   system haptic when toggled, so we toggle a hidden one through its label. Older iOS: silently nothing.
 * - Desktop / reduced motion: no-op.
 */
let iosSwitchLabel: HTMLLabelElement | null = null;

function iosLabel() {
  if (iosSwitchLabel?.isConnected) return iosSwitchLabel;
  const id = "folio-haptic-switch";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  input.setAttribute("aria-hidden", "true");
  const label = document.createElement("label");
  label.htmlFor = id;
  label.setAttribute("aria-hidden", "true");
  for (const element of [input, label]) {
    Object.assign(element.style, {
      position: "fixed",
      width: "1px",
      height: "1px",
      opacity: "0",
      pointerEvents: "none",
      overflow: "hidden",
      clipPath: "inset(50%)",
    });
  }
  document.body.append(input, label);
  iosSwitchLabel = label;
  return label;
}

export function hapticTick() {
  if (typeof window === "undefined") return;
  if (!window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(10);
    return;
  }

  if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    iosLabel().click();
  }
}
