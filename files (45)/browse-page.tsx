import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import BrowseClient from './BrowseClient'
import type { BrowseFilters, ItemCategory, ItemCondition, ItemWithCover } from '@/types'

export const metadata: Metadata = {
  title: 'Catalogue',
  description:
    'Parcours les objets disponibles — art, antiquités, bandes dessinées, cartes. Échange ou achète.',
}

const PAGE_SIZE = 24

interface PageProps {
  searchParams: {
    q?: string
    category?: string
    condition?: string
    price_min?: string
    price_max?: string
    trade_only?: string
    page?: string
  }
}

async function fetchItems(filters: BrowseFilters): Promise<{
  items: ItemWithCover[]
  totalCount: number
}> {
  const supabase = createClient()

  const offset = (filters.page - 1) * PAGE_SIZE

  // Build base query
  let query = supabase
    .from('items')
    .select(
      `
      *,
      seller:profiles!seller_id(id, username, collector_score, city, avatar_url),
      cover_image:item_images!inner(url)
    `,
      { count: 'exact' }
    )
    .eq('status', 'available')
    .eq('item_images.is_cover', true)

  // Filters
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.condition) query = query.eq('condition', filters.condition)
  if (filters.price_min) query = query.gte('price_eur', parseFloat(filters.price_min))
  if (filters.price_max) query = query.lte('price_eur', parseFloat(filters.price_max))
  if (filters.trade_only) query = query.in('listing_type', ['trade', 'both'])
  if (filters.search) {
    query = query.textSearch('search_vector', filters.search, {
      type: 'websearch',
      config: 'french',
    })
  }

  // Order + pagination
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const { data, count, error } = await query

  if (error || !data) return { items: [], totalCount: 0 }

  const items = data.map((item: Record<string, unknown>) => ({
    ...item,
    cover_image:
      Array.isArray(item.cover_image) && item.cover_image.length > 0
        ? (item.cover_image[0] as { url: string }).url
        : null,
  })) as ItemWithCover[]

  return { items, totalCount: count ?? 0 }
}

export default async function BrowsePage({ searchParams }: PageProps) {
  const filters: BrowseFilters = {
    search: searchParams.q ?? '',
    category: (searchParams.category as ItemCategory) || '',
    condition: (searchParams.condition as ItemCondition) || '',
    price_min: searchParams.price_min ?? '',
    price_max: searchParams.price_max ?? '',
    trade_only: searchParams.trade_only === '1',
    page: Math.max(1, parseInt(searchParams.page ?? '1', 10)),
  }

  const { items, totalCount } = await fetchItems(filters)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="container-page py-8 sm:py-12">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-display-lg font-light text-encre">
          Catalogue
        </h1>
        {filters.search && (
          <p className="text-body-sm text-sable mt-1">
            Résultats pour{' '}
            <span className="text-encre font-medium">"{filters.search}"</span>
          </p>
        )}
      </div>

      <BrowseClient
        items={items}
        filters={filters}
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </div>
  )
}
