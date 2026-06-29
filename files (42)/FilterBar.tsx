'use client'

import { CATEGORY_LABELS, CONDITION_LABELS, type BrowseFilters, type ItemCategory, type ItemCondition } from '@/types'

interface FilterBarProps {
  filters: BrowseFilters
  onChange: (filters: Partial<BrowseFilters>) => void
  onReset: () => void
  resultCount?: number
}

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [ItemCategory, string][]
const CONDITIONS = Object.entries(CONDITION_LABELS) as [ItemCondition, string][]

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="label text-[9px]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input text-body-sm py-2 pr-7 appearance-none bg-no-repeat cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238C7B6B' stroke-width='1.2' stroke-linecap='square'/%3E%3C/svg%3E")`,
          backgroundPosition: 'right 12px center',
          backgroundSize: '10px',
        }}
      >
        {children}
      </select>
    </div>
  )
}

export default function FilterBar({
  filters,
  onChange,
  onReset,
  resultCount,
}: FilterBarProps) {
  const hasActiveFilters =
    filters.category !== '' ||
    filters.condition !== '' ||
    filters.price_min !== '' ||
    filters.price_max !== '' ||
    filters.trade_only

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Category */}
        <div className="w-40">
          <Select
            label="Catégorie"
            value={filters.category}
            onChange={(v) => onChange({ category: v as ItemCategory | '', page: 1 })}
          >
            <option value="">Toutes</option>
            {CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </div>

        {/* Condition */}
        <div className="w-40">
          <Select
            label="État"
            value={filters.condition}
            onChange={(v) => onChange({ condition: v as ItemCondition | '', page: 1 })}
          >
            <option value="">Tous états</option>
            {CONDITIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </div>

        {/* Price range */}
        <div className="flex flex-col gap-1">
          <label className="label text-[9px]">Prix (€)</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={filters.price_min}
              onChange={(e) => onChange({ price_min: e.target.value, page: 1 })}
              className="input w-20 text-body-sm py-2 font-mono-custom"
            />
            <span className="text-sable text-body-sm">–</span>
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={filters.price_max}
              onChange={(e) => onChange({ price_max: e.target.value, page: 1 })}
              className="input w-20 text-body-sm py-2 font-mono-custom"
            />
          </div>
        </div>

        {/* Trade only toggle */}
        <div className="flex flex-col gap-1">
          <label className="label text-[9px]">Échange</label>
          <button
            type="button"
            onClick={() => onChange({ trade_only: !filters.trade_only, page: 1 })}
            className={`
              h-[38px] px-3.5 text-body-sm font-medium border transition-colors duration-150
              ${filters.trade_only
                ? 'bg-or text-parchemin border-or'
                : 'bg-transparent text-sable border-ivoire hover:border-sable'
              }
            `}
          >
            Échange uniquement
          </button>
        </div>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="self-end h-[38px] text-body-sm text-sable underline underline-offset-2 hover:text-encre transition-colors"
          >
            Effacer
          </button>
        )}
      </div>

      {/* Result count */}
      {resultCount !== undefined && (
        <p className="eyebrow text-[11px]">
          {resultCount} {resultCount === 1 ? 'objet' : 'objets'}
        </p>
      )}

      {/* Divider */}
      <div className="divider" />
    </div>
  )
}
