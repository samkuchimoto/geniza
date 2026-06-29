// ── Item Status ───────────────────────────────────────────────────────────────
export type ItemStatus = 'draft' | 'available' | 'in_trade' | 'sold' | 'archived'

// ── Conditions — must match DB enum item_condition exactly ───────────────────
export type Condition = 'excellent' | 'bon' | 'acceptable' | 'mauvais'

export const CONDITION_LABELS: Record<Condition, string> = {
  excellent:   'Excellent état',
  bon:         'Bon état',
  acceptable:  'État acceptable',
  mauvais:     'Mauvais état',
}

// ── Listing types — must match DB enum listing_type exactly ──────────────────
export type ListingType = 'sale' | 'trade' | 'both'

// ── Categories — must match DB enum item_category exactly ────────────────────
export type Category = 'art' | 'antiques' | 'bd' | 'cards' | 'other'

export const CATEGORY_LABELS: Record<Category, string> = {
  art:      'Art',
  antiques: 'Antiquités',
  bd:       'BD & Mangas',
  cards:    'Cartes',
  other:    'Autres',
}

// ── Seller preview (joined in browse query) ──────────────────────────────────
export interface SellerPreview {
  id:              string
  username:        string
  avatar_url:      string | null
  city:            string | null
  collector_score: number
}

// ── Full item (DB row shape) ──────────────────────────────────────────────────
export interface Item {
  id:                  string
  seller_id:           string
  title:               string
  description:         string | null
  category:            Category
  condition:           Condition
  price_eur:           number | null
  listing_type:        ListingType
  trade_cash_top_up:   number | null
  provenance:          string | null
  status:              ItemStatus
  views:               number
  created_at:          string
  updated_at:          string
}

// ── ItemWithCover — shape returned by the browse catalog query ───────────────
// Matches: SELECT i.*, p.username, p.collector_score, img.url AS cover_image
export interface ItemWithCover {
  id:           string
  title:        string
  category:     Category
  condition:    Condition
  listing_type: ListingType
  price_eur:    number | null
  cover_image:  string | null
  seller:       SellerPreview
}

// ── Trade types ───────────────────────────────────────────────────────────────
export type TradeStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'completed'
  | 'disputed'

export interface TradeProposal {
  id:                       string
  proposer_id:              string
  receiver_id:              string
  proposer_item_id:         string
  proposer_cash_top_up:     number
  receiver_item_id:         string
  status:                   TradeStatus
  message:                  string | null
  expires_at:               string
  stripe_payment_intent_id: string | null
  created_at:               string
  updated_at:               string
}

// ── Notification types ────────────────────────────────────────────────────────
export type NotificationType =
  | 'trade_received'
  | 'trade_accepted'
  | 'trade_declined'
  | 'sale_payment'
  | 'item_confirmed'
  | 'message_received'

export interface Notification {
  id:         string
  user_id:    string
  type:       NotificationType
  title:      string
  body:       string | null
  link:       string | null
  read:       boolean
  created_at: string
}

// ── Profile ───────────────────────────────────────────────────────────────────
export interface Profile {
  id:               string
  username:         string
  display_name:     string | null
  bio:              string | null
  city:             string | null
  avatar_url:       string | null
  collector_score:  number
  verified:         boolean
  completed_trades: number
  completed_sales:  number
  created_at:       string
}