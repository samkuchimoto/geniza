// ============================================================
// GENIZA — Integration Config Guard
// Single source of truth for "is this service configured?"
// Every optional integration (Stripe, Groq, Email) checks here
// before doing anything. Supabase is the only hard dependency —
// everything else is a feature that can be absent without
// breaking the build or crashing a route.
// ============================================================

export const isStripeConfigured = (): boolean =>
  Boolean(process.env.STRIPE_SECRET_KEY)

export const isStripeWebhookConfigured = (): boolean =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)

export const isGroqConfigured = (): boolean =>
  Boolean(process.env.GROQ_API_KEY)

export const isEmailConfigured = (): boolean =>
  Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)

/** Client-safe — only exposes whether the publishable key exists, never the secret. */
export const isStripeConfiguredClient = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

export class ServiceUnavailableError extends Error {
  constructor(service: string) {
    super(`${service} is not configured.`)
    this.name = 'ServiceUnavailableError'
  }
}
