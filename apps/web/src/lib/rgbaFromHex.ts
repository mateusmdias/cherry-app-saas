/** Build `rgba(r,g,b,a)` from `#rgb` / `#rrggbb` for borders and overlays. */
export function rgbaFromHex(hex: string, alpha: number): string {
  const raw = hex.trim()
  const long = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(raw)
  if (long) {
    return `rgba(${parseInt(long[1], 16)}, ${parseInt(long[2], 16)}, ${parseInt(long[3], 16)}, ${alpha})`
  }
  const short = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(raw)
  if (short) {
    const r = parseInt(short[1] + short[1], 16)
    const g = parseInt(short[2] + short[2], 16)
    const b = parseInt(short[3] + short[3], 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return `rgba(120, 113, 108, ${alpha})`
}
