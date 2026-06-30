import { NextResponse } from 'next/server'
import { constructWebhookEvent, getStripeClient } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { isStripeWebhookConfigured } from '@/lib/config'
import type Stripe from 'stripe'

// App Router reads the raw body via request.text() below —
// no Pages Router "config" export needed or supported here.

export async function POST(request: Request) {
  // If Stripe isn't wired up, there's nothing valid to verify.
  // Respond 200 so Stripe (if it ever calls) doesn't retry forever,
  // but do nothing — this should simply never be hit in that state.
  if (!isStripeWebhookConfigured()) {
    console.warn('[stripe/webhook] Received a call but Stripe is not configured. Ignoring.')
    return NextResponse.json({ received: true, configured: false })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(body, signature)
  } catch (err: unknown) {
    console.error('[stripe/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const stripe = getStripeClient()

  try {
    switch (event.type) {

      // ── Cash sale completed ────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.CheckoutSession
        const meta = session.payment_intent
          ? (await stripe.paymentIntents.retrieve(session.payment_intent as string)).metadata
          : null

        if (!meta || meta.type !== 'sale') break

        const { item_id, seller_id, buyer_id, platform_fee_eur } = meta
        const amountEur = (session.amount_total ?? 0) / 100
        const feeEur = parseFloat(platform_fee_eur ?? '0')

        await supabase.from('transactions').insert({
          item_id,
          seller_id,
          buyer_id,
          amount_eur: amountEur,
          platform_fee_eur: feeEur,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          status: 'paid',
        })

        await supabase.from('items').update({ status: 'sold' }).eq('id', item_id)
        await supabase.rpc('increment_completed_sales', { user_id: seller_id })

        const { data: item } = await supabase
          .from('items')
          .select('title')
          .eq('id', item_id)
          .single()

        const { data: sellerAuth } = await supabase.auth.admin.getUserById(seller_id)
        const sellerEmail = sellerAuth?.user?.email

        if (sellerEmail && item) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
          await sendEmail('sale_confirmed', sellerEmail, {
            item_title: item.title,
            buyer_name: buyer_id.slice(0, 8),
            amount_eur: amountEur.toFixed(2),
            fee_eur: feeEur.toFixed(2),
            net_eur: (amountEur - feeEur).toFixed(2),
            dashboard_url: `${baseUrl}/dashboard`,
          })
        }

        break
      }

      // ── Trade top-up payment succeeded ────────────────────
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent
        const meta = intent.metadata

        if (meta.type !== 'trade_top_up') break

        const { trade_id, proposer_id, receiver_id } = meta

        const { data: trade } = await supabase
          .from('trade_proposals')
          .select('proposer_item_id, receiver_item_id')
          .eq('id', trade_id)
          .single()

        if (!trade) break

        await Promise.all([
          supabase
            .from('items')
            .update({ status: 'in_trade' })
            .in('id', [trade.proposer_item_id, trade.receiver_item_id]),
          supabase
            .from('trade_proposals')
            .update({ status: 'accepted', stripe_payment_intent_id: intent.id })
            .eq('id', trade_id),
        ])

        const { data: propAuth } = await supabase.auth.admin.getUserById(proposer_id)

        const { data: tradeItems } = await supabase
          .from('trade_proposals')
          .select(`
            proposer_item:items!proposer_item_id(title),
            receiver_item:items!receiver_item_id(title)
          `)
          .eq('id', trade_id)
          .single()

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''

        if (propAuth?.user?.email && tradeItems) {
          await sendEmail('trade_accepted', propAuth.user.email, {
            item_title: (tradeItems.proposer_item as { title: string }).title,
            receiver_name: receiver_id.slice(0, 8),
            proposer_item_title: (tradeItems.proposer_item as { title: string }).title,
            receiver_item_title: (tradeItems.receiver_item as { title: string }).title,
            trade_url: `${baseUrl}/dashboard`,
          })
        }

        break
      }

      default:
        break
    }
  } catch (err: unknown) {
    console.error('[stripe/webhook] Handler error:', err)
    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
