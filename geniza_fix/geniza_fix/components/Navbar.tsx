'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
    setSigningOut(false)
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`
        text-body-sm transition-colors duration-150
        ${pathname === href
          ? 'text-encre font-medium'
          : 'text-sable hover:text-encre'
        }
      `}
    >
      {label}
    </Link>
  )

  return (
    <header className="sticky top-0 z-40 bg-parchemin border-b border-ivoire">
      <div className="container-page">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link
            href="/"
            className="font-display text-display-sm font-medium text-encre tracking-tight hover:text-or transition-colors"
          >
            GENIZA
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-6">
            {navLink('/browse', 'Catalogue')}
            {user && navLink('/dashboard', 'Mon espace')}
          </nav>

          {/* Right actions */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <>
                <Link href="/list" className="btn-trade text-[13px] py-2 px-4">
                  + Lister un objet
                </Link>
                <div className="relative group">
                  <button className="w-8 h-8 rounded-full bg-surface-raised border border-ivoire flex items-center justify-center text-body-sm font-medium text-encre hover:border-sable transition-colors">
                    {user.email?.charAt(0).toUpperCase()}
                  </button>
                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-ivoire shadow-card-hover opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 z-50">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2.5 text-body-sm text-encre hover:bg-surface-raised transition-colors"
                    >
                      Mon espace
                    </Link>
                    <Link
                      href="/profile/me"
                      className="block px-4 py-2.5 text-body-sm text-encre hover:bg-surface-raised transition-colors"
                    >
                      Ma collection
                    </Link>
                    <div className="divider" />
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="block w-full text-left px-4 py-2.5 text-body-sm text-rouge hover:bg-surface-raised transition-colors disabled:opacity-50"
                    >
                      {signingOut ? 'Déconnexion...' : 'Se déconnecter'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary text-[13px] py-2 px-4">
                  Se connecter
                </Link>
                <Link href="/register" className="btn-primary text-[13px] py-2 px-4">
                  S'inscrire
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 -mr-2 text-encre"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
              </svg>
            ) : (
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                <path d="M0 1H18M0 7H18M0 13H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-ivoire bg-parchemin animate-fade-in">
          <div className="container-page py-4 flex flex-col gap-1">
            <Link
              href="/browse"
              onClick={() => setMenuOpen(false)}
              className="py-2.5 text-body-md text-encre"
            >
              Catalogue
            </Link>
            {user ? (
              <>
                <Link
                  href="/list"
                  onClick={() => setMenuOpen(false)}
                  className="py-2.5 text-body-md text-or font-medium"
                >
                  + Lister un objet
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="py-2.5 text-body-md text-encre"
                >
                  Mon espace
                </Link>
                <Link
                  href="/profile/me"
                  onClick={() => setMenuOpen(false)}
                  className="py-2.5 text-body-md text-encre"
                >
                  Ma collection
                </Link>
                <div className="divider my-1" />
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="py-2.5 text-left text-body-md text-rouge disabled:opacity-50"
                >
                  {signingOut ? 'Déconnexion...' : 'Se déconnecter'}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="py-2.5 text-body-md text-encre"
                >
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="py-2.5 text-body-md text-encre font-medium"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
