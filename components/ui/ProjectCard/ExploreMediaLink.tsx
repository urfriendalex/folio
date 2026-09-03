"use client";

import { type ReactNode } from "react";
import { useExploreCueTarget } from "@/components/ui/ExploreCue";
import { IntentPrefetchLink } from "@/components/navigation/IntentPrefetchLink";
import styles from "./ProjectCard.module.scss";

type ExploreMediaLinkProps = {
  href: string;
  ariaLabel: string;
  children: ReactNode;
};

export function ExploreMediaLink({ href, ariaLabel, children }: ExploreMediaLinkProps) {
  const cue = useExploreCueTarget<HTMLAnchorElement>({ label: "explore" });

  return (
    <IntentPrefetchLink
      ref={cue.setRef}
      href={href}
      className={styles.media}
      aria-label={ariaLabel}
      nativeNavigation
      onPointerEnter={cue.onPointerEnter}
      onPointerMove={cue.onPointerMove}
      onPointerLeave={cue.onPointerLeave}
      onFocus={cue.onFocus}
      onBlur={cue.onBlur}
    >
      {children}
    </IntentPrefetchLink>
  );
}
