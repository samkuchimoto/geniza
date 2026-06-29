'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { showToast } from '@/components/Toast'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      showToast(
        error.message.includes('Invalid login credentials')
          ? 'Email ou mot de passe incorrect.'
          : error.message,
        'error'
      )
      setLoading(false)
      return
    }

    router.push(next)
    router.refresh()
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      showToast('Connexion Google échouée.', 'error')
      setGoogleLoading(false)
    }
    // On success, Supabase redirects the page — no need to setLoading(false)
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="font-display text-display-md font-medium text-encre mb-1">
          Se connecter
        </h1>
        <p className="text-body-sm text-sable">
          Pas encore de compte?{' '}
          <Link
            href={`/register${next !== '/dashboard' ? `?next=${next}` : ''}`}
            className="text-encre underline underline-offset-2 hover:text-or transition-colors"
          >
            S'inscrire
          </Link>
        </p>
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-3 border border-ivoire bg-surface py-2.5 text-body-sm text-encre hover:border-sable transition-colors mb-5 disabled:opacity-50"
      >
        {googleLoading ? (
          <span className="text-sable">Redirection...</span>
        ) : (
          <>
            {/* Google icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z" fill="#4285F4"/>
            </svg>
            Continuer avec Google
          </>
        )}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 divider" />
        <span className="eyebrow text-[10px]">ou</span>
        <div className="flex-1 divider" />
      </div>

      {/* Email/password form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="toi@exemple.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="label">Mot de passe</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="btn-primary w-full py-3 text-body-md disabled:opacity-50"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </>
  )
}
