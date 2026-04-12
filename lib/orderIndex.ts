/**
 * Computes a new orderIndex between two adjacent items.
 * Uses a midpoint gap strategy — inserts exactly halfway between prev and next.
 * Falls back to sensible defaults when at the start or end of the list.
 */
export function computeOrderIndex(prev: number | undefined, next: number | undefined): number {
  if (prev === undefined && next === undefined) return 1000
  if (prev === undefined) return next! / 2
  if (next === undefined) return prev + 1000
  return (prev + next) / 2
}
