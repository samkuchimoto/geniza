import Stripe from 'stripe'
import { isStripeConfigured, ServiceUnavailableError } from './config'

// ============================================================
// Lazy singleton — constructed on first real use, not on import.
// If STRIPE_SECRET_KEY is absent, every exported function throws
// a controlled ServiceUnavailableError that callers catch and
// turn into a friendly 503, instead of crashing the module.
// ============================================================
let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new ServiceUnavailableError('Stripe')
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-04-10',
      typescript: true,
    })
  }
  return _stripe
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

// ============================================================
// Cash sale — Stripe Checkout Session
// ============================================================
export async function createSaleCheckoutSession(params: {
  itemId: string
  itemTitle: string
  coverImageUrl: string | null
  priceEur: number
  sellerId: string
  buyerId: string
}): Promise<string> {
  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(params.priceEur * 100),
          product_data: {
            name: params.itemTitle,
            ...(params.coverImageUrl ? { images: [params.coverImageUrl] } : {}),
          },
        },
      },
    ],
    payment_intent_data: {
      metadata: {
        item_id: params.itemId,
        seller_id: params.sellerId,
        buyer_id: params.buyerId,
        platform_fee_eur: (params.priceEur * 0.06).toFixed(2),
        type: 'sale',
      },
    },
    success_url: `${BASE_URL}/item/${params.itemId}?sale=success`,
    cancel_url: `${BASE_URL}/item/${params.itemId}?sale=cancelled`,
    locale: 'fr',
  })

  return session.url!
}

// ============================================================
// Trade cash top-up — PaymentIntent
// ============================================================
export async function createTradeTopUpIntent(params: {
  tradeId: string
  proposerId: string
  receiverId: string
  topUpEur: number
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = getStripe()

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(params.topUpEur * 100),
    currency: 'eur',
    automatic_payment_methods: { enabled: true },
    metadata: {
      trade_id: params.tradeId,
      proposer_id: params.proposerId,
      receiver_id: params.receiverId,
      type: 'trade_top_up',
    },
    capture_method: 'automatic',
  })

  return {
    clientSecret: intent.client_secret!,
    paymentIntentId: intent.id,
  }
}

// ============================================================
// Webhook signature verification
// ============================================================
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe()
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new ServiceUnavailableError('Stripe webhook secret')
  }
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  )
}

/** Direct access escape hatch for the webhook route, which needs the raw client. */
export function getStripeClient(): Stripe {
  return getStripe()
}
