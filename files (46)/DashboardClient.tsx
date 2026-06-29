'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { showToast } from '@/components/Toast'
import ConditionBadge from '@/components/ConditionBadge'
import type { Item, TradeProposalDetail, Transaction } from '@/types'

type Tab = 'listings' | 'trades' | 'transactions'

interface DashboardClientProps {
  listings: Item[]
  trades: TradeProposalDetail[]
  transactions: Transaction[]
  userId: string
}

// ── Listing row ─────────────────────────────────────────────
function ListingRow({ item, onArchive }: { item: Item; onArchive: (id: string) => void }) {
  const statusLabel: Record<string, string> = {
    available: 'Disponible',
    in_trade: 'En échange',
    sold: 'Vendu',
    draft: 'Brouillon',
    archived: 'Archivé',
  }

  const statusColor: Record<string, string> = {
    available: 'text-vert',
    in_trade: 'text-ambre',
    sold: 'text-sable',
    draft: 'text-sable',
    archived: 'text-sable',
  }

  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-ivoire last:border-0">
      <Link href={`/item/${item.id}`} className="flex items-center gap-3 flex-1 min-w-0 group">
        <div className="w-12 h-12 bg-surface-raised border border-ivoire flex-shrink-0 overflow-hidden">
        </div>
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-encre group-hover:text-or transition-colors truncate">
            {item.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <ConditionBadge condition={item.condition} size="sm" />
            {item.price_eur && (
              <span className="font-mono-custom text-[11px] text-sable">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(item.price_eur)}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-4 flex-shrink-0">
        <span className={`font-mono-custom text-[11px] ${statusColor[item.status]}`}>
          {statusLabel[item.status] ?? item.status}
        </span>
        {item.status === 'available' && (
          <button
            onClick={() => onArchive(item.id)}
            className="text-[11px] text-sable hover:text-rouge transition-colors font-mono-custom"
          >
            Archiver
          </button>
        )}
      </div>
    </div>
  )
}

// ── Trade row ───────────────────────────────────────────────
function TradeRow({
  trade,
  userId,
  onRespond,
}: {
  trade: TradeProposalDetail
  userId: string
  onRespond: (id: string, action: 'accept' | 'decline') => void
}) {
  const isProposer = trade.proposer_id === userId
  const counterpart = isProposer ? trade.receiver : trade.proposer
  const myItem = isProposer ? trade.proposer_item : trade.receiver_item
  const theirItem = isProposer ? trade.receiver_item : trade.proposer_item

  const statusLabel: Record<string, string> = {
    pending: 'En attente',
    accepted: 'Accepté',
    declined: 'Refusé',
    expired: 'Expiré',
    completed: 'Terminé',
    disputed: 'Litige',
  }

  const statusColor: Record<string, string> = {
    pending: 'text-ambre',
    accepted: 'text-vert',
    declined: 'text-rouge',
    expired: 'text-sable',
    completed: 'text-vert',
    disputed: 'text-rouge',
  }

  return (
    <div className="py-4 border-b border-ivoire last:border-0">
      {/* Exchange summary */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-10 h-10 bg-surface-raised border border-ivoire flex-shrink-0 overflow-hidden">
            {myItem.cover_image && (
              <Image src={myItem.cover_image} alt={myItem.title} width={40} height={40} className="object-cover w-full h-full" />
            )}
          </div>
          <p className="text-body-sm text-encre truncate">{myItem.title}</p>
        </div>

        <span className="text-sable flex-shrink-0 font-mono-custom text-[12px]">⇄</span>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-10 h-10 bg-surface-raised border border-ivoire flex-shrink-0 overflow-hidden">
            {theirItem.cover_image && (
              <Image src={theirItem.cover_image} alt={theirItem.title} width={40} height={40} className="object-cover w-full h-full" />
            )}
          </div>
          <p className="text-body-sm text-encre truncate">{theirItem.title}</p>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`font-mono-custom text-[11px] ${statusColor[trade.status]}`}>
            {statusLabel[trade.status]}
          </span>
          <span className="text-[11px] text-sable font-mono-custom">
            {isProposer ? `→ @${counterpart.username}` : `← @${counterpart.username}`}
          </span>
          {trade.proposer_cash_top_up > 0 && (
            <span className="text-[11px] text-or font-mono-custom">
              +{trade.proposer_cash_top_up}€
            </span>
          )}
        </div>

        {/* Actions for receiver on pending trades */}
        {trade.status === 'pending' && !isProposer && (
          <div className="flex gap-2">
            <button
              onClick={() => onRespond(trade.id, 'decline')}
              className="text-[11px] font-mono-custom text-sable hover:text-rouge transition-colors border border-ivoire px-3 py-1 hover:border-rouge"
            >
              Refuser
            </button>
            <button
              onClick={() => onRespond(trade.id, 'accept')}
              className="text-[11px] font-mono-custom text-parchemin bg-vert px-3 py-1 hover:bg-vert/80 transition-colors"
            >
              Accepter
            </button>
          </div>
        )}

        {/* Expiry for pending */}
        {trade.status === 'pending' && (
          <span className="text-[10px] text-sable font-mono-custom">
            Expire le {new Date(trade.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Transaction row ─────────────────────────────────────────
function TransactionRow({ tx, userId }: { tx: Transaction; userId: string }) {
  const isSeller = tx.seller_id === userId

  const statusLabel: Record<string, string> = {
    pending: 'En attente de paiement',
    paid: 'Payé — prépare l\'envoi',
    shipped: 'Expédié — en attente de confirmation',
    confirmed: 'Livraison confirmée',
    refunded: 'Remboursé',
    disputed: 'Litige en cours',
  }

  const statusColor: Record<string, string> = {
    pending: 'text-sable',
    paid: 'text-ambre',
    shipped: 'text-ambre',
    confirmed: 'text-vert',
    refunded: 'text-sable',
    disputed: 'text-rouge',
  }

  return (
    <div className="py-3.5 border-b border-ivoire last:border-0">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-encre truncate">
            {isSeller ? 'Vendu' : 'Acheté'}
          </p>
          <p className={`font-mono-custom text-[11px] mt-0.5 ${statusColor[tx.status]}`}>
            {statusLabel[tx.status]}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-mono-custom text-body-sm font-medium text-encre">
            {isSeller ? '+' : ''}{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(isSeller ? tx.amount_eur - tx.platform_fee_eur : tx.amount_eur)}
          </p>
          <p className="text-[10px] text-sable font-mono-custom mt-0.5">
            {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ──────────────────────────────────────────
export default function DashboardClient({
  listings: initialListings,
  trades: initialTrades,
  transactions,
  userId,
}: DashboardClientProps) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('listings')
  const [listings, setListings] = useState(initialListings)
  const [trades, setTrades] = useState(initialTrades)

  const pendingTradeCount = trades.filter(
    (t) => t.status === 'pending' && t.receiver_id === userId
  ).length

  async function handleArchive(itemId: string) {
    const { error } = await supabase
      .from('items')
      .update({ status: 'archived' })
      .eq('id', itemId)
      .eq('seller_id', userId)

    if (error) {
      showToast('Impossible d\'archiver cet objet.', 'error')
      return
    }
    setListings((prev) => prev.filter((i) => i.id !== itemId))
    showToast('Objet archivé.', 'info')
  }

  async function handleTradeResponse(tradeId: string, action: 'accept' | 'decline') {
    const res = await fetch('/api/trade/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trade_id: tradeId, action }),
    })
    const json = await res.json()
    if (!json.success) {
      showToast(json.error ?? 'Erreur lors de la réponse.', 'error')
      return
    }

    setTrades((prev) =>
      prev.map((t) =>
        t.id === tradeId
          ? { ...t, status: action === 'accept' ? 'accepted' : 'declined' }
          : t
      )
    )

    showToast(
      action === 'accept'
        ? 'Échange accepté. Les deux parties ont été notifiées.'
        : 'Échange refusé.',
      action === 'accept' ? 'success' : 'info'
    )
  }

  const tabs = [
    { id: 'listings' as Tab, label: 'Mes annonces', count: listings.filter(l => l.status === 'available').length },
    { id: 'trades' as Tab, label: 'Échanges', count: pendingTradeCount },
    { id: 'transactions' as Tab, label: 'Ventes & achats', count: 0 },
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-ivoire mb-6">
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`
              relative px-5 py-3 text-body-sm font-medium transition-colors
              ${tab === id
                ? 'text-encre border-b-2 border-encre -mb-px'
                : 'text-sable hover:text-encre'
              }
            `}
          >
            {label}
            {count > 0 && (
              <span className={`
                ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-mono-custom
                ${tab === id ? 'bg-encre text-parchemin' : 'bg-ivoire text-sable'}
              `}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Listings */}
      {tab === 'listings' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="eyebrow text-[11px]">
              {listings.filter(l => l.status === 'available').length} objet{listings.filter(l => l.status === 'available').length !== 1 ? 's' : ''} disponible{listings.filter(l => l.status === 'available').length !== 1 ? 's' : ''}
            </p>
            <Link href="/list" className="btn-trade text-[12px] py-1.5 px-4">
              + Ajouter
            </Link>
          </div>

          {listings.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-ivoire">
              <p className="font-display text-display-sm text-sable mb-2">
                Aucune annonce pour l'instant.
              </p>
              <Link href="/list" className="text-body-sm text-or hover:text-or-light underline underline-offset-2 transition-colors">
                Lister ton premier objet
              </Link>
            </div>
          ) : (
            <div>
              {listings.map((item) => (
                <ListingRow key={item.id} item={item} onArchive={handleArchive} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Trades */}
      {tab === 'trades' && (
        <div>
          {pendingTradeCount > 0 && (
            <div className="mb-4 p-3 border border-ambre bg-ambre/5 flex items-center gap-2">
              <span className="text-[11px] text-ambre font-mono-custom">
                {pendingTradeCount} proposition{pendingTradeCount > 1 ? 's' : ''} en attente de ta réponse.
              </span>
            </div>
          )}

          {trades.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-ivoire">
              <p className="font-display text-display-sm text-sable mb-2">
                Aucun échange pour l'instant.
              </p>
              <Link href="/browse" className="text-body-sm text-or hover:text-or-light underline underline-offset-2 transition-colors">
                Parcourir le catalogue
              </Link>
            </div>
          ) : (
            <div>
              {trades.map((trade) => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  userId={userId}
                  onRespond={handleTradeResponse}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Transactions */}
      {tab === 'transactions' && (
        <div>
          {transactions.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-ivoire">
              <p className="font-display text-display-sm text-sable">
                Aucune transaction pour l'instant.
              </p>
            </div>
          ) : (
            <div>
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} userId={userId} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
