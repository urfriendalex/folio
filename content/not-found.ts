/**
 * Copy for the fullscreen 404 experience (Win98-style window + canvas trail).
 * Kept in one place so the DOM and trail snapshot renderer stay in sync.
 */
export const notFoundContent = {
  windowTitle: "YANSONS · Page not found",
  copyLabel: "Message:",
  copy:
    "This URL is not part of the folio. Use the links to go home, browse work, or get in touch.",
  closeLabel: "×",
  /** Title-bar mark (matches navbar “AY.”) */
  brandMark: "AY.",
  /** Order and behavior mirror the primary nav (home via logo rules, Work/Contact anchors). */
  quickLinks: [
    { kind: "home" as const, label: "Home" },
    { kind: "work" as const, label: "Work" },
    { kind: "archive" as const, label: "Archive" },
    { kind: "contact" as const, label: "Contact" },
  ],
} as const;
