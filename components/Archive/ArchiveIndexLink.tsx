"use client";

import { createContext, useContext } from "react";

export const ArchiveFocusContext = createContext<((id: string) => void) | null>(null);

/** Native asset links remain usable without scripts or with modifier-clicks. */
export function ArchiveIndexLink({ id, href, title }: { id: string; href: string; title: string }) {
  const focus = useContext(ArchiveFocusContext);
  return (
    <a
      className="link-underline"
      href={href}
      data-archive-index-id={id}
      onClick={(event) => {
        if (!focus || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        focus(id);
        const catalogue = event.currentTarget.closest("details");
        if (catalogue) {
          catalogue.open = false;
          catalogue.querySelector("summary")?.focus({ preventScroll: true });
        }
      }}
    >
      {title}
    </a>
  );
}
