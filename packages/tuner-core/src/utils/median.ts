/** Median of a non-empty list (copies and sorts). */
export function median(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error('median requires at least one value')
  }
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) {
    return sorted[mid] ?? 0
  }
  const a = sorted[mid - 1] ?? 0
  const b = sorted[mid] ?? 0
  return (a + b) / 2
}
