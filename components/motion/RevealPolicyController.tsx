"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { clearRevealPolicy, initializeRevealPolicy } from "@/lib/revealPolicy";

export function RevealPolicyController() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    initializeRevealPolicy();
    return clearRevealPolicy;
  }, [pathname]);

  return null;
}
