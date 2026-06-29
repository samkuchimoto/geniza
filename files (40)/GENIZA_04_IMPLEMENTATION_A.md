# GENIZA — Implementation Way A
## The Lean Sprint: Ship in 4 Weeks

**Philosophy:** Musk's first principle. Remove everything that isn't the core loop. The core loop is: list an item, browse items, make a trade or buy. Nothing else ships in Week 1 or 2.

---

## What This Approach Optimizes For

- Fastest path to a working URL
- Validate core mechanic before building trust features
- Zero over-engineering: no complex state, no animation, no feature flags
- Builder works sequentially, one feature per day

---

## Week 1 — Foundation + Listings

### Day 1: Project Setup
```bash
npx create-next-app@latest geniza --typescript --tailwind --app
```
- Configure Supabase: run full schema from File 03
- Set all environment variables in `.env.local`
- Deploy empty app to Vercel. CI/CD from day 1.
- Confirm: Supabase connection works, auth.users trigger fires

### Day 2: Auth
- `/login` and `/register` pages
- Supabase email/password auth
- Google OAuth (optional — add if < 2 hours of work)
- Redirect to `/dashboard` on login
- `middleware.ts` protects `/list`, `/dashboard`, `/trade` routes

### Day 3: Listing Form
Route: `/list`
Steps (one page, progressive reveal — NOT multi-step wizard):
1. Upload photos (min 2, max 8) — drag-drop using Supabase Storage signed URL
2. Title + category dropdown
3. Condition selector (4 options, visual cards not a dropdown)
4. Listing type: Sale / Trade / Both — radio buttons, NOT hidden
5. Price field (appears if Sale or Both selected)
6. Description (free text OR click "Generate with AI" — calls `/api/ai/describe`)
7. Publish button

On submit: insert into `items`, insert into `item_images`, redirect to item page.

### Day 4: Item Detail Page
Route: `/item/[id]`
- Photo gallery (full-width, swipeable)
- Title, condition badge, category, price
- Seller block: avatar, username, collector score (0 at MVP), link to their profile
- Two CTAs visible at all times:
  - **Acheter** (if listing_type includes 'sale')
  - **Proposer un échange** (always visible — opens modal)
- Provenance block (if filled)
- Description

### Day 5: Browse Page
Route: `/browse`
- Grid of ItemCard components (cover image, title, price or "Échange", condition badge, seller city)
- Filter bar: Category, Condition, Price range, Trade only toggle
- Full-text search input at top
- Infinite scroll OR pagination (pagination simpler — use pagination)
- No sorting at MVP. Default: newest first.

---

## Week 2 — Trade Proposal + Profile

### Day 6: Trade Proposal Modal
Component: `TradeProposalModal.tsx`
Triggered from item detail page "Proposer un échange" CTA.

Flow:
1. "Quel objet proposes-tu en échange?" — show a grid of the logged-in user's available items (fetched from Supabase)
2. Select one item
3. Optional: "Ajouter un complément en cash (€)" — numeric input
4. Optional message (150 chars max)
5. Confirm button

On submit:
- Insert into `trade_proposals`
- Set both items to `status: in_trade` — NO, not yet. Keep available until accepted.
- Send email to receiver via `/api/email`
- Show success toast: "Proposition envoyée. Tu seras notifié par email."

### Day 7: Trade Proposal Page
Route: `/trade/[id]`
Only visible to proposer and receiver.

Two states:

**PENDING (receiver view):**
- What they're being offered (proposer's item + any cash)
- What they'd give up (their item)
- Accept button / Decline button
- On Accept:
  - Both items set to `in_trade`
  - If cash top-up > 0: redirect to Stripe Checkout
  - If cash top-up = 0: trade marked as `completed` immediately (honor system at MVP, escrow in v2)
  - Email both parties

**COMPLETED:**
- Exchange summary: who gave what
- Both items marked `sold` after confirmation

### Day 8: Profile Page
Route: `/profile/[id]`
- Avatar (initials fallback), display name, city, bio
- Collection grid: all their available items
- Stats: items listed, completed trades, completed sales
- No following, no feed, no social features at MVP. The collection IS the page.

### Day 9: Dashboard
Route: `/dashboard`
Tabs: My Listings / Trade Proposals / Purchases & Sales

- My Listings: list of own items, status badge, Edit / Archive actions
- Trade Proposals: incoming (action required) + outgoing (waiting) + history
- Purchases & Sales: transaction history

### Day 10: Email Notifications
`/lib/email.ts` using Nodemailer:

Emails to send:
- Trade proposal received (to receiver)
- Trade proposal accepted (to proposer)
- Trade proposal declined (to proposer)
- Sale payment confirmed (to seller)
- Item shipping confirmation needed (to buyer, post-payment)

All emails: plain HTML, no heavy template. GENIZA name, what happened, one link, done.

---

## Week 3 — Cash Sales + Polish

### Day 11: Stripe Cash Sale
- Seller sets price on listing
- Buyer clicks "Acheter" on item detail
- Redirect to Stripe Checkout
- On success webhook: mark item `sold`, create transaction record, email seller
- On refund/dispute: webhook handles, mark disputed

```typescript
// /api/stripe/checkout/route.ts
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{
    price_data: {
      currency: 'eur',
      unit_amount: Math.round(item.price_eur * 100),
      product_data: { name: item.title, images: [coverImageUrl] }
    },
    quantity: 1
  }],
  metadata: { item_id, seller_id, buyer_id },
  success_url: `${baseUrl}/item/${item_id}?sale=success`,
  cancel_url: `${baseUrl}/item/${item_id}`
})
```

Platform fee (6%): Use Stripe application_fee_amount or deduct manually. For MVP, manual deduction in records is fine.

### Day 12-13: Landing Page
Route: `/`

Three sections only:

**Hero:**
Headline: "Échange ou vends ta collection."
Sub: "Le seul marché pensé pour les vrais collectionneurs. Art, antiquités, BD, cartes. France."
CTA: "Voir les objets" → `/browse` (no account required to browse)
Secondary CTA: "Lister un objet" → `/register`

**How it works (3 steps):**
1. Liste ce que tu possèdes
2. Propose un échange ou fixe un prix
3. Finalise en sécurité

**Categories:**
4 category cards with a photo each. Click goes to `/browse?category=X`

No testimonials. No press logos. No stats (you have none yet). No newsletter signup.

### Day 14: Mobile + Error States
- All pages responsive. Tailwind breakpoints. Test on 375px width.
- Empty states: no items in browse ("Aucun résultat. Modifie tes filtres."), no proposals in dashboard ("Aucune proposition pour l'instant.")
- Error states: upload failed, network error on submit, Stripe failure
- 404 page
- Loading skeletons on browse and profile

---

## Week 4 — QA, Hardening, Launch

### Day 15-16: End-to-End Testing
Test these exact flows manually:
1. Register → List item (with photos) → Publish
2. Browse → Find item → Propose trade → Receive email → Accept → Both items locked
3. Register → Browse → Buy item → Stripe Checkout → Payment confirms → Item sold → Seller emailed
4. Decline trade → Items unlocked → Available again

### Day 17: Security Review
- All routes behind auth checked (test with unauthenticated request)
- RLS: attempt to update another user's item via direct Supabase call — should fail
- Stripe webhook: verify `stripe-signature` header
- Environment variables: none exposed client-side except NEXT_PUBLIC_ ones

### Day 18-19: Performance
- Images: compress client-side before upload (use `browser-image-compression` npm package)
- Browse page: add `cache: 'no-store'` only where needed, use Supabase server client for SSR
- Vercel: confirm cold starts < 500ms

### Day 20: Launch Prep
- Custom domain if available
- Google Analytics or Vercel Analytics (free) — add 5 lines, done
- Supabase backups: enable point-in-time recovery
- Write 5 seed listings manually in the admin (you need items before invite)

---

## Deliverable at Week 4

A working URL where a collector can:
- Browse objects without an account
- Register and list an object with photos in under 5 minutes
- Propose a trade and receive an email confirmation
- Buy an object with a card via Stripe

Total code: approximately 2,500-3,500 lines across all files. No bloat.

---

## What Is Explicitly NOT Built in Way A

- Collector score algorithm (placeholder 0)
- Escrow (honor system at MVP)
- Cash top-up on trades (only cash-free trades or full cash sales)
- Authentication badge / verification
- Search autocomplete
- Saved searches
- Mobile app
- Admin dashboard

All of the above are v2. Validate the trade mechanic first.
