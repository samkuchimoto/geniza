import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="font-mono-custom text-label-lg text-sable mb-4">404</p>
        <h1 className="font-display text-display-lg font-light text-encre mb-3">
          Page introuvable.
        </h1>
        <p className="text-body-md text-sable mb-8">
          Cet objet a peut-être été vendu, échangé, ou n'a jamais existé.
        </p>
        <Link href="/browse" className="btn-primary px-7 py-3 text-body-md">
          Retour au catalogue
        </Link>
      </div>
    </div>
  )
}
