// ── Item Status ───────────────────────────────────────────────────────────────
export type ItemStatus = 'draft' | 'available' | 'in_trade' | 'sold' | 'archived'

// ── Conditions — matches DB enum item_condition exactly ──────────────────────
export type Condition = 'excellent' | 'bon' | 'acceptable' | 'mauvais'

export const CONDITION_LABELS: Record<Condition, string> = {
  excellent:  'Excellent état',
  bon:        'Bon état',
  acceptable: 'État acceptable',
  mauvais:    'Mauvais état',
}

// ── Listing types — matches DB enum listing_type exactly ─────────────────────
export type ListingType = 'sale' | 'trade' | 'both'

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  sale:  'Vente',
  trade: 'Échange',
  both:  'Vente + Échange',
}

// ── Categories — matches DB enum item_category exactly ───────────────────────
export type Category = 'art' | 'antiques' | 'bd' | 'cards' | 'other'

export const CATEGORY_LABELS: Record<Category, string> = {
  art:      'Art',
  antiques: 'Antiquités',
  bd:       'BD & Mangas',
  cards:    'Cartes',
  other:    'Autres',
}

// ── Collector Score ───────────────────────────────────────────────────────────
export type CollectorTier = 'nouveau' | 'debutant' | 'actif' | 'confirme' | 'expert'

export const COLLECTOR_SCORE_LABEL: Record<CollectorTier, string> = {
  nouveau:  'Nouveau',
  debutant: 'Débutant',
  actif:    'Actif',
  confirme: 'Confirmé',
  expert:   'Expert',
}

export function getCollectorTier(score: number): CollectorTier {
  if (score >= 100) return 'expert'
  if (score >= 50)  return 'confirme'
  if (score >= 20)  return 'actif'
  if (score >= 5)   return 'debutant'
  return 'nouveau'
}

// ── Browse Filters ────────────────────────────────────────────────────────────
export interface BrowseFilters {
  category?:     Category | ''
  condition?:    Condition | ''
  listing_type?: ListingType | ''
  min_price?:    number | ''
  max_price?:    number | ''
  query?:        string
  trade_only?:   boolean
  page?:         number
}

// ── Seller preview (joined in browse query) ──────────────────────────────────
export interface SellerPreview {
  id:              string
  username:        string
  avatar_url:      string | null
  city:            string | null
  collector_score: number
}

// ── ItemWithCover — shape returned by the browse catalog query ───────────────
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

// ── Full item (DB row shape) ──────────────────────────────────────────────────
export interface Item {
  id:                string
  seller_id:         string
  title:             string
  description:       string | null
  category:          Category
  condition:         Condition
  price_eur:         number | null
  listing_type:      ListingType
  trade_cash_top_up: number | null
  provenance:        string | null
  status:            ItemStatus
  views:             number
  created_at:        string
  updated_at:        string
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

// ── Trade ─────────────────────────────────────────────────────────────────────
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

// ── Notifications ─────────────────────────────────────────────────────────────
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