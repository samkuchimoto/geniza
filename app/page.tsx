import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { ItemWithCover } from '@/types'
import ItemCard from '@/components/ItemCard'

// ── Featured items (latest 4 available) ─────────────────────
async function getFeaturedItems(): Promise<ItemWithCover[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('items')
    .select(`
      *,
      seller:profiles!seller_id(id, username, collector_score, city, avatar_url),
      cover_image:item_images(url)
    `)
    .eq('status', 'available')
    .eq('item_images.is_cover', true)
    .order('created_at', { ascending: false })
    .limit(4)

  if (!data) return []
  return data.map((item: Record<string, unknown>) => ({
    ...item,
    cover_image: Array.isArray(item.cover_image) && item.cover_image.length > 0
      ? (item.cover_image[0] as { url: string }).url
      : null,
  })) as ItemWithCover[]
}

// ── Category cards data ──────────────────────────────────────
const CATEGORIES = [
  {
    key: 'art',
    label: 'Art',
    description: 'Estampes, lithographies, œuvres originales',
    icon: '◈',
  },
  {
    key: 'antiques',
    label: 'Antiquités',
    description: 'Brocante, numismatique, objets vintage',
    icon: '◎',
  },
  {
    key: 'bd',
    label: 'Bandes dessinées',
    description: 'Albums, planches originales, éditions signées',
    icon: '◉',
  },
  {
    key: 'cards',
    label: 'Cartes',
    description: 'Pokémon, cartes sportives, vintage',
    icon: '◇',
  },
]

export default async function HomePage() {
  const featured = await getFeaturedItems()

  return (
    <div className="bg-parchemin">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="border-b border-ivoire">
        <div className="container-page py-16 sm:py-24">
          <div className="max-w-3xl">

            {/* Eyebrow */}
            <p className="eyebrow mb-6 text-or">
              Marché de confiance · France
            </p>

            {/* Headline */}
            <h1 className="font-display text-display-xl font-light text-encre mb-6 leading-[1.05]">
              Échange ou vends<br />
              <em className="not-italic text-or">ta collection.</em>
            </h1>

            {/* Sub */}
            <p className="text-body-lg text-sable mb-10 max-w-xl leading-relaxed">
              Le seul marché pensé pour les vrais collectionneurs.
              Art, antiquités, bandes dessinées, cartes.
              Priced entre 200€ et 8 000€.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Link href="/browse" className="btn-primary text-body-md px-7 py-3">
                Voir le catalogue
              </Link>
              <Link href="/register" className="btn-secondary text-body-md px-7 py-3">
                Lister un objet
              </Link>
            </div>
          </div>

          {/* Stat bar */}
          <div className="mt-16 pt-8 border-t border-ivoire grid grid-cols-3 gap-6 max-w-lg">
            {[
              { value: '0%', label: 'Frais de listing' },
              { value: '6%', label: 'Commission vente' },
              { value: '7 j', label: 'Délai proposition' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="font-display text-display-md font-medium text-encre">{value}</p>
                <p className="eyebrow text-[11px] mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="border-b border-ivoire">
        <div className="container-page py-14 sm:py-20">
          <p className="eyebrow mb-10">Comment ça marche</p>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            {[
              {
                n: '01',
                title: 'Liste ce que tu possèdes',
                body:
                  'Photos, état, provenance. Ta collection devient ton profil public. Visible immédiatement.',
              },
              {
                n: '02',
                title: 'Propose un échange ou fixe un prix',
                body:
                  'Propose ton objet contre celui d\'un autre collectionneur. Ajoute un complément en cash si la valeur est inégale. Ou vends directement.',
              },
              {
                n: '03',
                title: 'Finalise en sécurité',
                body:
                  'Le paiement est sécurisé. Les deux parties confirment avant que quoi que ce soit soit libéré.',
              },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex gap-5">
                <span className="font-mono-custom text-[11px] text-sable pt-1 flex-shrink-0 w-6">
                  {n}
                </span>
                <div>
                  <h3 className="font-display text-display-sm font-medium text-encre mb-2">
                    {title}
                  </h3>
                  <p className="text-body-sm text-sable leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────── */}
      <section className="border-b border-ivoire">
        <div className="container-page py-14 sm:py-20">
          <div className="flex items-end justify-between mb-8">
            <p className="eyebrow">Catégories</p>
            <Link
              href="/browse"
              className="text-body-sm text-sable hover:text-encre transition-colors underline-or"
            >
              Tout voir
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map(({ key, label, description, icon }) => (
              <Link
                key={key}
                href={`/browse?category=${key}`}
                className="group card p-5 block"
              >
                <span className="text-2xl text-sable group-hover:text-or transition-colors block mb-3">
                  {icon}
                </span>
                <h3 className="font-display text-display-sm font-medium text-encre mb-1.5">
                  {label}
                </h3>
                <p className="text-body-sm text-sable leading-snug">{description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured listings ─────────────────────────────── */}
      {featured.length > 0 && (
        <section className="border-b border-ivoire">
          <div className="container-page py-14 sm:py-20">
            <div className="flex items-end justify-between mb-8">
              <p className="eyebrow">Ajouts récents</p>
              <Link
                href="/browse"
                className="text-body-sm text-sable hover:text-encre transition-colors underline-or"
              >
                Voir tout le catalogue
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {featured.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Bottom CTA ───────────────────────────────────── */}
      <section>
        <div className="container-page py-16 sm:py-24 text-center">
          <h2 className="font-display text-display-lg font-light text-encre mb-4">
            Ta collection mérite mieux<br />
            <em className="not-italic text-or">qu'une annonce générique.</em>
          </h2>
          <p className="text-body-md text-sable mb-8 max-w-md mx-auto">
            Rejoins les collectionneurs qui échangent, vendent et construisent
            leur collection sur GENIZA.
          </p>
          <Link href="/register" className="btn-primary text-body-md px-8 py-3">
            Créer un compte gratuit
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-ivoire">
        <div className="container-page py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span className="font-display text-display-sm font-medium text-encre">
              GENIZA
            </span>
            <p className="text-[11px] text-sable font-mono-custom">
              © {new Date().getFullYear()} GENIZA · Paris, France
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
