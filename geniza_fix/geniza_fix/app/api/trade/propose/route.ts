import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 })
    }

    const body = await request.json()
    const {
      proposer_item_id,
      receiver_item_id,
      receiver_user_id,
      proposer_cash_top_up = 0,
      message = null,
    } = body

    // Validate required fields
    if (!proposer_item_id || !receiver_item_id || !receiver_user_id) {
      return NextResponse.json(
        { success: false, error: 'Champs manquants.' },
        { status: 400 }
      )
    }

    // Prevent trading with yourself
    if (receiver_user_id === user.id) {
      return NextResponse.json(
        { success: false, error: 'Tu ne peux pas proposer un échange avec toi-même.' },
        { status: 400 }
      )
    }

    // Validate proposer owns their item and it's available
    const { data: proposerItem, error: piError } = await supabase
      .from('items')
      .select('id, title, seller_id, status, listing_type')
      .eq('id', proposer_item_id)
      .eq('seller_id', user.id)
      .eq('status', 'available')
      .single()

    if (piError || !proposerItem) {
      return NextResponse.json(
        { success: false, error: 'Ton objet est introuvable ou indisponible.' },
        { status: 400 }
      )
    }

    // Validate receiver item exists, is available, and accepts trades
    const { data: receiverItem, error: riError } = await supabase
      .from('items')
      .select('id, title, seller_id, status, listing_type')
      .eq('id', receiver_item_id)
      .eq('seller_id', receiver_user_id)
      .eq('status', 'available')
      .in('listing_type', ['trade', 'both'])
      .single()

    if (riError || !receiverItem) {
      return NextResponse.json(
        { success: false, error: 'L\'objet demandé est introuvable ou n\'accepte pas les échanges.' },
        { status: 400 }
      )
    }

    // Check no pending trade already exists between these two items
    const { data: existing } = await supabase
      .from('trade_proposals')
      .select('id')
      .eq('proposer_item_id', proposer_item_id)
      .eq('receiver_item_id', receiver_item_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Une proposition est déjà en cours pour ces deux objets.' },
        { status: 409 }
      )
    }

    // Create proposal
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: proposal, error: propError } = await supabase
      .from('trade_proposals')
      .insert({
        proposer_id: user.id,
        receiver_id: receiver_user_id,
        proposer_item_id,
        receiver_item_id,
        proposer_cash_top_up: Number(proposer_cash_top_up) || 0,
        message: message ?? null,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (propError || !proposal) {
      throw new Error(propError?.message ?? 'Erreur création proposition.')
    }

    // Notify receiver by email
    const serviceSupabase = createServiceClient()
    const { data: receiverAuth } = await serviceSupabase.auth.admin.getUserById(receiver_user_id)
    const receiverEmail = receiverAuth?.user?.email

    const { data: proposerProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    if (receiverEmail) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
      await sendEmail('trade_received', receiverEmail, {
        proposer_name: proposerProfile?.username ?? 'Un collectionneur',
        receiver_item_title: receiverItem.title,
        proposer_item_title: proposerItem.title,
        cash_top_up: String(proposer_cash_top_up ?? 0),
        message: message ?? '',
        expires_at: new Date(expiresAt).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long',
        }),
        trade_url: `${baseUrl}/dashboard`,
      })
    }

    return NextResponse.json({ success: true, data: { id: proposal.id } })
  } catch (err: unknown) {
    console.error('[trade/propose]', err)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'envoi de la proposition.' },
      { status: 500 }
    )
  }
}
