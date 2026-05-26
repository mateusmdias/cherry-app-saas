import type { GroupWithOptions } from '@/features/products/productQueries'

export function buildLineDescription(
  productName: string,
  groups: GroupWithOptions[],
  selectedByGroup: Record<string, string>,
): string {
  const parts: string[] = [productName]
  for (const g of groups) {
    const opts = g.product_options ?? []
    if (opts.length === 0) continue
    const oid = selectedByGroup[g.id]
    if (!oid) continue
    const opt = opts.find((o) => o.id === oid)
    if (opt) parts.push(`${g.label}: ${opt.label}`)
  }
  return parts.join(' · ')
}

export function selectedOptionIdsArray(
  groups: GroupWithOptions[],
  selectedByGroup: Record<string, string>,
): string[] {
  const ids: string[] = []
  for (const g of groups) {
    const opts = g.product_options ?? []
    if (opts.length === 0) continue
    const oid = selectedByGroup[g.id]
    if (oid) ids.push(oid)
  }
  return ids
}
