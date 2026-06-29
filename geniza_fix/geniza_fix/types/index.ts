// ============================================================
// GENIZA — Core TypeScript Types
// ============================================================

// --- Enums (mirror database enums) ---------------------------

export type ItemStatus = 'draft' | 'available' | 'in_trade' | 'sold' | 'archived'
export type ItemCondition = 'excellent' | 'bon' | 'acceptable' | 'mauvais'
export type ItemCategory = 'art' | 'antiques' | 'bd' | 'cards' | 'other'
export type ListingType = 'sale' | 'trade' | 'both'
export type TradeStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'completed' | 'disputed'
export type TransactionStatus = 'pending' | 'paid' | 'shipped' | 'confirmed' | 'refunded' | 'disputed'
export type NotificationType =
  | 'trade_received'
  | 'trade_accepted'
  | 'trade_declined'
  | 'sale_payment'
  | 'item_confirmed'
  | 'message_received'

// --- Database row types --------------------------------------

export interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  city: string | null
  avatar_url: string | null
  collector_score: number
  verified: boolean
  completed_trades: number
  completed_sales: number
  created_at: string
}

export interface Item {
  id: string
  seller_id: string
  title: string
  description: string | null
  category: ItemCategory
  condition: ItemCondition
  price_eur: number | null
  listing_type: ListingType
  trade_cash_top_up: number | null
  provenance: string | null
  status: ItemStatus
  views: number
  created_at: string
  updated_at: string
}

export interface ItemImage {
  id: string
  item_id: string
  url: string
  sort_order: number
  is_cover: boolean
  created_at: string
}

export interface TradeProposal {
  id: string
  proposer_id: string
  receiver_id: string
  proposer_item_id: string
  proposer_cash_top_up: number
  receiver_item_id: string
  status: TradeStatus
  message: string | null
  expires_at: string
  stripe_payment_intent_id: string | null
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  item_id: string
  seller_id: string
  buyer_id: string
  amount_eur: number
  platform_fee_eur: number
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  status: TransactionStatus
  shipped_at: string | null
  confirmed_at: string | null
  created_at: string
}

export interface Message {
  id: string
  trade_id: string | null
  transaction_id: string | null
  sender_id: string
  receiver_id: string
  body: string
  read: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

// --- Joined / enriched types --------------------------------

/** Item with cover image URL and seller summary — used in browse/grid */
export interface ItemWithCover extends Item {
  cover_image: string | null
  seller: Pick<Profile, 'id' | 'username' | 'collector_score' | 'city' | 'avatar_url'>
}

/** Full item detail — used on /item/[id] */
export interface ItemDetail extends Item {
  images: ItemImage[]
  seller: Profile
}

/** Trade proposal with both items and profiles joined */
export interface TradeProposalDetail extends TradeProposal {
  proposer: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'collector_score'>
  receiver: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'collector_score'>
  proposer_item: ItemWithCover
  receiver_item: ItemWithCover
}

// --- API response types -------------------------------------

export interface ApiResponse<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
}

export type ApiResult<T> = ApiResponse<T> | ApiError

// --- Form / input types -------------------------------------

export interface ListingFormData {
  title: string
  description: string
  category: ItemCategory
  condition: ItemCondition
  listing_type: ListingType
  price_eur: string            // string from input, parsed before submit
  provenance: string
  images: File[]               // client-side, before upload
}

export interface TradeProposalFormData {
  proposer_item_id: string
  proposer_cash_top_up: string // string from input
  message: string
}

// --- Browse / filter types ----------------------------------

export interface BrowseFilters {
  search: string
  category: ItemCategory | ''
  condition: ItemCondition | ''
  price_min: string
  price_max: string
  trade_only: boolean
  page: number
}

// --- Groq AI assist types -----------------------------------

export interface GroqDescriptionRequest {
  item_name: string
  category: ItemCategory
  condition: ItemCondition
}

export interface GroqDescriptionResponse {
  titre: string
  description: string
  keywords: string[]
}

// --- Email types --------------------------------------------

export type EmailEvent =
  | 'trade_received'
  | 'trade_accepted'
  | 'trade_declined'
  | 'trade_expired'
  | 'sale_confirmed'
  | 'item_to_ship'
  | 'shipment_to_confirm'

export interface EmailPayload {
  to: string
  event: EmailEvent
  data: Record<string, string>
}

// --- Condition display helpers ------------------------------

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  excellent: 'Excellent',
  bon: 'Bon',
  acceptable: 'Acceptable',
  mauvais: 'Mauvais',
}

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  art: 'Art',
  antiques: 'Antiquités',
  bd: 'Bandes dessinées',
  cards: 'Cartes',
  other: 'Autre',
}

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  sale: 'Vente uniquement',
  trade: 'Échange uniquement',
  both: 'Vente ou échange',
}

export const COLLECTOR_SCORE_LABEL = (score: number): string => {
  if (score >= 80) return 'Élu'
  if (score >= 50) return 'Expert'
  if (score >= 20) return 'Régulier'
  return 'Nouveau'
}
