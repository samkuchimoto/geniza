import type { Metadata } from 'next'
import ListingForm from '@/components/ListingForm'

export const metadata: Metadata = {
  title: 'Lister un objet',
  robots: { index: false, follow: false },
}

export default function ListPage() {
  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mb-8">
        <p className="eyebrow mb-2">Nouvelle annonce</p>
        <h1 className="font-display text-display-lg font-light text-encre">
          Lister un objet
        </h1>
        <p className="text-body-sm text-sable mt-2 max-w-md">
          Minimum 2 photos. Description factuelle. Ta collection est ton profil — chaque objet compte.
        </p>
      </div>

      <ListingForm />
    </div>
  )
}
