# GENIZA — Tech Stack and Architecture

---

## Stack Decision (Final, Non-Negotiable)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 App Router | SSR for SEO on listings, familiar to builder |
| Database | Supabase (PostgreSQL) | Auth + DB + Storage + RLS in one free tier |
| AI | Groq API (llama-3.3-70b-versatile) | Free tier, fast, description generation |
| Hosting | Vercel | Free tier, instant deploy, edge functions |
| Email | Nodemailer + Gmail SMTP | Free, proven, no single-address restriction |
| Payments | Stripe | Free to integrate, pay-per-transaction only |
| Image Storage | Supabase Storage | Free tier 1GB, built-in CDN |
| Search | Supabase full-text search (tsvector) | Free, good enough for MVP |

---

## What Each Service Does in GENIZA

### Supabase
- **Auth:** Email/password + Google OAuth. Row Level Security on every table.
- **Database:** All entities (users, items, trades, transactions, messages).
- **Storage:** Item photos. Bucket: `item-images`. Public read, authenticated write.
- **Realtime:** Optional at launch. Use for trade proposal status updates.

### Groq API
- **Description assistant:** Seller uploads photos + enters basic item name. Groq returns a structured description draft (titre, état, provenance suggestion, points à vérifier).
- **Category suggestion:** From item name, suggest the right category.
- Model: `llama-3.3-70b-versatile`. Temperature: 0.3 for factual output.

### Nodemailer + Gmail SMTP
- **Transactional emails:** Trade proposal received, offer accepted, escrow triggered, payment confirmed.
- Setup: App password on a dedicated Gmail account (geniza.exchange@gmail.com or similar). Store credentials in Vercel env vars.
- Rate: Gmail free SMTP allows ~500 emails/day. Sufficient for MVP.

### Stripe
- **Cash sales:** Stripe Checkout. Seller receives payout minus 6% platform fee via Stripe Connect.
- **Trade + cash top-up:** Stripe PaymentIntent for the cash portion only.
- **Escrow simulation at MVP:** Hold funds in Stripe, release on buyer confirmation. Full Stripe Connect Escrow in v2.

---

## Environment Variables (All Required)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Groq
GROQ_API_KEY=

# Email (Gmail SMTP)
GMAIL_USER=
GMAIL_APP_PASSWORD=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## Folder Structure

```
geniza/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (main)/
│   │   ├── browse/page.tsx          # Main catalog
│   │   ├── item/[id]/page.tsx       # Item detail
│   │   ├── list/page.tsx            # Create listing
│   │   ├── profile/[id]/page.tsx    # Collector profile = collection
│   │   ├── trade/[id]/page.tsx      # Trade proposal view
│   │   └── dashboard/page.tsx       # My items, trades, messages
│   ├── api/
│   │   ├── ai/describe/route.ts     # Groq description generation
│   │   ├── email/route.ts           # Nodemailer send
│   │   ├── stripe/webhook/route.ts  # Stripe events
│   │   └── trade/propose/route.ts   # Trade proposal logic
│   ├── layout.tsx
│   └── page.tsx                     # Landing / hero
├── components/
│   ├── ItemCard.tsx
│   ├── ItemGrid.tsx
│   ├── TradeProposalModal.tsx
│   ├── ListingForm.tsx
│   ├── ConditionBadge.tsx
│   └── CollectorScore.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── groq.ts
│   ├── email.ts
│   └── stripe.ts
└── types/
    └── index.ts
```

---

## Key Architecture Decisions

### Trade Proposal: Atomic Pattern
A trade proposal has exactly two states at any moment: PENDING or RESOLVED (accepted / declined / expired).

```
propose() → status: PENDING
  → notify both parties by email
accept() → status: ACCEPTED → trigger escrow
  → both items locked (status: IN_TRADE)
  → Stripe PaymentIntent created if cash top-up > 0
decline() → status: DECLINED
  → both items unlocked
expire() → cron at 7 days → status: EXPIRED
  → both items unlocked
```

Never release an item from a trade without resolving the payment. Atomic update: items + trade record in one Supabase transaction.

### Row Level Security
Every table has RLS. Default deny. Explicit policies only.

- Items: public read if `status = available`. Write own only.
- Trades: read if `proposer_id = auth.uid()` OR `receiver_id = auth.uid()`. Write own only.
- Messages: read if participant. Write own only.

### Image Upload Flow
1. Client gets signed upload URL from Supabase Storage (via API route, not client-side to avoid exposing service key).
2. Client uploads directly to Supabase Storage.
3. API route saves the public URL to `item_images` table.
4. Max 8 images per item. Min 2 required to publish.

### Groq Description Generation
```typescript
// POST /api/ai/describe
// Body: { itemName: string, category: string, condition: string }
// Returns: { title: string, description: string, keywords: string[] }

const prompt = `
Tu es un expert en brocante et objets de collection.
L'utilisateur décrit un objet: "${itemName}", catégorie: "${category}", état: "${condition}".
Génère une description de vente en français:
- Titre accrocheur (max 60 caractères)
- Description factuelle (100-150 mots)
- 3 à 5 mots-clés de recherche
Réponds uniquement en JSON valide. Aucun markdown.
Format: { "titre": "", "description": "", "keywords": [] }
`
```

---

## Search Architecture (MVP)

Supabase full-text search on `items` table. Add `tsvector` column on `(title || ' ' || description || ' ' || category)`.

Filter params: category, condition, price_min, price_max, trade_only (boolean), location (city).

No external search service at MVP. Supabase handles this well under 50,000 items.

---

## Free Tier Limits to Watch

| Service | Free Limit | Risk |
|---|---|---|
| Supabase | 500MB DB, 1GB storage, 50,000 MAU | Storage fills first — compress images client-side before upload |
| Vercel | 100GB bandwidth, 100 serverless invocations/day | Fine for MVP |
| Groq | 6,000 req/day on free tier | Only call on listing creation, not browsing |
| Gmail SMTP | ~500 emails/day | Fine for MVP — upgrade to Brevo free (300/day) if needed as backup |
| Stripe | No monthly fee — 1.5% + 0.25€ per transaction | This is the cost of doing business. Pass through to fee structure. |
