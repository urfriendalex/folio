"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type HeroRevealTimelineContextValue = {
  ctaAligned: boolean;
  setCtaAligned: (next: boolean) => void;
};

export const HeroRevealTimelineContext =
  createContext<HeroRevealTimelineContextValue | null>(null);

export function HeroRevealTimelineProvider({ children }: { children: ReactNode }) {
  const [ctaAligned, setCtaAlignedState] = useState(false);
  const setCtaAligned = useCallback((next: boolean) => {
    setCtaAlignedState(next);
  }, []);

  const value = useMemo(
    () => ({ ctaAligned, setCtaAligned }),
    [ctaAligned, setCtaAligned],
  );

  return (
    <HeroRevealTimelineContext.Provider value={value}>
      {children}
    </HeroRevealTimelineContext.Provider>
  );
}

/** HeroSection: read/write timeline when wrapped in {@link HeroRevealTimelineProvider}. */
export function useOptionalHeroRevealTimeline(): HeroRevealTimelineContextValue | null {
  return useContext(HeroRevealTimelineContext);
}

/**
 * Work-aligned reveals: true once hero reaches CTA line stagger.
 * Outside the provider, returns true (intersection-only fallback).
 */
export function useWorkCtaRevealAligned(): boolean {
  const ctx = useContext(HeroRevealTimelineContext);
  return ctx?.ctaAligned ?? true;
}
