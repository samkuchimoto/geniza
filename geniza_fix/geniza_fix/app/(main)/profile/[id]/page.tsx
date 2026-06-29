import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ItemGrid from '@/components/ItemGrid'
import CollectorScore from '@/components/CollectorScore'
import type { ItemWithCover, Profile } from '@/types'

interface PageProps {
  params: { id: string }
}

async function getProfile(id: string): Promise<Profile | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as Profile
}

async function getProfileItems(sellerId: string): Promise<ItemWithCover[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('items')
    .select(`
      *,
      seller:profiles!seller_id(id, username, collector_score, city, avatar_url),
      cover_image:item_images(url)
    `)
    .eq('seller_id', sellerId)
    .in('status', ['available', 'in_trade'])
    .eq('item_images.is_cover', true)
    .order('created_at', { ascending: false })

  if (!data) return []
  return data.map((item: Record<string, unknown>) => ({
    ...item,
    cover_image:
      Array.isArray(item.cover_image) && item.cover_image.length > 0
        ? (item.cover_image[0] as { url: string }).url
        : null,
  })) as ItemWithCover[]
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Handle /profile/me redirect in generateMetadata too
  if (params.id === 'me') return { title: 'Ma collection' }

  const profile = await getProfile(params.id)
  if (!profile) return { title: 'Collectionneur introuvable' }

  return {
    title: `${profile.display_name ?? profile.username} — Collection`,
    description: `Collection de ${profile.display_name ?? profile.username} sur GENIZA. ${profile.completed_trades} échanges, ${profile.completed_sales} ventes.`,
  }
}

export default async function ProfilePage({ params }: PageProps) {
  // /profile/me → redirect to real profile
  if (params.id === 'me') {
    const currentUserId = await getCurrentUserId()
    if (!currentUserId) redirect('/login?next=/profile/me')
    redirect(`/profile/${currentUserId}`)
  }

  const [profile, items, currentUserId] = await Promise.all([
    getProfile(params.id),
    getProfileItems(params.id),
    getCurrentUserId(),
  ])

  if (!profile) notFound()

  const isOwnProfile = currentUserId === profile.id
  const availableItems = items.filter((i) => i.status === 'available')
  const inTradeItems = items.filter((i) => i.status === 'in_trade')

  return (
    <div className="container-page py-8 sm:py-12">

      {/* Profile header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-6 pb-8 border-b border-ivoire mb-8">

        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-surface-raised border border-ivoire flex items-center justify-center overflow-hidden flex-shrink-0">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              width={80}
              height={80}
              className="object-cover"
            />
          ) : (
            <span className="font-display text-display-md font-medium text-encre">
              {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-display-md font-medium text-encre leading-tight">
            {profile.display_name ?? profile.username}
          </h1>
          <p className="font-mono-custom text-[12px] text-sable mb-2">
            @{profile.username}
            {profile.city && (
              <span> · {profile.city}</span>
            )}
          </p>
          <CollectorScore score={profile.collector_score} showLabel />
          {profile.bio && (
            <p className="text-body-sm text-sable mt-3 max-w-md leading-relaxed">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-8 sm:gap-10 flex-shrink-0">
          {[
            { value: availableItems.length, label: 'Objets' },
            { value: profile.completed_trades, label: 'Échanges' },
            { value: profile.completed_sales, label: 'Ventes' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center sm:text-right">
              <p className="font-mono-custom font-medium text-display-sm text-encre">
                {value}
              </p>
              <p className="eyebrow text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Own profile actions */}
      {isOwnProfile && (
        <div className="flex gap-3 mb-8">
          <Link href="/list" className="btn-trade text-body-sm px-5 py-2.5">
            + Lister un objet
          </Link>
          <Link href="/dashboard" className="btn-secondary text-body-sm px-5 py-2.5">
            Mon espace
          </Link>
        </div>
      )}

      {/* Available items */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display text-display-sm font-medium text-encre">
            Collection disponible
          </h2>
          {availableItems.length > 0 && (
            <span className="eyebrow text-[11px]">{availableItems.length} objet{availableItems.length > 1 ? 's' : ''}</span>
          )}
        </div>

        <ItemGrid
          items={availableItems}
          emptyMessage={
            isOwnProfile
              ? 'Tu n\'as aucun objet disponible.'
              : 'Ce collectionneur n\'a aucun objet disponible.'
          }
        />
      </section>

      {/* In-trade items (subtle section) */}
      {inTradeItems.length > 0 && (
        <section className="mt-10 pt-8 border-t border-ivoire">
          <div className="flex items-baseline gap-3 mb-5">
            <h2 className="font-display text-display-sm font-medium text-sable">
              En cours d'échange
            </h2>
            <span className="eyebrow text-[11px]">{inTradeItems.length}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 opacity-50 pointer-events-none">
            {inTradeItems.map((item) => (
              <div key={item.id} className="relative">
                <div className="aspect-[4/5] bg-surface-raised border border-ivoire overflow-hidden">
                  {item.cover_image && (
                    <Image
                      src={item.cover_image}
                      alt={item.title}
                      fill
                      className="object-cover grayscale"
                    />
                  )}
                </div>
                <p className="text-[11px] text-sable font-mono-custom mt-1.5 truncate px-0.5">
                  {item.title}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-sable font-mono-custom mt-3">
            Ces objets sont réservés dans le cadre d'un échange en cours.
          </p>
        </section>
      )}

      {/* Member since */}
      <p className="mt-10 text-[11px] text-sable font-mono-custom">
        Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        {profile.verified && (
          <span className="ml-3 text-vert">· Vérifié</span>
        )}
      </p>
    </div>
  )
}
