'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TradeProposalModal from '@/components/TradeProposalModal'
import { showToast } from '@/components/Toast'
import type { ListingType } from '@/types'

interface ItemActionsProps {
  itemId: string
  itemTitle: string
  sellerUserId: string
  listingType: ListingType
  priceEur: number | null
  currentUserId: string | null   // null = not logged in
  isOwner: boolean
}

export default function ItemActions({
  itemId,
  itemTitle,
  sellerUserId,
  listingType,
  priceEur,
  currentUserId,
  isOwner,
}: ItemActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [buyLoading, setBuyLoading] = useState(false)

  const canBuy = listingType === 'sale' || listingType === 'both'
  const canTrade = listingType === 'trade' || listingType === 'both'

  function requireAuth(action: () => void) {
    if (!currentUserId) {
      router.push(`/login?next=/item/${itemId}`)
      return
    }
    action()
  }

  async function handleBuy() {
    requireAuth(async () => {
      setBuyLoading(true)
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: itemId }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        window.location.href = json.data.url
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur lors du paiement.'
        showToast(msg, 'error')
        setBuyLoading(false)
      }
    })
  }

  function handleTrade() {
    requireAuth(() => setShowTradeModal(true))
  }

  // Owner sees edit options, not buy/trade
  if (isOwner) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => router.push(`/dashboard`)}
          className="btn-secondary w-full py-3 text-body-md"
        >
          Gérer cet objet
        </button>
        <p className="text-[11px] text-sable text-center font-mono-custom">
          Tu es le vendeur de cet objet.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2.5">
        {canBuy && priceEur && (
          <button
            onClick={handleBuy}
            disabled={buyLoading}
            className="btn-primary w-full py-3.5 text-body-md disabled:opacity-50"
          >
            {buyLoading
              ? 'Redirection...'
              : `Acheter — ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(priceEur)}`
            }
          </button>
        )}

        {canTrade && (
          <button
            onClick={handleTrade}
            className="btn-trade w-full py-3.5 text-body-md"
          >
            ⇄ Proposer un échange
          </button>
        )}

        {!currentUserId && (
          <p className="text-[11px] text-sable text-center font-mono-custom pt-1">
            Connexion requise pour acheter ou échanger.
          </p>
        )}
      </div>

      {showTradeModal && (
        <TradeProposalModal
          receiverItemId={itemId}
          receiverItemTitle={itemTitle}
          receiverUserId={sellerUserId}
          onClose={() => setShowTradeModal(false)}
        />
      )}
    </>
  )
}
