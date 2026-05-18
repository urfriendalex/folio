"use client";

import type { NavigateOptions } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

function pathnameFromHref(href: string) {
  const pathname = href.split(/[?#]/, 1)[0] ?? href;

  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

/**
 * Route transition helper. It exposes pending state for chrome, but it does not
 * lock navigation: background route/media loading must not prevent the next user action.
 */
export function useNavigationFlightLock(pathname: string | null) {
  const router = useRouter();
  const [isPendingNav, startTransition] = useTransition();

  const guardedPush = useCallback(
    (href: string, options?: NavigateOptions): boolean => {
      if (pathname && pathnameFromHref(href) === pathnameFromHref(pathname)) {
        return false;
      }

      startTransition(() => {
        router.push(href, options);
      });

      return true;
    },
    [pathname, router],
  );

  return { guardedPush, isPendingNav };
}
