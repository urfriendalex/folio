"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { clearHomeHeroRevealDone } from "@/lib/homeHeroRevealSession";

/** After the hero has finished once, sessionStorage skips replay; clear it when leaving `/` so an in-site
 *  return replays it — compressed via `html.home-hero-return` (back/forward is a restore and skips it). */
export function HomeHeroRevealSessionReset() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;

    if (prev === "/" && pathname !== "/") {
      clearHomeHeroRevealDone();
      document.documentElement.classList.remove("home-hero-return");
    }

    // In-site arrival back on `/`: the hero replays, compressed (reveal policy, lib/revealRestore.ts).
    if (prev !== null && prev !== "/" && pathname === "/") {
      document.documentElement.classList.add("home-hero-return");
    }
  }, [pathname]);

  return null;
}
