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

const PAGE_SIZE = 24

export default function BrowseClient({
  items,
  filters,
  totalCount,
  totalPages,
}: BrowseClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Push filter changes to URL — triggers server re-fetch via searchParams
  const pushFilters = useCallback(
    (updates: Partial<BrowseFilters>) => {
      const next = new URLSearchParams(searchParams.toString())
      const merged = { ...filters, ...updates }

      if (merged.search) next.set('q', merged.search)
      else next.delete('q')

      if (merged.category) next.set('category', merged.category)
      else next.delete('category')

      if (merged.condition) next.set('condition', merged.condition)
      else next.delete('condition')

      if (merged.price_min) next.set('price_min', merged.price_min)
      else next.delete('price_min')

      if (merged.price_max) next.set('price_max', merged.price_max)
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
      {/* Search */}
      <SearchInput
        value={filters.search}
        onChange={(search) => pushFilters({ search, page: 1 })}
      />

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={pushFilters}
        onReset={handleReset}
        resultCount={totalCount}
      />

      {/* Grid — opacity hint during navigation */}
      <div className={isPending ? 'opacity-60 pointer-events-none transition-opacity' : ''}>
        <ItemGrid
          items={items}
          loading={false}
          emptyMessage="Aucun objet ne correspond à tes critères."
        />
      </div>

      {/* Pagination */}
      <Pagination
        page={filters.page}
        totalPages={totalPages}
        onChange={(page) => pushFilters({ page })}
      />
    </div>
  )
}
