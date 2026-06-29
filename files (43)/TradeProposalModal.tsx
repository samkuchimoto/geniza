'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { showToast } from './Toast'
import ConditionBadge from './ConditionBadge'
import type { ItemWithCover } from '@/types'

interface TradeProposalModalProps {
  receiverItemId: string
  receiverItemTitle: string
  receiverUserId: string
  onClose: () => void
}

type Step = 'select' | 'confirm'

export default function TradeProposalModal({
  receiverItemId,
  receiverItemTitle,
  receiverUserId,
  onClose,
}: TradeProposalModalProps) {
  const supabase = createClient()
  const overlayRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState<Step>('select')
  const [myItems, setMyItems] = useState<ItemWithCover[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<ItemWithCover | null>(null)
  const [cashTopUp, setCashTopUp] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Fetch user's available items
  useEffect(() => {
    async function fetchMyItems() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          seller:profiles!seller_id(id, username, collector_score, city, avatar_url),
          cover_image:item_images(url)
        `)
        .eq('seller_id', user.id)
        .eq('status', 'available')
        .order('created_at', { ascending: false })

      if (error) {
        showToast('Impossible de charger ta collection.', 'error')
        return
      }

      // Normalize cover_image from array to string
      const normalized = (data ?? []).map((item: Record<string, unknown>) => ({
        ...item,
        cover_image: Array.isArray(item.cover_image) && item.cover_image.length > 0
          ? (item.cover_image[0] as { url: string }).url
          : null,
      })) as ItemWithCover[]

      setMyItems(normalized)
      setLoading(false)
    }

    fetchMyItems()
  }, [supabase])

  async function handleSubmit() {
    if (!selectedItem) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/trade/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposer_item_id: selectedItem.id,
          receiver_item_id: receiverItemId,
          receiver_user_id: receiverUserId,
          proposer_cash_top_up: cashTopUp ? parseFloat(cashTopUp) : 0,
          message: message.trim() || null,
        }),
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      showToast('Proposition envoyée. Tu seras notifié par email.', 'success')
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue.'
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function formatPrice(item: ItemWithCover): string {
    if (!item.price_eur || item.listing_type === 'trade') return 'Échange'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
    }).format(item.price_eur)
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-encre/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-parchemin border border-ivoire shadow-card-hover animate-slide-up max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ivoire flex-shrink-0">
          <div>
            <p className="eyebrow text-[10px] mb-0.5">Proposer un échange</p>
            <h2 className="font-display text-display-sm font-medium text-encre line-clamp-1">
              {receiverItemTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-sable hover:text-encre transition-colors flex-shrink-0 ml-4"
            aria-label="Fermer"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-ivoire flex-shrink-0">
          {(['select', 'confirm'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`
                flex-1 py-2.5 text-center text-[11px] font-mono-custom uppercase tracking-wider
                ${step === s ? 'text-encre border-b-2 border-encre' : 'text-sable'}
              `}
            >
              {i + 1}. {s === 'select' ? 'Ton objet' : 'Confirmer'}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Step 1: Select item ─────────────────────── */}
          {step === 'select' && (
            <div className="p-5 space-y-4">
              <p className="text-body-sm text-sable">
                Quel objet proposes-tu en échange?
              </p>

              {loading ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="skeleton aspect-[3/4]" />
                  ))}
                </div>
              ) : myItems.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-display text-display-sm text-sable mb-1">
                    Aucun objet disponible.
                  </p>
                  <p className="text-body-sm text-sable">
                    Liste d'abord un objet pour proposer un échange.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {myItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className={`
                        text-left border transition-all duration-150 overflow-hidden
                        ${selectedItem?.id === item.id
                          ? 'border-or ring-1 ring-or'
                          : 'border-ivoire hover:border-sable'
                        }
                      `}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-[4/3] bg-surface-raised overflow-hidden">
                        {item.cover_image ? (
                          <Image
                            src={item.cover_image}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] text-sable">Pas de photo</span>
                          </div>
                        )}
                        {selectedItem?.id === item.id && (
                          <div className="absolute inset-0 bg-or/10 flex items-center justify-center">
                            <div className="w-6 h-6 bg-or flex items-center justify-center">
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="square" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2.5">
                        <p className="text-[12px] text-encre font-medium line-clamp-1 leading-tight mb-1">
                          {item.title}
                        </p>
                        <div className="flex items-center justify-between">
                          <ConditionBadge condition={item.condition} size="sm" />
                          <span className="text-[11px] font-mono-custom text-sable">
                            {formatPrice(item)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Confirm ─────────────────────────── */}
          {step === 'confirm' && selectedItem && (
            <div className="p-5 space-y-5">

              {/* Exchange summary */}
              <div className="border border-ivoire">
                <div className="p-3 border-b border-ivoire">
                  <p className="eyebrow text-[10px] mb-1.5">Tu proposes</p>
                  <div className="flex items-center gap-3">
                    {selectedItem.cover_image && (
                      <div className="relative w-12 h-12 flex-shrink-0 overflow-hidden">
                        <Image src={selectedItem.cover_image} alt={selectedItem.title} fill className="object-cover" />
                      </div>
                    )}
                    <p className="text-body-sm font-medium text-encre line-clamp-2">{selectedItem.title}</p>
                  </div>
                </div>
                <div className="p-3 flex items-center justify-center text-sable">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2V14M2 8L8 14L14 8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
                  </svg>
                </div>
                <div className="p-3 border-t border-ivoire">
                  <p className="eyebrow text-[10px] mb-1.5">Contre</p>
                  <p className="text-body-sm font-medium text-encre">{receiverItemTitle}</p>
                </div>
              </div>

              {/* Cash top-up */}
              <div>
                <label htmlFor="topup" className="label">
                  Complément en cash{' '}
                  <span className="text-sable normal-case tracking-normal font-body font-normal">
                    (optionnel)
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="topup"
                    type="number"
                    min="1"
                    max="9999"
                    step="1"
                    value={cashTopUp}
                    onChange={(e) => setCashTopUp(e.target.value)}
                    placeholder="0"
                    className="input font-mono-custom pr-10"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sable font-mono-custom text-body-sm">
                    €
                  </span>
                </div>
                <p className="text-[11px] text-sable font-mono-custom mt-1">
                  Ajoute un montant si la valeur de votre échange est inégale.
                </p>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="label">
                  Message{' '}
                  <span className="text-sable normal-case tracking-normal font-body font-normal">
                    (optionnel)
                  </span>
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 150))}
                  rows={3}
                  placeholder="Présente-toi ou précise ta proposition..."
                  className="input resize-none text-body-sm"
                />
                <p className="text-[11px] text-sable font-mono-custom mt-1 text-right">
                  {message.length}/150
                </p>
              </div>

              <p className="text-[11px] text-sable font-mono-custom bg-surface-raised p-3 border border-ivoire">
                La proposition expire automatiquement dans 7 jours si elle reste sans réponse.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-ivoire flex-shrink-0">
          {step === 'select' ? (
            <>
              <button type="button" onClick={onClose} className="btn-secondary">
                Annuler
              </button>
              <button
                type="button"
                onClick={() => setStep('confirm')}
                disabled={!selectedItem}
                className="btn-trade disabled:opacity-40"
              >
                Continuer →
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setStep('select')} className="btn-secondary">
                ← Retour
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-trade disabled:opacity-50"
              >
                {submitting ? 'Envoi...' : 'Envoyer la proposition'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
