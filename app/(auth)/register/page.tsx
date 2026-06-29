'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { showToast } from '@/components/Toast'

// ── Inner component — the only part that calls useSearchParams ──────────────
function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 8) {
      showToast('Le mot de passe doit contenir au moins 8 caractères.', 'error')
      return
    }
    if (password !== confirm) {
      showToast('Les mots de passe ne correspondent pas.', 'error')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      showToast(
        error.message.includes('already registered')
          ? 'Un compte existe déjà avec cet email.'
          : error.message,
        'error'
      )
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
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
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="w-10 h-10 border border-vert flex items-center justify-center mx-auto mb-5">
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path
              d="M1 6L5.5 10.5L15 1"
              stroke="#3B6B4A"
              strokeWidth="1.5"
              strokeLinecap="square"
            />
          </svg>
        </div>
        <h2 className="font-display text-display-sm font-medium text-encre mb-2">
          Confirme ton email
        </h2>
        <p className="text-body-sm text-sable leading-relaxed">
          Un lien de confirmation a été envoyé à{' '}
          <strong className="text-encre">{email}</strong>.
          Clique dessus pour activer ton compte.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="font-display text-display-md font-medium text-encre mb-1">
          Créer un compte
        </h1>
        <p className="text-body-sm text-sable">
          Déjà inscrit?{' '}
          <Link
            href={`/login${next !== '/dashboard' ? `?next=${next}` : ''}`}
            className="text-encre underline underline-offset-2 hover:text-or transition-colors"
          >
            Se connecter
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
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z"
                fill="#4285F4"
              />
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
      <form onSubmit={handleRegister} className="space-y-4">
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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="8 caractères minimum"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="label">Confirmer le mot de passe</label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`input ${confirm && confirm !== password ? 'border-rouge' : ''}`}
            placeholder="••••••••"
          />
          {confirm && confirm !== password && (
            <p className="text-[11px] text-rouge font-mono-custom mt-1">
              Les mots de passe ne correspondent pas.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading || (!!confirm && confirm !== password)}
          className="btn-primary w-full py-3 text-body-md disabled:opacity-50"
        >
          {loading ? 'Création...' : 'Créer mon compte'}
        </button>

        <p className="text-[11px] text-sable text-center leading-relaxed">
          En créant un compte, tu acceptes d'agir de bonne foi
          et de décrire honnêtement tes objets.
        </p>
      </form>
    </>
  )
}

// ── Page — Suspense required because RegisterForm calls useSearchParams ──────
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="py-4 text-center text-sable text-body-sm">Chargement...</div>
      }
    >
      <RegisterForm />
    </Suspense>
  )
}