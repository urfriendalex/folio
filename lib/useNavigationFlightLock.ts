"use client";

import type { NavigateOptions } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";

function pathnameFromHref(href: string) {
  const pathname = href.split(/[?#]/, 1)[0] ?? href;

  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

/**
 * One in-flight soft navigation at a time: avoids stacked `_rsc` fetches when users
 * click Next/Prev or primary nav repeatedly while other assets compete for bandwidth.
 *
 * Uses a synchronous ref gate (blocks double-invoke before React marks the transition pending)
 * plus `useTransition` for `isPending`-driven chrome. Resets when `pathname` commits.
 */
export function useNavigationFlightLock(pathname: string | null) {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const [isPendingNav, startTransition] = useTransition();

  useEffect(() => {
    inFlightRef.current = false;
  }, [pathname]);

  const guardedPush = useCallback(
    (href: string, options?: NavigateOptions): boolean => {
      if (pathname && pathnameFromHref(href) === pathnameFromHref(pathname)) {
        return false;
      }

      if (inFlightRef.current) {
        return false;
      }

      inFlightRef.current = true;

      startTransition(() => {
        router.push(href, options);
      });

      return true;
    },
    [pathname, router],
  );

  return { guardedPush, isPendingNav };
}
