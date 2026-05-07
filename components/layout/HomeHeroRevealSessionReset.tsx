"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { clearHomeHeroRevealDone } from "@/lib/homeHeroRevealSession";

/** After the hero has finished once, sessionStorage skips replay; clear it when leaving `/` so SPA return replay matches first visit. */
export function HomeHeroRevealSessionReset() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;

    if (prev === "/" && pathname !== "/") {
      clearHomeHeroRevealDone();
    }
  }, [pathname]);

  return null;
}
