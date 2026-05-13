"use client";

import type { NavigateOptions } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";

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
      if (inFlightRef.current) {
        return false;
      }

      inFlightRef.current = true;

      startTransition(() => {
        router.push(href, options);
      });

      return true;
    },
    [router],
  );

  return { guardedPush, isPendingNav };
}
