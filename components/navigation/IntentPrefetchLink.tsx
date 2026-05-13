"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  type ComponentProps,
  type FocusEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
  type TouchEvent,
} from "react";
import { allowNavigatorRoutePrefetch } from "@/lib/allowNavigatorRoutePrefetch";
import { useNavigationFlightLock } from "@/lib/useNavigationFlightLock";

type LinkComponentProps = ComponentProps<typeof Link>;

type IntentPrefetchLinkProps = Omit<
  LinkComponentProps,
  "onFocus" | "onPointerEnter" | "onPointerLeave" | "onTouchStart" | "prefetch"
> & {
  onFocus?: LinkComponentProps["onFocus"];
  onPointerEnter?: LinkComponentProps["onPointerEnter"];
  onPointerLeave?: LinkComponentProps["onPointerLeave"];
  onTouchStart?: LinkComponentProps["onTouchStart"];
  prefetchDelayMs?: number;
};

const prefetchedHrefs = new Set<string>();
const DEFAULT_PREFETCH_DELAY_MS = 80;

function prefetchHrefFromProp(href: LinkComponentProps["href"]) {
  if (typeof href !== "string") {
    return null;
  }

  if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/#")) {
    return null;
  }

  return href;
}

export function IntentPrefetchLink({
  href,
  onFocus,
  onPointerEnter,
  onPointerLeave,
  onTouchStart,
  onClick,
  scroll,
  prefetchDelayMs = DEFAULT_PREFETCH_DELAY_MS,
  ...rest
}: IntentPrefetchLinkProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { guardedPush, isPendingNav } = useNavigationFlightLock(pathname);
  const timeoutRef = useRef<number | null>(null);
  const prefetchHref = prefetchHrefFromProp(href);

  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) {
        return;
      }
      if (!prefetchHref) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      guardedPush(prefetchHref, scroll === false ? { scroll: false } : undefined);
    },
    [guardedPush, onClick, prefetchHref, scroll],
  );

  const clearPendingPrefetch = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const prefetch = useCallback(() => {
    if (!prefetchHref || prefetchedHrefs.has(prefetchHref) || !allowNavigatorRoutePrefetch()) {
      return;
    }

    prefetchedHrefs.add(prefetchHref);
    router.prefetch(prefetchHref);
  }, [prefetchHref, router]);

  const schedulePrefetch = useCallback(() => {
    clearPendingPrefetch();

    if (prefetchDelayMs <= 0) {
      prefetch();
      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      prefetch();
    }, prefetchDelayMs);
  }, [clearPendingPrefetch, prefetch, prefetchDelayMs]);

  const handleFocus = (event: FocusEvent<HTMLAnchorElement>) => {
    onFocus?.(event);
    prefetch();
  };

  const handlePointerEnter = (event: PointerEvent<HTMLAnchorElement>) => {
    onPointerEnter?.(event);

    if (event.pointerType === "mouse" || event.pointerType === "pen") {
      schedulePrefetch();
    }
  };

  const handlePointerLeave = (event: PointerEvent<HTMLAnchorElement>) => {
    onPointerLeave?.(event);
    clearPendingPrefetch();
  };

  const handleTouchStart = (event: TouchEvent<HTMLAnchorElement>) => {
    onTouchStart?.(event);
    prefetch();
  };

  useEffect(() => clearPendingPrefetch, [clearPendingPrefetch]);

  return (
    <Link
      {...rest}
      href={href}
      scroll={scroll}
      prefetch={false}
      aria-busy={isPendingNav || undefined}
      onClick={handleClick}
      onFocus={handleFocus}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
    />
  );
}
