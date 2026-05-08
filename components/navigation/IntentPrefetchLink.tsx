"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  type ComponentProps,
  type FocusEvent,
  type PointerEvent,
  type TouchEvent,
} from "react";

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

type NavigatorWithConnection = Navigator & {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
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

function shouldSpeculativelyPrefetch() {
  const connection = (navigator as NavigatorWithConnection).connection;

  if (!connection) {
    return true;
  }

  if (connection.saveData) {
    return false;
  }

  return connection.effectiveType !== "slow-2g" && connection.effectiveType !== "2g";
}

export function IntentPrefetchLink({
  href,
  onFocus,
  onPointerEnter,
  onPointerLeave,
  onTouchStart,
  prefetchDelayMs = DEFAULT_PREFETCH_DELAY_MS,
  ...props
}: IntentPrefetchLinkProps) {
  const router = useRouter();
  const timeoutRef = useRef<number | null>(null);
  const prefetchHref = prefetchHrefFromProp(href);

  const clearPendingPrefetch = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const prefetch = useCallback(() => {
    if (!prefetchHref || prefetchedHrefs.has(prefetchHref) || !shouldSpeculativelyPrefetch()) {
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
      {...props}
      href={href}
      prefetch={false}
      onFocus={handleFocus}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
    />
  );
}
