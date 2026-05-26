/** One line for index / customer lists (guests + occasion). */
export function estimateListContextLine(row: {
  guest_count?: number | null
  party_occasion?: string | null
}): string | null {
  const bits: string[] = []
  if (row.guest_count != null && Number.isFinite(Number(row.guest_count))) {
    bits.push(`${Math.trunc(Number(row.guest_count))} guests`)
  }
  const o = row.party_occasion?.trim()
  if (o) bits.push(o)
  return bits.length ? bits.join(' · ') : null
}
