import ItemCard from './ItemCard'
import ItemCardSkeleton from './ItemCardSkeleton'
import type { ItemWithCover } from '@/types'

interface ItemGridProps {
  items?: ItemWithCover[]
  loading?: boolean
  emptyMessage?: string
  skeletonCount?: number
}

export default function ItemGrid({
  items,
  loading = false,
  emptyMessage = 'Aucun objet trouvé.',
  skeletonCount = 12,
}: ItemGridProps) {
  const gridClass =
    'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4'

  if (loading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-display text-display-sm text-sable mb-2">
          {emptyMessage}
        </p>
        <p className="text-body-sm text-sable">
          Modifie tes filtres ou reviens plus tard.
        </p>
      </div>
    )
  }

  return (
    <div className={gridClass}>
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
