import type { EstimateStatus } from '@/types/database'

export const ESTIMATE_STATUS_OPTIONS: { value: EstimateStatus; label: string }[] = [
  { value: 'estimate', label: 'Estimate' },
  { value: 'order', label: 'Order' },
]

/** Map API/DB values to the current model (legacy rows before migration). */
export function normalizeEstimateStatus(raw: string): EstimateStatus {
  if (raw === 'estimate' || raw === 'order') return raw
  if (raw === 'in_production' || raw === 'ready') return 'order'
  return 'estimate'
}

export function estimateStatusLabel(status: EstimateStatus): string {
  return ESTIMATE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}
