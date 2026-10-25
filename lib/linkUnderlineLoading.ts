/**
 * Route-loading underline on `.link-underline` links (`aria-busy` comes from the shared pending route).
 *
 * CSS holds the busy link's line full: already drawn under a hover or a tap, otherwise it draws in with
 * the regular 0.3s underline transition. Once that line is complete this loop takes over from it — the
 * line leaves to the right, draws back in from the left, and repeats. It runs as a Web Animation rather
 * than a CSS one so that when loading ends, the line can leave from wherever it is: it fades out in
 * place, mid-loop, and is never drawn full again as a finish. If the link is still hovered (a tap on a
 * phone leaves it hovered) or focused, it rests without a line until the pointer or focus moves off,
 * so the hover underline doesn't come back as the loading's last frame.
 */

const HOLD_MS = 300;
const LOOP_MS = 1300;
const FADE_MS = 240;
// A soft in-out: each turn slows into the end of the line without lingering on an empty one.
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

const LOOP_KEYFRAMES: Keyframe[] = [
  { offset: 0, transformOrigin: "100% 50%", transform: "scale3d(1, 1, 1)", easing: EASE_IN_OUT },
  { offset: 0.5, transformOrigin: "100% 50%", transform: "scale3d(0, 1, 1)" },
  { offset: 0.5001, transformOrigin: "0% 50%", transform: "scale3d(0, 1, 1)", easing: EASE_IN_OUT },
  { offset: 1, transformOrigin: "0% 50%", transform: "scale3d(1, 1, 1)" },
];

export function watchLinkUnderlineLoading(): () => void {
  if (typeof Element === "undefined" || typeof Element.prototype.animate !== "function") {
    return () => {};
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const loops = new WeakMap<HTMLElement, Animation>();
  const fades = new WeakMap<HTMLElement, Animation>();

  const rest = (link: HTMLElement) => {
    // Also cuts the regular underline transition that started underneath when busy ended, so no
    // sliver of it shows once the fade lets go.
    link.dataset.underlineRest = "";
    const release = () => {
      delete link.dataset.underlineRest;
      link.removeEventListener("pointerleave", release);
      link.removeEventListener("blur", release);
    };

    if (link.matches(":hover, :focus-visible")) {
      link.addEventListener("pointerleave", release);
      link.addEventListener("blur", release);
    } else {
      requestAnimationFrame(() => requestAnimationFrame(release));
    }
  };

  const start = (link: HTMLElement) => {
    if (loops.has(link) || reducedMotion.matches) {
      return;
    }

    // Busy again while the last loading was fading out: drop that fade and its loop.
    fades.get(link)?.finish();

    loops.set(
      link,
      link.animate(LOOP_KEYFRAMES, {
        duration: LOOP_MS,
        delay: HOLD_MS,
        iterations: Infinity,
        pseudoElement: "::after",
      }),
    );
  };

  const settle = (link: HTMLElement) => {
    const loop = loops.get(link);
    if (!loop) {
      return;
    }

    loops.delete(link);
    // The loop keeps moving while the line fades out, so it simply dissolves mid-motion.
    const fade = link.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: FADE_MS,
      easing: EASE_OUT,
      fill: "forwards",
      pseudoElement: "::after",
    });
    fades.set(link, fade);
    fade.onfinish = () => {
      fades.delete(link);
      if (link.getAttribute("aria-busy") !== "true") {
        rest(link);
      }
      loop.cancel();
      fade.cancel();
    };
  };

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const link = record.target;
      if (!(link instanceof HTMLElement) || !link.classList.contains("link-underline")) {
        continue;
      }

      if (link.getAttribute("aria-busy") === "true") {
        start(link);
      } else {
        settle(link);
      }
    }
  });

  observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["aria-busy"] });
  document.querySelectorAll<HTMLElement>('.link-underline[aria-busy="true"]').forEach(start);

  return () => {
    observer.disconnect();
    document.querySelectorAll<HTMLElement>(".link-underline").forEach((link) => {
      loops.get(link)?.cancel();
      fades.get(link)?.cancel();
    });
  };
}
