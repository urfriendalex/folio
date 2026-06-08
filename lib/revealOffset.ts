/** 0-based stagger index for RevealLines `--token-index` and overlay pill/link delays. */
export function resolveRevealOffset(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function resolveTokenIndex(offset: number | undefined, index: number): number {
  return resolveRevealOffset(offset) + index;
}
