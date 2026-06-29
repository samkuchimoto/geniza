import Link from 'next/link'
import Image from 'next/image'
import ConditionBadge from './ConditionBadge'
import { CATEGORY_LABELS, type ItemWithCover } from '@/types'

interface ItemCardProps {
  item: ItemWithCover
}

function formatPrice(price: number | null, listingType: string): string {
  if (!price || listingType === 'trade') return 'Échange'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price)
}

function ListingTypePill({ type }: { type: string }) {
  if (type === 'trade') {
    return (
      <span className="absolute top-2.5 left-2.5 bg-or text-parchemin text-[10px] font-medium font-mono-custom px-1.5 py-0.5 uppercase tracking-wider">
        Échange
      </span>
    )
  }
  if (type === 'both') {
    return (
      <span className="absolute top-2.5 left-2.5 bg-encre text-parchemin text-[10px] font-medium font-mono-custom px-1.5 py-0.5 uppercase tracking-wider">
        Vente + Échange
      </span>
    )
  }
  return null
}

export default function ItemCard({ item }: ItemCardProps) {
  return (
    <Link href={`/item/${item.id}`} className="group block">
      <article className="card overflow-hidden">
        {/* Image */}
        <div className="relative aspect-[4/5] bg-surface-raised overflow-hidden">
          {item.cover_image ? (
            <Image
              src={item.cover_image}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sable text-body-sm">Aucune photo</span>
            </div>
          )}
          <ListingTypePill type={item.listing_type} />
        </div>

        {/* Info */}
        <div className="p-3.5">
          {/* Category eyebrow */}
          <p className="eyebrow text-[10px] mb-1.5">
            {CATEGORY_LABELS[item.category]}
          </p>

          {/* Title */}
          <h3 className="font-display text-display-sm font-medium text-encre line-clamp-2 mb-2 leading-snug">
            {item.title}
          </h3>

          {/* Condition + Price row */}
          <div className="flex items-center justify-between gap-2 mt-auto">
            <ConditionBadge condition={item.condition} size="sm" />
            <span className="price text-[13px]">
              {formatPrice(item.price_eur, item.listing_type)}
            </span>
          </div>

          {/* Seller + Location */}
          <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-ivoire">
            <div className="w-4 h-4 rounded-full bg-ivoire flex items-center justify-center overflow-hidden flex-shrink-0">
              {item.seller.avatar_url ? (
                <Image
                  src={item.seller.avatar_url}
                  alt={item.seller.username}
                  width={16}
                  height={16}
                  className="object-cover"
                />
              ) : (
                <span className="text-[8px] text-sable font-medium">
                  {item.seller.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-[11px] text-sable truncate font-mono-custom">
              {item.seller.username}
            </span>
            {item.seller.city && (
              <>
                <span className="text-ivoire text-[10px]">·</span>
                <span className="text-[11px] text-sable truncate font-mono-custom">
                  {item.seller.city}
                </span>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
