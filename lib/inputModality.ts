/** Matches the zero-specificity keyboard-focus gate used in shared/component CSS. */
export const KEYBOARD_FOCUS_SELECTOR =
  ':focus-visible:not(:where([data-input-modality="pointer"] *))';
