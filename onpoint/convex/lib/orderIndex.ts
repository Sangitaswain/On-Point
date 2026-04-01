/**
 * Computes a new orderIndex between two existing values.
 * Uses the midpoint strategy. If prev and next are too close (gap < 10),
 * the caller should trigger a full reindex of the column.
 */
export function computeOrderIndex(
  prev: number | null,
  next: number | null
): number {
  if (prev === null && next === null) return 1000
  if (prev === null) return next! / 2
  if (next === null) return prev + 1000
  return Math.round((prev + next) / 2)
}

export function shouldReindex(
  prev: number | null,
  next: number | null
): boolean {
  if (prev === null || next === null) return false
  return Math.abs(next - prev) < 10
}
