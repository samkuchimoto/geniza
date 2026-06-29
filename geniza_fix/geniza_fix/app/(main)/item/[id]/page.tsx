import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import ImageGallery from './ImageGallery'
import ItemActions from './ItemActions'
import ConditionBadge from '@/components/ConditionBadge'
import CollectorScore from '@/components/CollectorScore'
import {
  CATEGORY_LABELS,
  LISTING_TYPE_LABELS,
  type ItemDetail,
} from '@/types'

interface PageProps {
  params: { id: string }
  searchParams: { sale?: string }
}

// ── Data fetching ──────────────────────────────────────────
async function getItem(id: string): Promise<ItemDetail | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('items')
    .select(`
      *,
      seller:profiles!seller_id(*),
      images:item_images(*)
    `)
    .eq('id', id)
    .eq('status', 'available')
    .single()

  if (error || !data) return null

  // Sort images: cover first, then by sort_order
  const sorted = [...(data.images ?? [])].sort((a, b) => {
    if (a.is_cover) return -1
    if (b.is_cover) return 1
    return a.sort_order - b.sort_order
  })

  return { ...data, images: sorted } as ItemDetail
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ── Metadata ───────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const item = await getItem(params.id)
  if (!item) return { title: 'Objet introuvable' }

  const coverImage = item.images.find((img) => img.is_cover)

  return {
    title: item.title,
    description: item.description ?? `${item.title} — ${CATEGORY_LABELS[item.category]} en ${item.condition} état.`,
    openGraph: {
      title: item.title,
      description: item.description ?? undefined,
      images: coverImage ? [{ url: coverImage.url, width: 1200, height: 1200 }] : [],
    },
  }
}

// ── Page ───────────────────────────────────────────────────
export default async function ItemDetailPage({ params, searchParams }: PageProps) {
  const [item, currentUserId] = await Promise.all([
    getItem(params.id),
    getCurrentUserId(),
  ])

  if (!item) notFound()

  const isOwner = currentUserId === item.seller_id
  const formattedPrice =
    item.price_eur
      ? new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }).format(item.price_eur)
      : null

  return (
    <div className="container-page py-8 sm:py-12">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-6 text-[11px] font-mono-custom text-sable">
        <Link href="/browse" className="hover:text-encre transition-colors">
          Catalogue
        </Link>
        <span>›</span>
        <span>{CATEGORY_LABELS[item.category]}</span>
        <span>›</span>
        <span className="text-encre truncate max-w-[200px]">{item.title}</span>
      </nav>

      {/* Sale success banner */}
      {searchParams.sale === 'success' && (
        <div className="mb-6 p-4 border border-vert bg-vert/5 flex items-center gap-3">
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path d="M1 6L5.5 10.5L15 1" stroke="#3B6B4A" strokeWidth="1.5" strokeLinecap="square" />
          </svg>
          <p className="text-body-sm text-vert font-medium">
            Paiement confirmé. Le vendeur a été notifié.
          </p>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">

        {/* Left: Gallery */}
        <div>
          <ImageGallery images={item.images} title={item.title} />
        </div>

        {/* Right: Info + Actions */}
        <div className="space-y-6">

          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="eyebrow">{CATEGORY_LABELS[item.category]}</span>
              <ConditionBadge condition={item.condition} />
            </div>

            <h1 className="font-display text-display-lg font-medium text-encre leading-tight mb-4">
              {item.title}
            </h1>

            {/* Price / Trade label */}
            <div className="flex items-baseline gap-3">
              {formattedPrice && item.listing_type !== 'trade' && (
                <span className="font-mono-custom text-[1.5rem] font-medium text-encre">
                  {formattedPrice}
                </span>
              )}
              <span className="eyebrow text-[11px]">
                {LISTING_TYPE_LABELS[item.listing_type]}
              </span>
            </div>
          </div>

          <div className="divider" />

          {/* CTAs */}
          <ItemActions
            itemId={item.id}
            itemTitle={item.title}
            sellerUserId={item.seller_id}
            listingType={item.listing_type}
            priceEur={item.price_eur}
            currentUserId={currentUserId}
            isOwner={isOwner}
          />

          <div className="divider" />

          {/* Seller block */}
          <Link
            href={`/profile/${item.seller.id}`}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-full bg-surface-raised border border-ivoire flex items-center justify-center overflow-hidden flex-shrink-0">
              {item.seller.avatar_url ? (
                <Image
                  src={item.seller.avatar_url}
                  alt={item.seller.username}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <span className="font-medium text-encre text-body-sm">
                  {item.seller.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-encre group-hover:text-or transition-colors truncate">
                {item.seller.display_name ?? item.seller.username}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <CollectorScore score={item.seller.collector_score} size="sm" />
                {item.seller.city && (
                  <>
                    <span className="text-ivoire text-[10px]">·</span>
                    <span className="text-[11px] text-sable font-mono-custom">
                      {item.seller.city}
                    </span>
                  </>
                )}
              </div>
            </div>
            <svg width="7" height="11" viewBox="0 0 7 11" fill="none" className="text-sable flex-shrink-0">
              <path d="M1 1L5.5 5.5L1 10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Bottom section: Description + Provenance */}
      <div className="mt-10 pt-10 border-t border-ivoire grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">

        {/* Description */}
        <div>
          <h2 className="font-display text-display-sm font-medium text-encre mb-4">
            Description
          </h2>
          {item.description ? (
            <p className="text-body-md text-encre leading-relaxed whitespace-pre-wrap">
              {item.description}
            </p>
          ) : (
            <p className="text-body-md text-sable italic">Aucune description fournie.</p>
          )}
        </div>

        {/* Provenance */}
        {item.provenance && (
          <div>
            <h2 className="font-display text-display-sm font-medium text-encre mb-4">
              Provenance
            </h2>
            <div className="border-l-2 border-or pl-4">
              <p className="text-body-md text-encre leading-relaxed italic">
                {item.provenance}
              </p>
              <p className="text-[11px] text-sable font-mono-custom mt-3">
                Provenance déclarée par le vendeur.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Item metadata */}
      <div className="mt-10 pt-8 border-t border-ivoire">
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          {[
            { label: 'Référence', value: item.id.slice(0, 8).toUpperCase() },
            { label: 'Mis en ligne', value: new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
            { label: 'Vues', value: String(item.views) },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="eyebrow text-[10px] mb-0.5">{label}</dt>
              <dd className="font-mono-custom text-body-sm text-encre">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
