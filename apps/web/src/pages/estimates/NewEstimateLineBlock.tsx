import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchOptionGroupsWithOptions,
  type GroupWithOptions,
} from '@/features/products/productQueries'
import type { Product } from '@/types/database'

export type NewEstimateLineModel = {
  rowId: string
  productId: string
  groups: GroupWithOptions[]
  selection: Record<string, string>
  quantity: string
  unitPrice: string
}

type Patch = Partial<Omit<NewEstimateLineModel, 'rowId'>>

export function NewEstimateLineBlock({
  lineIndex,
  products,
  line,
  onPatch,
  onRemove,
  canRemove,
}: {
  lineIndex: number
  products: Product[]
  line: NewEstimateLineModel
  onPatch: (patch: Patch) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const selectedProduct = products.find((p) => p.id === line.productId) ?? null
  const lastLoadedProductId = useRef<string>('')

  useEffect(() => {
    if (!line.productId) {
      lastLoadedProductId.current = ''
      if (line.groups.length > 0 || Object.keys(line.selection).length > 0) {
        onPatch({ groups: [], selection: {} })
      }
      return
    }

    const productChanged = lastLoadedProductId.current !== line.productId
    if (productChanged) {
      lastLoadedProductId.current = line.productId
    }

    let cancelled = false
    void (async () => {
      const { data: g } = await fetchOptionGroupsWithOptions(line.productId)
      if (cancelled) return
      if (lastLoadedProductId.current !== line.productId) return
      const list = g ?? []
      const nextSel: Record<string, string> = {}
      for (const gr of list) {
        const opts = gr.product_options ?? []
        if (opts.length === 1) nextSel[gr.id] = opts[0]!.id
      }
      const p = products.find((x) => x.id === line.productId)
      const unitPrice =
        productChanged && p?.pricing_type === 'fixed' && p.base_price != null
          ? String(p.base_price)
          : line.unitPrice
      onPatch({
        groups: list,
        selection: nextSel,
        unitPrice,
      })
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when catalog product changes
  }, [line.productId])

  return (
    <li className="rounded-lg border border-stone-200 bg-stone-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-stone-500">Product line {lineIndex + 1}</p>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-red-700 hover:underline"
          >
            Remove line
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <label className="block min-w-[12rem] flex-1">
          <span className="text-sm font-medium text-stone-700">Product *</span>
          <select
            required
            value={line.productId}
            onChange={(e) =>
              onPatch({
                productId: e.target.value,
                groups: [],
                selection: {},
                unitPrice: '',
              })
            }
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
          >
            <option value="">Select…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.pricing_type === 'quote_only' ? ' (quote-only)' : ''}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-stone-600">
          <Link to="/products/new" className="font-medium text-cherry-700 hover:underline">
            New product
          </Link>
          <span className="text-stone-500"> · reload if you just added one</span>
        </p>
      </div>

      {line.groups.length > 0 ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Variables</p>
          {line.groups.map((g) => {
            const opts = g.product_options ?? []
            if (opts.length === 0) return null
            return (
              <label key={g.id} className="block">
                <span className="text-sm font-medium text-stone-700">{g.label}</span>
                <select
                  value={line.selection[g.id] ?? ''}
                  onChange={(e) =>
                    onPatch({
                      selection: { ...line.selection, [g.id]: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                >
                  <option value="">Select…</option>
                  {opts.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )
          })}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Quantity *</span>
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={line.quantity}
            onChange={(e) => onPatch({ quantity: e.target.value })}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Unit price (USD) *</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={line.unitPrice}
            onChange={(e) => onPatch({ unitPrice: e.target.value })}
            placeholder={selectedProduct?.pricing_type === 'quote_only' ? 'Quote amount' : ''}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
          />
        </label>
      </div>
    </li>
  )
}
