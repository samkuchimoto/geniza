import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createTradeTopUpIntent } from '@/lib/stripe'
import { sendEmail } from '@/lib/email'
import { isStripeConfigured } from '@/lib/config'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 })
    }

    const { trade_id, action } = await request.json()

    if (!trade_id || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'trade_id et action (accept|decline) requis.' },
        { status: 400 }
      )
    }

    // Fetch trade — only the receiver can respond
    const { data: trade, error: tradeError } = await supabase
      .from('trade_proposals')
      .select(`
        *,
        proposer_item:items!proposer_item_id(id, title, seller_id),
        receiver_item:items!receiver_item_id(id, title, seller_id)
      `)
      .eq('id', trade_id)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .single()

    if (tradeError || !trade) {
      return NextResponse.json(
        { success: false, error: 'Proposition introuvable ou déjà traitée.' },
        { status: 404 }
      )
    }

    const serviceSupabase = createServiceClient()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!

    // ── DECLINE ────────────────────────────────────────────
    if (action === 'decline') {
      const { error } = await supabase
        .from('trade_proposals')
        .update({ status: 'declined' })
        .eq('id', trade_id)

      if (error) throw new Error(error.message)

      // Notify proposer
      const { data: propAuth } = await serviceSupabase.auth.admin.getUserById(trade.proposer_id)
      const proposerEmail = propAuth?.user?.email

      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (proposerEmail) {
        await sendEmail('trade_declined', proposerEmail, {
          item_title: (trade.proposer_item as { title: string }).title,
          receiver_name: receiverProfile?.username ?? 'Le collectionneur',
        })
      }

      return NextResponse.json({ success: true, data: { status: 'declined' } })
    }

    // ── ACCEPT ─────────────────────────────────────────────
    const hasCashTopUp = trade.proposer_cash_top_up > 0

    if (hasCashTopUp && !isStripeConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cet échange nécessite un complément en cash, mais les paiements ne sont pas encore activés sur cette installation.',
        },
        { status: 503 }
      )
    }

    if (hasCashTopUp) {
      // Create Stripe PaymentIntent for top-up — items stay available until payment succeeds
      // Webhook handles locking items on payment_intent.succeeded
      const { clientSecret, paymentIntentId } = await createTradeTopUpIntent({
        tradeId: trade_id,
        proposerId: trade.proposer_id,
        receiverId: user.id,
        topUpEur: trade.proposer_cash_top_up,
      })

      // Store payment intent on trade
      await supabase
        .from('trade_proposals')
        .update({ stripe_payment_intent_id: paymentIntentId })
        .eq('id', trade_id)

      return NextResponse.json({
        success: true,
        data: {
          status: 'awaiting_payment',
          client_secret: clientSecret,
          amount_eur: trade.proposer_cash_top_up,
        },
      })
    }

    // No cash top-up: atomic lock + complete immediately
    const proposerItemId = (trade.proposer_item as { id: string }).id
    const receiverItemId = (trade.receiver_item as { id: string }).id

    const [itemsUpdate, tradeUpdate] = await Promise.all([
      serviceSupabase
        .from('items')
        .update({ status: 'in_trade' })
        .in('id', [proposerItemId, receiverItemId]),
      serviceSupabase
        .from('trade_proposals')
        .update({ status: 'accepted' })
        .eq('id', trade_id),
    ])

    if (itemsUpdate.error) throw new Error(itemsUpdate.error.message)
    if (tradeUpdate.error) throw new Error(tradeUpdate.error.message)

    // Notify proposer
    const { data: propAuth } = await serviceSupabase.auth.admin.getUserById(trade.proposer_id)
    const proposerEmail = propAuth?.user?.email

    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    if (proposerEmail) {
      await sendEmail('trade_accepted', proposerEmail, {
        item_title: (trade.proposer_item as { title: string }).title,
        receiver_name: receiverProfile?.username ?? 'Le collectionneur',
        proposer_item_title: (trade.proposer_item as { title: string }).title,
        receiver_item_title: (trade.receiver_item as { title: string }).title,
        trade_url: `${baseUrl}/dashboard`,
      })
    }

    // Update both collectors' scores
    await Promise.allSettled([
      serviceSupabase.rpc('increment_completed_trades', { user_id: trade.proposer_id }),
      serviceSupabase.rpc('increment_completed_trades', { user_id: user.id }),
    ])

    return NextResponse.json({ success: true, data: { status: 'accepted' } })
  } catch (err: unknown) {
    console.error('[trade/respond]', err)
    return NextResponse.json(
      { success: false, error: 'Erreur lors du traitement de la proposition.' },
      { status: 500 }
    )
  }
}
