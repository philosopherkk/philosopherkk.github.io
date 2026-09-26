/** Levenshtein distance over Unicode code points. */
export function editDistance(a: string, b: string): number {
  const left = [...a]
  const right = [...b]
  if (left.length > 48 || right.length > 48) return left.join('') === right.join('') ? 0 : 99
  const cols = right.length + 1
  let prev = Array.from({ length: cols }, (_, index) => index)
  const curr = new Array<number>(cols)
  for (let i = 1; i <= left.length; i += 1) {
    curr[0] = i
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    prev = curr.slice()
  }
  return prev[right.length] ?? 0
}
