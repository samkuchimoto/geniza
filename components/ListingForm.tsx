'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageUploader from './ImageUploader'
import { showToast } from './Toast'
import { createClient } from '@/lib/supabase/client'
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  LISTING_TYPE_LABELS,
  type Category,
  type Condition,
  type ListingType,
} from '@/types'

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [Category, string][]
const CONDITIONS = Object.entries(CONDITION_LABELS) as [Condition, string][]
const LISTING_TYPES = Object.entries(LISTING_TYPE_LABELS) as [ListingType, string][]

interface ListingFormData {
  title: string
  description: string
  category: Category
  condition: Condition
  listing_type: ListingType
  price_eur: string
  provenance: string
  images: File[]
}

const EMPTY_FORM: ListingFormData = {
  title: '',
  description: '',
  category: 'art',
  condition: 'bon',
  listing_type: 'both',
  price_eur: '',
  provenance: '',
  images: [],
}

export default function ListingForm() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState<ListingFormData>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof ListingFormData, string>>>({})

  const set = <K extends keyof ListingFormData>(key: K, value: ListingFormData[K]) => {
    setForm((prev: ListingFormData) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const e: typeof errors = {}
    if (!form.title.trim()) e.title = 'Le titre est requis.'
    if (form.images.length < 2) e.images = 'Minimum 2 photos requises.'
    if (
      (form.listing_type === 'sale' || form.listing_type === 'both') &&
      (!form.price_eur || Number(form.price_eur) <= 0)
    ) {
      e.price_eur = 'Un prix est requis pour la vente.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleAiAssist() {
    if (!form.title.trim()) {
      showToast("Saisis d'abord un titre pour générer une description.", 'info')
      return
    }
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: form.title,
          category: form.category,
          condition: form.condition,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      set('title', json.data.titre || form.title)
      set('description', json.data.description || '')
      showToast('Description générée. Vérifie et ajuste avant de publier.', 'success')
    } catch {
      showToast('La génération a échoué. Réessaie.', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  async function uploadImages(itemId: string): Promise<string[]> {
    const urls: string[] = []
    for (const file of form.images) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${itemId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage
        .from('item-images')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (error) throw new Error(`Upload failed: ${error.message}`)
      const { data: { publicUrl } } = supabase.storage
        .from('item-images')
        .getPublicUrl(path)
      urls.push(publicUrl)
    }
    return urls
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié.')

      const { data: item, error: itemError } = await supabase
        .from('items')
        .insert({
          seller_id: user.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          condition: form.condition,
          listing_type: form.listing_type,
          price_eur:
            form.listing_type !== 'trade' && form.price_eur
              ? parseFloat(form.price_eur)
              : null,
          provenance: form.provenance.trim() || null,
          status: 'draft',
        })
        .select('id')
        .single()

      if (itemError || !item) throw new Error(itemError?.message ?? 'Erreur création.')

      const urls = await uploadImages(item.id)

      const imageRows = urls.map((url, i) => ({
        item_id: item.id,
        url,
        sort_order: i,
        is_cover: i === 0,
      }))
      const { error: imgError } = await supabase.from('item_images').insert(imageRows)
      if (imgError) throw new Error(imgError.message)

      const { error: pubError } = await supabase
        .from('items')
        .update({ status: 'available' })
        .eq('id', item.id)
      if (pubError) throw new Error(pubError.message)

      showToast('Objet publié avec succès.', 'success')
      router.push(`/item/${item.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue.'
      showToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const needsPrice = form.listing_type === 'sale' || form.listing_type === 'both'

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl" noValidate>

      <section className="space-y-1">
        <ImageUploader
          files={form.images}
          onChange={(files) => set('images', files)}
        />
        {errors.images && (
          <p className="text-[11px] text-rouge font-mono-custom">{errors.images}</p>
        )}
      </section>

      <div className="divider" />

      <section className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Catégorie</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value as Category)}
            className="input"
          >
            {CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">État</label>
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            {CONDITIONS.map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => set('condition', v as Condition)}
                className={`
                  py-2 px-3 text-body-sm text-left border transition-colors duration-150
                  ${form.condition === v
                    ? 'border-encre bg-encre text-parchemin'
                    : 'border-ivoire text-sable hover:border-sable'
                  }
                `}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <label htmlFor="title" className="label">Titre</label>
        <input
          id="title"
          type="text"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Ex: Lithographie originale Moebius signée, 1978"
          maxLength={100}
          className={`input ${errors.title ? 'border-rouge' : ''}`}
        />
        <div className="flex justify-between mt-1">
          {errors.title
            ? <p className="text-[11px] text-rouge font-mono-custom">{errors.title}</p>
            : <span />
          }
          <span className="text-[11px] text-sable font-mono-custom">
            {form.title.length}/100
          </span>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-1.5">
          <label htmlFor="description" className="label mb-0">Description</label>
          <button
            type="button"
            onClick={handleAiAssist}
            disabled={aiLoading || submitting}
            className="text-[11px] text-or hover:text-or-light font-medium font-mono-custom underline underline-offset-2 disabled:opacity-50 transition-colors"
          >
            {aiLoading ? 'Génération...' : "✦ Générer avec l'IA"}
          </button>
        </div>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={5}
          placeholder="Décris l'objet de manière factuelle — dimensions, technique, édition, histoire..."
          maxLength={1500}
          className="input resize-none"
        />
        <p className="text-[11px] text-sable font-mono-custom mt-1 text-right">
          {form.description.length}/1500
        </p>
      </section>

      <section>
        <label htmlFor="provenance" className="label">
          Provenance{' '}
          <span className="text-sable normal-case tracking-normal font-body font-normal">
            (optionnel)
          </span>
        </label>
        <input
          id="provenance"
          type="text"
          value={form.provenance}
          onChange={(e) => set('provenance', e.target.value)}
          placeholder="Ex: Acheté chez Artcurial en 2019 — facture disponible"
          maxLength={300}
          className="input"
        />
        <p className="text-[11px] text-sable font-mono-custom mt-1">
          La provenance renforce la confiance des acheteurs.
        </p>
      </section>

      <div className="divider" />

      <section>
        <label className="label">Mode de cession</label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {LISTING_TYPES.map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => set('listing_type', v as ListingType)}
              className={`
                py-3 px-2 text-body-sm text-center border transition-colors duration-150
                ${form.listing_type === v
                  ? 'border-encre bg-encre text-parchemin'
                  : 'border-ivoire text-sable hover:border-sable'
                }
              `}
            >
              {l}
            </button>
          ))}
        </div>
      </section>

      {needsPrice && (
        <section className="animate-fade-in">
          <label htmlFor="price" className="label">Prix de vente (€)</label>
          <div className="relative">
            <input
              id="price"
              type="number"
              min="1"
              max="999999"
              step="1"
              value={form.price_eur}
              onChange={(e) => set('price_eur', e.target.value)}
              placeholder="0"
              className={`input font-mono-custom pr-10 ${errors.price_eur ? 'border-rouge' : ''}`}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sable font-mono-custom text-body-sm">
              €
            </span>
          </div>
          {errors.price_eur && (
            <p className="text-[11px] text-rouge font-mono-custom mt-1">{errors.price_eur}</p>
          )}
          <p className="text-[11px] text-sable font-mono-custom mt-1">
            Commission GENIZA: 6% prélevée à la vente.
          </p>
        </section>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={submitting || aiLoading}
          className="btn-primary px-8 py-3 text-body-md disabled:opacity-50"
        >
          {submitting ? 'Publication en cours...' : "Publier l'objet"}
        </button>
        <p className="text-body-sm text-sable">
          Visible immédiatement après publication.
        </p>
      </div>
    </form>
  )
}