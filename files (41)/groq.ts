import Groq from 'groq-sdk'
import type { GroqDescriptionRequest, GroqDescriptionResponse, ItemCategory, ItemCondition } from '@/types'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

const CONDITION_FR: Record<ItemCondition, string> = {
  excellent: 'excellent — aucune trace d\'usure visible',
  bon: 'bon — quelques légères traces d\'usure',
  acceptable: 'acceptable — traces d\'usure visibles, intégrité conservée',
  mauvais: 'mauvais — usure significative ou défauts déclarés',
}

const CATEGORY_FR: Record<ItemCategory, string> = {
  art: 'art (estampe, lithographie, sérigraphie, oeuvre originale)',
  antiques: 'antiquité ou objet de collection (brocante, numismatique, vintage)',
  bd: 'bande dessinée ou illustration (album, planche originale, édition signée)',
  cards: 'carte de collection (Pokémon, cartes sportives, vintage)',
  other: 'autre objet de collection',
}

export async function generateItemDescription(
  req: GroqDescriptionRequest
): Promise<GroqDescriptionResponse> {
  const prompt = `Tu es un expert en objets de collection et en rédaction de fiches de vente pour collectionneurs sérieux.

L'objet: "${req.item_name}"
Catégorie: ${CATEGORY_FR[req.category]}
État: ${CONDITION_FR[req.condition]}

Génère une fiche de vente en français, factuelle et professionnelle, adaptée à un marché de collectionneurs exigeants.

Règles:
- Le titre doit être précis et accrocheur, 5 à 10 mots maximum
- La description doit être factuelle, 80 à 120 mots, sans superlatifs inutiles
- Mentionne l'état de manière naturelle dans la description
- Les mots-clés doivent aider à trouver l'objet dans une recherche
- Aucun markdown, aucun caractère spécial inutile

Réponds UNIQUEMENT avec un objet JSON valide, sans backticks, sans preamble:
{"titre": "...", "description": "...", "keywords": ["...", "...", "..."]}`

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 400,
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'

  // Strip markdown code fences if model added them despite instructions
  const cleaned = raw.replace(/```json|```/g, '').trim()

  const parsed = JSON.parse(cleaned) as GroqDescriptionResponse

  return {
    titre: parsed.titre ?? '',
    description: parsed.description ?? '',
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
  }
}
