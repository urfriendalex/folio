import { scrollToTarget } from "@/lib/smoothScroll";

export type HomeContactFormOpenOptions = {
  /** Skip email→form delay and jump scroll (e.g. hero CTA). */
  instant?: boolean;
};

type Opener = (options?: HomeContactFormOpenOptions) => void;

let opener: Opener | null = null;

export function registerHomeContactFormOpener(fn: Opener): () => void {
  opener = fn;
  return () => {
    opener = null;
  };
}

/** Opens the inline gooey contact form on the home page (same as “Open contact form” in #contact). */
export function requestHomeContactFormOpen(options?: HomeContactFormOpenOptions): void {
  if (opener) {
    opener(options);
    return;
  }

  scrollToTarget("#contact", options?.instant ? { immediate: true } : undefined);
}
