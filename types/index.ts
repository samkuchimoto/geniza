// ─── Enums / Union Types ────────────────────────────────────────────────────

export type Category =
  | 'art'
  | 'antiquites'
  | 'bd'
  | 'cartes'
  | 'livres'
  | 'monnaies'
  | 'timbres'
  | 'autre'
  | ''

export type Condition =
  | 'neuf'
  | 'tres_bon'
  | 'bon'
  | 'acceptable'
  | 'mediocre'
  | ''

export type ListingType = 'sale' | 'trade' | 'both'

export type ItemStatus = 'available' | 'reserved' | 'sold'

// ─── Database Shapes ─────────────────────────────────────────────────────────

export interface Profile {
  id: string
  username: string
  collector_score: number
  city: string | null
  avatar_url: string | null
}

export interface Item {
  id: string
  seller_id: string
  title: string
  description: string | null
  category: Category
  condition: Condition
  price_eur: number | null
  listing_type: ListingType
  status: ItemStatus
  created_at: string
  updated_at: string
}

export interface ItemImage {
  id: string
  item_id: string
  url: string
  is_cover: boolean
  position: number
}

// ─── Joined / Derived Types ───────────────────────────────────────────────────

export interface ItemWithCover extends Item {
  seller: Profile
  cover_image: string | null
}

// ─── Filter / Query Types ─────────────────────────────────────────────────────

export interface BrowseFilters {
  query: string
  category: Category | ''
  condition: Condition | ''
  min_price: number | ''
  max_price: number | ''
  trade_only: boolean
  page: number
}