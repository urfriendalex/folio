const NON_BREAKING_HYPHEN = "\u2011";

/**
 * Replaces ASCII hyphens between letters/numbers with a non-breaking hyphen (U+2011) so
 * line layout (Pretext canvas + browser) does not split compounds like `e-commerce`,
 * `co-op`, or numeric ranges at the hyphen.
 */
export function lockInternalHyphenWrapping(text: string): string {
  return text.replace(
    /(?<=[\p{L}\p{M}\p{N}])-(?=[\p{L}\p{M}\p{N}])/gu,
    NON_BREAKING_HYPHEN,
  );
}
