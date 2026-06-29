import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSaleCheckoutSession } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 })
    }

    const { item_id } = await request.json()
    if (!item_id) {
      return NextResponse.json({ success: false, error: 'item_id requis.' }, { status: 400 })
    }

    // Fetch item with cover image
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*, cover:item_images(url)')
      .eq('id', item_id)
      .eq('status', 'available')
      .in('listing_type', ['sale', 'both'])
      .single()

    if (itemError || !item) {
      return NextResponse.json(
        { success: false, error: 'Objet introuvable ou non disponible à la vente.' },
        { status: 404 }
      )
    }

    if (!item.price_eur) {
      return NextResponse.json(
        { success: false, error: 'Cet objet n\'a pas de prix fixé.' },
        { status: 400 }
      )
    }

    // Prevent self-purchase
    if (item.seller_id === user.id) {
      return NextResponse.json(
        { success: false, error: 'Tu ne peux pas acheter ton propre objet.' },
        { status: 400 }
      )
    }

    const coverUrl = Array.isArray(item.cover) && item.cover.length > 0
      ? item.cover[0].url
      : null

    const checkoutUrl = await createSaleCheckoutSession({
      itemId: item.id,
      itemTitle: item.title,
      coverImageUrl: coverUrl,
      priceEur: item.price_eur,
      sellerId: item.seller_id,
      buyerId: user.id,
    })

    return NextResponse.json({ success: true, data: { url: checkoutUrl } })
  } catch (err: unknown) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du paiement.' },
      { status: 500 }
    )
  }
}
