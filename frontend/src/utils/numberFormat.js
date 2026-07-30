/**
 * Utility function to format count metrics (views, likes, shares, comments, saved)
 * according to Vietnamese shorthand formatting standards:
 * - 1.000 => 1 N
 * - 1.100 => 1,1 N
 * - 10.000 => 10 N
 * - 100.000 => 100 N
 * - 1.000.000 => 1 Tr
 * - 10.000.000 => 10 Tr
 * - 100.000.000 => 100 Tr
 * - 1.000.000.000 => 1 T
 *
 * Safety: values above 10 billion are treated as corrupt data and capped at 0.
 */
export function formatCount(num) {
  if (num === null || num === undefined || isNaN(num)) return '0'
  let n = Number(num)

  // Guard: corrupt/impossibly large values → treat as 0
  if (!isFinite(n) || n < 0 || n > 10_000_000_000) return '0'

  if (n >= 1_000_000_000) {
    // Billions (T)
    const val = Math.floor(n / 100_000_000) / 10
    const strVal = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace('.', ',')
    return `${strVal} T`
  }

  if (n >= 1_000_000) {
    // Millions (Tr)
    const val = Math.floor(n / 100_000) / 10
    const strVal = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace('.', ',')
    return `${strVal}Tr`
  }

  if (n >= 1_000) {
    // Thousands (N)
    const val = Math.floor(n / 100) / 10
    const strVal = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace('.', ',')
    return `${strVal}N`
  }

  return n.toLocaleString('vi-VN')
}

export function formatViews(num) {
  return formatCount(num)
}

export default formatCount
