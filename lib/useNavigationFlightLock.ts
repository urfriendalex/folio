"use client";

import type { NavigateOptions } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";
import { useCallback, useSyncExternalStore, useTransition } from "react";

export function pathnameFromHref(href: string) {
  const pathname = href.split(/[?#]/, 1)[0] ?? href;

  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export const ROUTE_PENDING_CLASS = "route-pending";
const ROUTE_PENDING_TIMEOUT_MS = 10000;
let routePendingTimeout = 0;
let pendingRoute: string | null = null;
const pendingRouteListeners = new Set<() => void>();

/**
 * One app-wide pending destination (pathname), so the newest tap is the only one shown as loading
 * and `<html>` carries `route-pending` for the dim. `RouteTransition` clears it once a path commits.
 */
export function setRoutePending(href: string | null) {
  if (typeof document === "undefined") {
    return;
  }

  const next = href === null ? null : pathnameFromHref(href);
  window.clearTimeout(routePendingTimeout);
  document.documentElement.classList.toggle(ROUTE_PENDING_CLASS, next !== null);

  if (next !== null) {
    /* Safety net: an aborted or failed navigation must not leave the page dimmed. */
    routePendingTimeout = window.setTimeout(() => setRoutePending(null), ROUTE_PENDING_TIMEOUT_MS);
  }

  if (next !== pendingRoute) {
    pendingRoute = next;
    pendingRouteListeners.forEach((listener) => listener());
  }
}

function subscribePendingRoute(listener: () => void) {
  pendingRouteListeners.add(listener);
  return () => {
    pendingRouteListeners.delete(listener);
  };
}

/** Pathname of the route currently loading, or `null`. */
export function usePendingRoute() {
  return useSyncExternalStore(
    subscribePendingRoute,
    () => pendingRoute,
    () => null,
  );
}

/**
 * Route transition helper. It exposes pending state for chrome, but it does not
 * lock navigation: background route/media loading must not prevent the next user action.
 * The latest intent wins — a new push supersedes the pending one, and `cancelPendingNav`
 * lets in-page actions (About, hash scroll, closing the menu) drop a route still in flight.
 */
export function useNavigationFlightLock(pathname: string | null) {
  const router = useRouter();
  const [isPendingNav, startTransition] = useTransition();

  const guardedPush = useCallback(
    (href: string, options?: NavigateOptions): boolean => {
      const target = pathnameFromHref(href);

      if (pathname && target === pathnameFromHref(pathname)) {
        /* Back to where we are: drop whatever was in flight instead of landing on it later. */
        if (pendingRoute !== null) {
          setRoutePending(null);
          startTransition(() => {
            router.replace(window.location.href, { scroll: false });
          });
        }
        return false;
      }

      if (target === pendingRoute) {
        return true;
      }

      setRoutePending(target);
      startTransition(() => {
        router.push(href, options);
      });

      return true;
    },
    [pathname, router],
  );

  /**
   * Supersede a pending route with the current URL (Next has no abort; the newest navigation wins).
   * `href` lets a same-page hash action keep its own URL instead of being overwritten.
   */
  const cancelPendingNav = useCallback(
    (href?: string) => {
      if (pendingRoute === null) {
        return;
      }

      const url = href ?? window.location.href;
      setRoutePending(null);
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    },
    [router],
  );

  return { guardedPush, cancelPendingNav, isPendingNav };
}
