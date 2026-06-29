# GENIZA

**Trust-first collector exchange. France first.**

Art, antiquités, bandes dessinées, cartes. Trade-first with optional cash. €200–€8000.

---

## Stack

| Layer | Service |
|---|---|
| Framework | Next.js 14 App Router |
| Database + Auth | Supabase |
| AI | Groq (llama-3.3-70b-versatile) |
| Email | Nodemailer + Gmail SMTP |
| Payments | Stripe |
| Deploy | Vercel |

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_ORG/geniza.git
cd geniza
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values. See `.env.local.example` for where to find each one.

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_BASE_URL`
- `CRON_SECRET` (any random string, used to authenticate cron calls)

### 3. Supabase setup

**A. Create project** at https://app.supabase.com

**B. Run main schema** — paste contents of `GENIZA_03_DATABASE_SCHEMA.md` into the SQL editor and run.

**C. Run RPC functions** — paste contents of `supabase-rpc-functions.sql` into the SQL editor and run.

**D. Enable Google OAuth** (optional but recommended):
- Supabase Dashboard → Authentication → Providers → Google
- Create OAuth credentials at https://console.cloud.google.com
- Add `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback` as redirect URI

**E. Enable email confirmations**:
- Supabase Dashboard → Authentication → Email → Enable email confirmations

### 4. Stripe setup

**A. Create account** at https://dashboard.stripe.com

**B. Get keys** from https://dashboard.stripe.com/apikeys (use test keys during development)

**C. Set up webhook** at https://dashboard.stripe.com/webhooks:
- Endpoint URL: `https://YOUR_VERCEL_URL/api/stripe/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
- Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 5. Gmail SMTP setup

**A.** Use a dedicated Gmail account (e.g. `geniza.exchange@gmail.com`)

**B.** Enable 2FA at https://myaccount.google.com/security

**C.** Create App Password at https://myaccount.google.com/apppasswords
- Select app: Mail
- Select device: Other (type "GENIZA")
- Copy the 16-character password to `GMAIL_APP_PASSWORD`

### 6. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### 7. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo at https://vercel.com/new and let Vercel auto-deploy on push to main.

Add all environment variables in Vercel Dashboard → Settings → Environment Variables.

Set `NEXT_PUBLIC_BASE_URL` to your production URL (e.g. `https://geniza.exchange`).

---

## File structure

```
geniza/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (main)/
│   │   ├── browse/
│   │   │   ├── BrowseClient.tsx
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardClient.tsx
│   │   │   └── page.tsx
│   │   ├── item/[id]/
│   │   │   ├── ImageGallery.tsx
│   │   │   ├── ItemActions.tsx
│   │   │   └── page.tsx
│   │   ├── list/page.tsx
│   │   ├── profile/[id]/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── ai/describe/route.ts
│   │   ├── cron/expire-trades/route.ts
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts
│   │   │   └── webhook/route.ts
│   │   └── trade/
│   │       ├── propose/route.ts
│   │       └── respond/route.ts
│   ├── auth/callback/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   └── page.tsx
├── components/
│   ├── CollectorScore.tsx
│   ├── ConditionBadge.tsx
│   ├── FilterBar.tsx
│   ├── ImageUploader.tsx
│   ├── ItemCard.tsx
│   ├── ItemCardSkeleton.tsx
│   ├── ItemGrid.tsx
│   ├── ListingForm.tsx
│   ├── Navbar.tsx
│   ├── Pagination.tsx
│   ├── SearchInput.tsx
│   ├── Toast.tsx
│   └── TradeProposalModal.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── email.ts
│   ├── groq.ts
│   └── stripe.ts
├── types/index.ts
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
├── vercel.json
└── .env.local.example
```

---

## Acceptance tests (run manually before launch)

### Auth
- [ ] Register with email → confirmation email arrives → click link → redirected to dashboard
- [ ] Register with Google → lands on dashboard, profile row created in Supabase
- [ ] Login → redirected to `?next=` destination
- [ ] Unauthenticated user visiting `/list` → redirected to `/login?next=/list`

### Listing
- [ ] Create listing with 2+ photos → item appears on `/browse`
- [ ] Create listing with 0 photos → publish blocked with error
- [ ] Click "Générer avec l'IA" → description populated (Groq call succeeds)
- [ ] List a trade-only item → price field hidden, "Échange uniquement" label on item card

### Browse
- [ ] Filter by category → grid updates, URL reflects filter
- [ ] Search "Moebius" → relevant items appear
- [ ] Enable "Échange uniquement" toggle → only trade items shown
- [ ] Reset filters → grid resets, URL cleaned

### Trade
- [ ] On item detail: "Proposer un échange" → modal opens
- [ ] Select your item → continue → confirm → success toast → receiver gets email
- [ ] Receiver visits dashboard → pending badge on Échanges tab
- [ ] Receiver accepts (no top-up) → both items locked, proposer emailed
- [ ] Receiver declines → trade declined, items remain available

### Cash sale
- [ ] Click "Acheter" → Stripe Checkout opens (test mode)
- [ ] Complete test payment (card 4242 4242 4242 4242) → redirect to item with success banner
- [ ] Item marked sold in Supabase → disappears from browse
- [ ] Seller receives sale_confirmed email

### Security
- [ ] Attempt to update another user's item via Supabase anon key → RLS blocks it
- [ ] Stripe webhook with invalid signature → 400 returned
- [ ] Cron endpoint without `CRON_SECRET` header → 401 returned

---

## Post-launch checklist

- [ ] Switch Stripe from test to live keys
- [ ] Set `NEXT_PUBLIC_BASE_URL` to production domain
- [ ] Enable Supabase point-in-time recovery
- [ ] Add 5 seed listings manually before first invite
- [ ] Configure custom domain on Vercel
- [ ] Add Vercel Analytics (free, 5 lines in layout.tsx)
