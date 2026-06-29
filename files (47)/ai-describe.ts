import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateItemDescription } from '@/lib/groq'
import type { GroqDescriptionRequest } from '@/types'

export async function POST(request: Request) {
  try {
    // Auth check — only logged-in users can generate descriptions
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non authentifié.' }, { status: 401 })
    }

    const body = await request.json() as Partial<GroqDescriptionRequest>

    if (!body.item_name || !body.category || !body.condition) {
      return NextResponse.json(
        { success: false, error: 'item_name, category et condition sont requis.' },
        { status: 400 }
      )
    }

    const result = await generateItemDescription({
      item_name: body.item_name,
      category: body.category,
      condition: body.condition,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (err: unknown) {
    console.error('[ai/describe]', err)
    return NextResponse.json(
      { success: false, error: 'La génération a échoué. Réessaie.' },
      { status: 500 }
    )
  }
}
