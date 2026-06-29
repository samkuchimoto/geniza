# GENIZA — Implementation Way B
## Staged Modular Build: Ship Stages, Not Features

**Philosophy:** Bezos working backwards. Each stage is a complete, shippable product. Stage 1 alone provides value. Stage 2 adds the differentiator. Stage 3 makes it defensible. A third-party builder can pause after any stage and hand off a working product.

This approach is slower than Way A but produces cleaner architecture, more testable code, and a cleaner handoff if multiple builders are involved.

---

## Difference from Way A

| Dimension | Way A (Lean Sprint) | Way B (Staged Modular) |
|---|---|---|
| Timeline | 4 weeks | 8 weeks |
| Risk | Ship fast, iterate | Lower regression risk |
| Trade system | Week 2 | Stage 2 (weeks 5-6) |
| Cash top-up | Not in MVP | Included in Stage 2 |
| Escrow | Honor system | Stripe escrow hold |
| Builder style | One person, sequential | Can split across 2 builders |
| Code structure | Feature-by-feature | Module-by-module |

---

## Stage 0 — Scaffolding (3 days)
**Output:** A deployed URL with auth working end-to-end.

Setup:
- Next.js 14 + Tailwind + TypeScript
- Supabase project: run full schema (File 03)
- All environment variables on Vercel
- Supabase auth working: email/password + profile auto-create trigger
- Nodemailer configured and tested with a real email send
- Stripe keys configured (no payment flow yet — just the keys)
- Vercel deployment live

Acceptance test: Register a user. Confirm profile row created in Supabase. Confirm welcome email arrives.

---

## Stage 1 — Public Catalog (Weeks 1-2)
**Output:** A browsable catalog. Any visitor can see items. Registered users can list.

### Scope
- Landing page (`/`)
- Browse page (`/browse`) with full-text search + filters
- Item detail page (`/item/[id]`) — read-only, no buy/trade CTAs yet
- Listing creation (`/list`) — auth-gated
- Profile page (`/profile/[id]`) — public, shows collection
- Dashboard (`/dashboard`) — My Listings tab only

### No Payments, No Trades Yet
At this stage, "Acheter" and "Proposer un échange" CTAs are visible but disabled with a tooltip: "Disponible bientôt — inscris-toi pour être notifié."

This is intentional. You can start building supply (listings) before the transaction layer exists.

### Key Components to Build
```
ItemCard.tsx          — image, title, price or "Échange", condition, city
ItemGrid.tsx          — responsive grid, skeleton loading
FilterBar.tsx         — category, condition, price range, trade-only toggle
SearchInput.tsx       — debounced, calls browse query
ListingForm.tsx       — photo upload + all fields + Groq AI assist
ConditionBadge.tsx    — visual badge: Excellent / Bon / Acceptable
ProfileHeader.tsx     — avatar, name, stats
CollectionGrid.tsx    — reuse ItemGrid with profile filter
```

### Groq Integration in Stage 1
Only one Groq call: `/api/ai/describe`
- Seller fills in title + category + condition
- Clicks "Générer une description"
- Groq returns title suggestion + description draft
- Seller edits before publishing — never auto-publish AI output

### Image Upload in Stage 1
Client-side compression first (target < 800KB per image):
```typescript
import imageCompression from 'browser-image-compression'
const compressed = await imageCompression(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1920 })
```
Then upload to Supabase Storage.

### Acceptance Tests for Stage 1
- [ ] Visitor browses without account
- [ ] Full-text search returns relevant results
- [ ] Category filter narrows results correctly
- [ ] User registers and creates a listing with 3 photos in under 5 minutes
- [ ] Item appears on browse page after publish
- [ ] Profile page shows all user's listed items
- [ ] Mobile layout works at 375px

---

## Stage 2 — Trade + Sale Engine (Weeks 3-5)
**Output:** Complete transaction layer. Collectors can buy or trade.

### Trade Proposal Flow (Full Version)
Unlike Way A, Stage 2 includes the **cash top-up** mechanic from day 1.

**Trade states:**
```
PENDING → (accept) → AWAITING_PAYMENT (if top-up > 0) → ACCEPTED → COMPLETED
         → (decline) → DECLINED
         → (7 days) → EXPIRED
```

**`TradeProposalModal.tsx`:**
1. Select your item from your collection (grid view)
2. Enter cash top-up amount (optional, default 0)
3. Add a note (optional)
4. Review: "Tu proposes [Item A] + €X contre [Item B]"
5. Confirm

**`/trade/[id]` page:**
Receiver sees:
- Side-by-side: "Tu donnes" vs "Tu reçois"
- If top-up > 0: "Tu reçois également €X via paiement sécurisé"
- Accept (→ triggers payment if top-up) / Decline / Counter-offer (v3)

### Stripe Integration (Full in Stage 2)

**Cash top-up on trade:**
```typescript
// When trade is accepted and top_up > 0:
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(topUpAmount * 100),
  currency: 'eur',
  metadata: { trade_id, proposer_id, receiver_id },
  capture_method: 'automatic'
})
// Store payment_intent_id on trade_proposals row
// Release: webhook on payment_intent.succeeded
```

**Cash sale:**
```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_intent_data: {
    metadata: { item_id, seller_id, buyer_id }
  },
  line_items: [{ price_data: { currency: 'eur', unit_amount: priceInCents, product_data: { name: title } }, quantity: 1 }],
  success_url: `${base}/item/${id}?paid=1`,
  cancel_url: `${base}/item/${id}`
})
```

**Platform fee handling:**
For MVP, record the 6% fee in the `transactions` table. Transfer to seller manually until Stripe Connect is configured. Add Stripe Connect in v2.

### Email Notifications (Full Set)
All via Nodemailer in `/lib/email.ts`:

```typescript
type EmailEvent =
  | 'trade_received'    // → receiver
  | 'trade_accepted'    // → proposer
  | 'trade_declined'    // → proposer
  | 'trade_expired'     // → both (cron)
  | 'sale_initiated'    // → seller (buyer started Stripe)
  | 'sale_confirmed'    // → seller (payment confirmed)
  | 'item_to_ship'      // → seller (reminder after 48h)
  | 'shipment_to_confirm'  // → buyer (seller marked shipped)

export async function sendEmail(event: EmailEvent, to: string, data: Record<string, string>) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
  })
  const template = getTemplate(event, data)
  await transporter.sendMail({ from: `GENIZA <${process.env.GMAIL_USER}>`, to, ...template })
}
```

### Cron: Expire Stale Trades
Vercel Cron (free, once per day):
```typescript
// /api/cron/expire-trades/route.ts
// Runs daily at 08:00
// UPDATE trade_proposals SET status = 'expired'
// WHERE status = 'pending' AND expires_at < NOW()
// Then: UPDATE items SET status = 'available' WHERE id IN (affected item ids)
// Then: send expiry emails to both parties
```

### Acceptance Tests for Stage 2
- [ ] Propose trade: select item, add €50 top-up, submit
- [ ] Receiver gets email with trade link
- [ ] Receiver accepts: Stripe payment triggered for top-up
- [ ] On payment success: both items locked, both parties emailed
- [ ] Receiver declines: items return to available
- [ ] Stale trade (manual test): set expires_at to past, run cron, verify expired
- [ ] Cash sale: buyer pays, item marked sold, seller emailed

---

## Stage 3 — Trust Layer (Weeks 6-8)
**Output:** GENIZA's defensible moat. The features no competitor has shipped in France.

### Collector Score
Not a star rating. A trust signal built from actions.

```typescript
// Recalculate after every completed trade or sale
async function recalculateCollectorScore(userId: string) {
  const { completed_trades, completed_sales } = await getStats(userId)
  // Formula: (trades * 3) + (sales * 2) + (account_age_months * 0.5)
  // Cap at 100
  const score = Math.min(100, (completed_trades * 3) + (completed_sales * 2))
  await supabase.from('profiles').update({ collector_score: score }).eq('id', userId)
}
```

Display: A number (0–100) + a label: Nouveau / Régulier / Expert / Élu.

### Dashboard: Full Version
All tabs active:
- My Listings (from Stage 1)
- Trade Proposals: incoming (Accept/Decline) + outgoing + completed history
- Purchases & Sales: full transaction history with status tracking
- Notifications: in-app notification bell (read from `notifications` table)

### Notification Bell
```typescript
// On dashboard load, fetch unread count
const { count } = await supabase
  .from('notifications')
  .select('id', { count: 'exact' })
  .eq('user_id', userId)
  .eq('read', false)

// Mark read on click
await supabase.from('notifications').update({ read: true }).eq('user_id', userId)
```

### Provenance Highlight
On item detail page: if `provenance` is filled, it gets its own styled section.
Label: "Provenance déclarée par le vendeur."
No verification — just surfacing. The seller's collector score lends it credibility.

### Condition Grading Guide
Modal accessible from listing form: 4-condition visual guide with photo examples per category.
- Excellent: no traces of use
- Bon: minor use traces, no defects affecting value
- Acceptable: visible use, intact
- Mauvais: significant wear, disclosed defects

This builds category expertise into the platform. Competitors do not have this.

### Acceptance Tests for Stage 3
- [ ] Complete a trade → seller score increases
- [ ] Score displays correctly on profile (Nouveau / Régulier / Expert)
- [ ] Notification bell shows unread count
- [ ] Notifications marked read on dashboard visit
- [ ] Provenance section renders on item detail when filled
- [ ] Condition guide modal opens from listing form

---

## Architecture Notes for the Builder

### Server vs Client Components
- Browse page: Server Component (SSR for SEO)
- Trade modal: Client Component (interactive)
- Dashboard: Client Component (tabs, real-time updates)
- Item detail: Server Component (SEO critical) + Client hydration for CTA buttons

### Data Fetching Pattern
Use Supabase server client in Server Components. Never use the anon client in server-side code.
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export function createClient() {
  const cookieStore = cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { get(name) { return cookieStore.get(name)?.value } }
  })
}
```

### Error Handling Convention
Every API route returns:
```typescript
{ success: true, data: T }       // success
{ success: false, error: string } // failure
```
Never return raw Supabase errors to the client.

### TypeScript Types
Define all types in `/types/index.ts`. Derive from database schema. Use `Database` type from Supabase generated types.
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```

---

## Handoff Checklist (Builder to Builder)

Before handing off at any stage:
- [ ] README with setup instructions (clone, env, `npm install`, `npm run dev`)
- [ ] Supabase schema migration file exported
- [ ] All env vars documented (without values)
- [ ] Vercel project with staging and production environments
- [ ] No hardcoded IDs, keys, or emails in source code
- [ ] RLS tested: confirm cross-user data access fails
- [ ] At least one end-to-end flow manually tested in production environment
