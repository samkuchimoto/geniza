import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

// Vercel Cron: runs daily at 08:00 UTC
// Set in vercel.json: { "crons": [{ "path": "/api/cron/expire-trades", "schedule": "0 8 * * *" }] }
export async function GET(request: Request) {

  // Verify this is a Vercel Cron call (or internal)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!

  // Fetch all pending proposals that have expired
  const { data: expired, error } = await supabase
    .from('trade_proposals')
    .select(`
      id,
      proposer_id,
      receiver_id,
      proposer_item_id,
      receiver_item_id,
      proposer_item:items!proposer_item_id(title),
      receiver_item:items!receiver_item_id(title)
    `)
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())

  if (error) {
    console.error('[cron/expire-trades] Fetch error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ success: true, expired: 0 })
  }

  const expiredIds = expired.map((t: { id: string }) => t.id)
  const affectedItemIds = expired.flatMap((t: { proposer_item_id: string; receiver_item_id: string }) => [
    t.proposer_item_id,
    t.receiver_item_id,
  ])

  // Atomic: expire proposals + unlock items
  const [tradeRes, itemRes] = await Promise.all([
    supabase
      .from('trade_proposals')
      .update({ status: 'expired' })
      .in('id', expiredIds),
    supabase
      .from('items')
      .update({ status: 'available' })
      .in('id', affectedItemIds)
      .eq('status', 'in_trade'), // safety check — only unlock items that were locked
  ])

  if (tradeRes.error) console.error('[cron] Trade update error:', tradeRes.error)
  if (itemRes.error) console.error('[cron] Item update error:', itemRes.error)

  // Send expiry emails to all participants
  const emailPromises = expired.flatMap((trade: Record<string, unknown>) => {
    const emailData = {
      item_title: (trade.proposer_item as { title: string }).title,
      trade_url: `${baseUrl}/browse`,
    }
    return [
      supabase.auth.admin.getUserById(trade.proposer_id as string)
        .then(({ data }) => data?.user?.email
          ? sendEmail('trade_expired', data.user.email, emailData)
          : null
        )
        .catch(console.error),
      supabase.auth.admin.getUserById(trade.receiver_id as string)
        .then(({ data }) => data?.user?.email
          ? sendEmail('trade_expired', data.user.email, emailData)
          : null
        )
        .catch(console.error),
    ]
  })

  await Promise.allSettled(emailPromises)

  console.log(`[cron/expire-trades] Expired ${expired.length} proposals.`)
  return NextResponse.json({ success: true, expired: expired.length })
}
