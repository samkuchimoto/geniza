# GENIZA — Database Schema (Supabase / PostgreSQL)

---

## Tables Overview

```
users (extends auth.users)
items
item_images
trade_proposals
trade_items (junction)
transactions
messages
notifications
```

---

## SQL: Full Schema

```sql
-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  city TEXT,
  avatar_url TEXT,
  collector_score INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  completed_trades INTEGER DEFAULT 0,
  completed_sales INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are readable by everyone"
  ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);


-- ============================================================
-- ITEMS
-- ============================================================
CREATE TYPE item_status AS ENUM ('draft', 'available', 'in_trade', 'sold', 'archived');
CREATE TYPE item_condition AS ENUM ('excellent', 'bon', 'acceptable', 'mauvais');
CREATE TYPE item_category AS ENUM ('art', 'antiques', 'bd', 'cards', 'other');
CREATE TYPE listing_type AS ENUM ('sale', 'trade', 'both');

CREATE TABLE public.items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category item_category NOT NULL,
  condition item_condition NOT NULL,
  price_eur NUMERIC(10,2),              -- NULL if trade-only
  listing_type listing_type NOT NULL DEFAULT 'both',
  trade_cash_top_up NUMERIC(10,2),     -- max top-up willing to accept
  provenance TEXT,                      -- where / when / from whom
  status item_status NOT NULL DEFAULT 'draft',
  search_vector TSVECTOR,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX items_search_idx ON items USING GIN(search_vector);

-- Auto-update search vector
CREATE OR REPLACE FUNCTION update_item_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('french',
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.provenance, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_search_update
  BEFORE INSERT OR UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_item_search_vector();

-- RLS
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Available items readable by everyone"
  ON items FOR SELECT USING (status = 'available' OR seller_id = auth.uid());
CREATE POLICY "Sellers manage their own items"
  ON items FOR ALL USING (auth.uid() = seller_id);


-- ============================================================
-- ITEM IMAGES
-- ============================================================
CREATE TABLE public.item_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_cover BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.item_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Item images readable by everyone"
  ON item_images FOR SELECT USING (true);
CREATE POLICY "Item owner manages images"
  ON item_images FOR ALL USING (
    auth.uid() = (SELECT seller_id FROM items WHERE id = item_id)
  );


-- ============================================================
-- TRADE PROPOSALS
-- ============================================================
CREATE TYPE trade_status AS ENUM ('pending', 'accepted', 'declined', 'expired', 'completed', 'disputed');

CREATE TABLE public.trade_proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposer_id UUID REFERENCES public.profiles(id) NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) NOT NULL,

  -- What proposer offers
  proposer_item_id UUID REFERENCES public.items(id) NOT NULL,
  proposer_cash_top_up NUMERIC(10,2) DEFAULT 0,    -- proposer adds cash

  -- What proposer wants
  receiver_item_id UUID REFERENCES public.items(id) NOT NULL,

  -- State
  status trade_status NOT NULL DEFAULT 'pending',
  message TEXT,                                      -- optional note with proposal
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  -- Payment tracking
  stripe_payment_intent_id TEXT,                    -- for cash top-up if any

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trade_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trade participants can read proposals"
  ON trade_proposals FOR SELECT USING (
    auth.uid() = proposer_id OR auth.uid() = receiver_id
  );
CREATE POLICY "Proposer can create proposals"
  ON trade_proposals FOR INSERT WITH CHECK (auth.uid() = proposer_id);
CREATE POLICY "Participants can update proposals"
  ON trade_proposals FOR UPDATE USING (
    auth.uid() = proposer_id OR auth.uid() = receiver_id
  );


-- ============================================================
-- TRANSACTIONS (cash sales)
-- ============================================================
CREATE TYPE transaction_status AS ENUM ('pending', 'paid', 'shipped', 'confirmed', 'refunded', 'disputed');

CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES public.items(id) NOT NULL,
  seller_id UUID REFERENCES public.profiles(id) NOT NULL,
  buyer_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount_eur NUMERIC(10,2) NOT NULL,
  platform_fee_eur NUMERIC(10,2) NOT NULL,        -- 6% of amount
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  status transaction_status NOT NULL DEFAULT 'pending',
  shipped_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transaction participants can read"
  ON transactions FOR SELECT USING (
    auth.uid() = seller_id OR auth.uid() = buyer_id
  );


-- ============================================================
-- MESSAGES (trade/sale conversations)
-- ============================================================
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID REFERENCES public.trade_proposals(id),
  transaction_id UUID REFERENCES public.transactions(id),
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Message participants can read"
  ON messages FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );
CREATE POLICY "Sender can create messages"
  ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);


-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TYPE notification_type AS ENUM (
  'trade_received', 'trade_accepted', 'trade_declined',
  'sale_payment', 'item_confirmed', 'message_received'
);

CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System inserts notifications"
  ON notifications FOR INSERT WITH CHECK (true);    -- locked down at API level


-- ============================================================
-- PROFILE AUTO-CREATE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTR(NEW.id::TEXT, 1, 4),
    SPLIT_PART(NEW.email, '@', 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Key Query Patterns

### Browse catalog with filters
```sql
SELECT i.*, p.username, p.collector_score, img.url AS cover_image
FROM items i
JOIN profiles p ON i.seller_id = p.id
LEFT JOIN item_images img ON img.item_id = i.id AND img.is_cover = true
WHERE i.status = 'available'
  AND ($1::item_category IS NULL OR i.category = $1)
  AND ($2::item_condition IS NULL OR i.condition = $2)
  AND ($3::NUMERIC IS NULL OR i.price_eur >= $3)
  AND ($4::NUMERIC IS NULL OR i.price_eur <= $4)
  AND ($5::BOOLEAN IS FALSE OR i.listing_type IN ('trade', 'both'))
  AND ($6::TEXT IS NULL OR i.search_vector @@ plainto_tsquery('french', $6))
ORDER BY i.created_at DESC
LIMIT 24 OFFSET $7;
```

### Lock both items when trade is accepted (atomic)
```sql
BEGIN;
UPDATE items SET status = 'in_trade' WHERE id = $1 OR id = $2;
UPDATE trade_proposals SET status = 'accepted' WHERE id = $3;
COMMIT;
```

### Collector profile with collection
```sql
SELECT i.*, img.url AS cover_image
FROM items i
LEFT JOIN item_images img ON img.item_id = i.id AND img.is_cover = true
WHERE i.seller_id = $1
  AND i.status IN ('available', 'in_trade')
ORDER BY i.created_at DESC;
```
