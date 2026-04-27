import gsap from "gsap";

/**
 * GSAP timeline: blur ramp, opacity crossfade, y nudge (viewBox height 20, text y=15.5).
 */
export function createGooeyContactTimeline(args: {
  textsGroupEl: SVGGElement;
  text1: SVGTextElement | Element;
  text2: SVGTextElement | Element;
  feBlur: SVGFEGaussianBlurElement;
  primitiveValues: { stdDeviation: number };
  /** When false (mobile loop), omit onComplete/onReverseComplete like an infinitely playing tl */
  clearFilterOnEnd: boolean;
}) {
  const { textsGroupEl, text1, text2, feBlur, primitiveValues, clearFilterOnEnd } = args;

  const tl = gsap.timeline({
    paused: true,
    ...(clearFilterOnEnd
      ? {
          onComplete: () => {
            textsGroupEl.style.filter = "none";
          },
          onReverseComplete: () => {
            textsGroupEl.style.filter = "none";
          },
        }
      : {}),
    onUpdate: () => {
      feBlur.setAttribute("stdDeviation", String(primitiveValues.stdDeviation));
    },
  });

  tl.to(
    primitiveValues,
    {
      duration: 0.4,
      ease: "none",
      startAt: { stdDeviation: 0 },
      stdDeviation: 1,
    },
    0,
  )
    .to(primitiveValues, {
      duration: 0.4,
      ease: "none",
      stdDeviation: 0,
    })
    .to(
      text1,
      {
        duration: 0.8,
        ease: "none",
        opacity: 0,
      },
      0,
    )
    .to(
      text2,
      {
        duration: 0.8,
        ease: "none",
        opacity: 1,
      },
      0,
    )
    .to(
      text1,
      {
        duration: 0.8,
        ease: "power1.inOut",
        y: -5,
      },
      0,
    )
    .to(
      text2,
      {
        duration: 0.8,
        ease: "power1.inOut",
        startAt: { y: 5 },
        y: 0,
      },
      0,
    );

  return tl;
}
