"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { watchLinkUnderlineLoading } from "@/lib/linkUnderlineLoading";
import { setRoutePending } from "@/lib/useNavigationFlightLock";

const ROUTE_ENTER_CLASS = "route-entering";
const ROUTE_ENTER_MS = 260;

/**
 * Client-only route chrome: clears the pending dim and plays a short fade on `<main>` after an
 * in-app navigation commits. Never runs on the first paint, so server HTML stays fully visible.
 */
export function RouteTransition() {
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);

  useEffect(() => watchLinkUnderlineLoading(), []);

  useEffect(() => {
    /* Back/forward supersedes any pushed route; the popstate target may even be the current path. */
    const onPopState = () => setRoutePending(null);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return;
    }

    previousPathnameRef.current = pathname;
    const html = document.documentElement;
    setRoutePending(null);
    html.classList.add(ROUTE_ENTER_CLASS);

    const timeout = window.setTimeout(() => {
      html.classList.remove(ROUTE_ENTER_CLASS);
    }, ROUTE_ENTER_MS);

    return () => {
      window.clearTimeout(timeout);
      html.classList.remove(ROUTE_ENTER_CLASS);
    };
  }, [pathname]);

  return null;
}
