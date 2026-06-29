'use client'

import { useCallback, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import FilterBar from '@/components/FilterBar'
import SearchInput from '@/components/SearchInput'
import ItemGrid from '@/components/ItemGrid'
import Pagination from '@/components/Pagination'
import type { BrowseFilters, ItemWithCover } from '@/types'

interface BrowseClientProps {
  items: ItemWithCover[]
  filters: BrowseFilters
  totalCount: number
  totalPages: number
}

export default function BrowseClient({
  items,
  filters,
  totalCount,
  totalPages,
}: BrowseClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const pushFilters = useCallback(
    (updates: Partial<BrowseFilters>) => {
      const next = new URLSearchParams(searchParams.toString())
      const merged = { ...filters, ...updates }

      if (merged.query) next.set('q', merged.query)
      else next.delete('q')

      if (merged.category) next.set('category', merged.category)
      else next.delete('category')

      if (merged.condition) next.set('condition', merged.condition)
      else next.delete('condition')

      if (merged.min_price) next.set('price_min', String(merged.min_price))
      else next.delete('price_min')

      if (merged.max_price) next.set('price_max', String(merged.max_price))
      else next.delete('price_max')

      if (merged.trade_only) next.set('trade_only', '1')
      else next.delete('trade_only')

      if (merged.page && merged.page > 1) next.set('page', String(merged.page))
      else next.delete('page')

      startTransition(() => {
        router.push(`/browse?${next.toString()}`, { scroll: false })
      })
    },
    [filters, router, searchParams]
  )

  const handleReset = useCallback(() => {
    startTransition(() => {
      router.push('/browse', { scroll: false })
    })
  }, [router])

  return (
    <div className="space-y-6">
      <SearchInput
        value={filters.query ?? ''}
        onChange={(query) => pushFilters({ query, page: 1 })}
      />

      <FilterBar
        filters={filters}
        onChange={pushFilters}
        onReset={handleReset}
        resultCount={totalCount}
      />

      <div className={isPending ? 'opacity-60 pointer-events-none transition-opacity' : ''}>
        <ItemGrid
          items={items}
          loading={false}
          emptyMessage="Aucun objet ne correspond à tes critères."
        />
      </div>

      <Pagination
        page={filters.page ?? 1}
        totalPages={totalPages}
        onChange={(page) => pushFilters({ page })}
      />
    </div>
  )
}
