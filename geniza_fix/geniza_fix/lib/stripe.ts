import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
})

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!

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
  const platformFee = Math.round(params.priceEur * 0.06 * 100) // 6% in cents

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
        platform_fee_eur: (platformFee / 100).toFixed(2),
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
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}
