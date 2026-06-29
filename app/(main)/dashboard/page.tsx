import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'
import CollectorScore from '@/components/CollectorScore'
import type { Item, Profile, TradeProposalDetail, Transaction } from '@/types'

export const metadata: Metadata = {
  title: 'Mon espace',
  robots: { index: false, follow: false },
}

async function getDashboardData(userId: string) {
  const supabase = createClient()

  const [listingsRes, tradesRes, transactionsRes, profileRes] = await Promise.all([
    // My listings
    supabase
      .from('items')
      .select('*')
      .eq('seller_id', userId)
      .in('status', ['available', 'in_trade', 'sold'])
      .order('created_at', { ascending: false }),

    // My trades (as proposer or receiver)
    supabase
      .from('trade_proposals')
      .select(`
        *,
        proposer:profiles!proposer_id(id, username, avatar_url, collector_score),
        receiver:profiles!receiver_id(id, username, avatar_url, collector_score),
        proposer_item:items!proposer_item_id(
          *,
          cover_image:item_images(url)
        ),
        receiver_item:items!receiver_item_id(
          *,
          cover_image:item_images(url)
        )
      `)
      .or(`proposer_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50),

    // My transactions (as buyer or seller)
    supabase
      .from('transactions')
      .select('*')
      .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50),

    // Profile
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single(),
  ])

  // Normalize cover images in trade items
  const trades = (tradesRes.data ?? []).map((trade: Record<string, unknown>) => {
    function normItem(item: Record<string, unknown> | null) {
      if (!item) return item
      return {
        ...item,
        cover_image:
          Array.isArray(item.cover_image) && item.cover_image.length > 0
            ? (item.cover_image[0] as { url: string }).url
            : null,
      }
    }
    return {
      ...trade,
      proposer_item: normItem(trade.proposer_item as Record<string, unknown>),
      receiver_item: normItem(trade.receiver_item as Record<string, unknown>),
    }
  }) as TradeProposalDetail[]

  return {
    listings: (listingsRes.data ?? []) as Item[],
    trades,
    transactions: (transactionsRes.data ?? []) as Transaction[],
    profile: profileRes.data as Profile | null,
  }
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/dashboard')

  const { listings, trades, transactions, profile } = await getDashboardData(user.id)

  return (
    <div className="container-page py-8 sm:py-12">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="eyebrow mb-1.5">Tableau de bord</p>
          <h1 className="font-display text-display-lg font-light text-encre">
            Mon espace
          </h1>
        </div>

        {profile && (
          <Link
            href={`/profile/${user.id}`}
            className="flex items-center gap-3 group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-body-sm font-medium text-encre group-hover:text-or transition-colors">
                {profile.display_name ?? profile.username}
              </p>
              <CollectorScore score={profile.collector_score} size="sm" />
            </div>
            <div className="w-9 h-9 rounded-full bg-surface-raised border border-ivoire flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-sable transition-colors">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.username}
                  width={36}
                  height={36}
                  className="object-cover"
                />
              ) : (
                <span className="font-medium text-encre text-body-sm">
                  {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </Link>
        )}
      </div>

      <DashboardClient
        listings={listings}
        trades={trades}
        transactions={transactions}
        userId={user.id}
      />
    </div>
  )
}
