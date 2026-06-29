import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-parchemin flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo mark */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="font-display text-display-md font-medium text-encre hover:text-or transition-colors"
          >
            GENIZA
          </Link>
        </div>

        {/* Card */}
        <div className="bg-surface border border-ivoire p-8">
          {children}
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-sable font-mono-custom mt-6">
          Marché de confiance pour collectionneurs · France
        </p>
      </div>
    </div>
  )
}
