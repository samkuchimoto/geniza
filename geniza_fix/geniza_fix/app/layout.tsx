import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import { ToastContainer } from '@/components/Toast'

export const metadata: Metadata = {
  title: {
    default: 'GENIZA — Échange ou vends ta collection',
    template: '%s — GENIZA',
  },
  description:
    'Le seul marché pensé pour les vrais collectionneurs. Art, antiquités, bandes dessinées, cartes. France.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://geniza.exchange'),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'GENIZA',
    title: 'GENIZA — Échange ou vends ta collection',
    description:
      'Le marché de confiance pour les collectionneurs sérieux. Art, antiquités, BD, cartes. France.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-parchemin">
        <Navbar />
        <main>{children}</main>
        <ToastContainer />
      </body>
    </html>
  )
}
