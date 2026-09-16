/** Shapes returned by the Laravel API (see dha-guj-api app/Http/Resources). */

export type Resource<T> = { data: T };

export type Collection<T> = { data: T[] };

export type Paginated<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export type QuotaItemType = "credit" | "concurrent" | "per_entity" | "boolean" | "duration";
export type ResetPeriod = "none" | "monthly" | "yearly";
export type OfferAudience = "individual" | "agency" | "both";
export type OfferStatus = "active" | "inactive" | "archived";
export type OfferVisibility = "public" | "hidden";
export type AccountType = "individual" | "agency" | "agent";
export type AccountStatus = "active" | "suspended";
export type SubscriptionStatus = "pending" | "active" | "expired" | "cancelled" | "suspended";
export type SubscriptionSource = "purchase" | "admin_assigned" | "free" | "trial";
export type QuotaAction = "consume" | "refund" | "adjust" | "reset" | "expire";
export type PropertyPurpose = "sale" | "rent";
export type PropertyCategory = "residential" | "plot" | "commercial";
export type PropertyStatus = "draft" | "pending" | "published" | "rejected" | "changes_requested" | "expired" | "sold" | "rented";
export type AreaUnit = "marla" | "kanal" | "sq_ft" | "sq_yd" | "sq_m";
export type MediaType = "image" | "video";
export type FurnishedStatus = "unfurnished" | "semi_furnished" | "furnished";
export type LeadStatus = "new" | "contacted" | "interested" | "closed" | "lost";

export type User = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  account_type: AccountType;
  status: AccountStatus;
  agency?: { id: number; name: string } | null;
  listings_count?: number;
  leads_count?: number;
  created_at: string;
};

export type QuotaItem = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  type: QuotaItemType;
  unit_label: string | null;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
};

export type OfferItem = {
  id: number;
  quota_item?: QuotaItem;
  limit_value: number;
  is_unlimited: boolean;
  reset_period: ResetPeriod;
  carry_forward: boolean;
  show_on_pricing: boolean;
};

export type Offer = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  audience: OfferAudience;
  price: string;
  sale_price: string | null;
  current_price: string;
  is_on_sale: boolean;
  duration_days: number | null;
  is_free: boolean;
  is_default: boolean;
  is_addon: boolean;
  badge_text: string | null;
  badge_color: string | null;
  items?: OfferItem[];
};

export type QuotaSummary = {
  code: string;
  name: string;
  type: QuotaItemType;
  unit_label: string | null;
  total: number;
  used: number;
  remaining: number | null;
  is_unlimited: boolean;
  expires_at: string | null;
};

export type SubscriptionQuota = {
  id: number;
  quota_item?: QuotaItem;
  total: number;
  used: number;
  remaining: number | null;
  is_unlimited: boolean;
  reset_period: ResetPeriod;
  period_starts_at: string | null;
  period_ends_at: string | null;
};

export type Subscription = {
  id: number;
  offer_snapshot: { name?: string; price?: string; duration_days?: number | null } & Record<string, unknown>;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  starts_at: string | null;
  ends_at: string | null;
  cancelled_at: string | null;
  quotas?: SubscriptionQuota[];
  created_at: string;
};

export type City = { id: number; name: string; slug: string };
export type Phase = { id: number; society_id: number; name: string; slug: string; is_active: boolean; sort_order: number };
export type Block = { id: number; phase_id: number; name: string; slug: string; is_active: boolean; sort_order: number };
export type Society = { id: number; city_id: number; name: string; slug: string };
export type PropertyType = { id: number; category: PropertyCategory; name: string; slug: string };
export type Amenity = { id: number; name: string; slug: string; icon: string | null };

export type PropertyMedia = {
  id: number;
  type: MediaType;
  /** Original upload (or the video link). */
  url: string;
  /** ≈480px WebP for lists and cards; the original until the background job has run. */
  thumbnail_url?: string | null;
  /** ≈1280px WebP for larger previews; the original until the background job has run. */
  medium_url?: string | null;
  sort_order: number;
  is_cover: boolean;
};

export type Property = {
  id: number;
  slug: string;
  status: PropertyStatus;
  purpose: PropertyPurpose;
  title: string;
  description: string;
  price: string;
  is_negotiable: boolean;
  installment_available: boolean;
  advance_amount: string | null;
  monthly_installment: string | null;
  installments_count: number | null;
  area_size: string;
  area_unit: AreaUnit;
  property_type?: PropertyType;
  city?: City;
  society?: Society | null;
  phase: string | null;
  block: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floors: number | null;
  year_built: number | null;
  furnished: FurnishedStatus | null;
  plot_number: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  amenities?: Amenity[];
  media?: PropertyMedia[];
  rejection_reason: string | null;
  is_featured: boolean;
  featured_until: string | null;
  is_hot?: boolean;
  hot_until?: string | null;
  submitted_at: string | null;
  published_at: string | null;
  expires_at: string | null;
  refreshed_at: string | null;
  closed_at: string | null;
  views_count: number;
  phone_clicks: number;
  whatsapp_clicks: number;
  leads_count?: number;
  owner?: User;
  created_at: string;
  updated_at: string;
};

export type Lead = {
  id: number;
  property?: { id: number; title: string; slug: string; status: PropertyStatus };
  name: string;
  phone: string;
  email: string | null;
  message: string;
  status: LeadStatus;
  notes: string | null;
  contacted_at: string | null;
  owner?: User;
  assigned_to?: { id: number; name: string } | null;
  assigned_at?: string | null;
  created_at: string;
};

export type OrderStatus = "pending_payment" | "awaiting_approval" | "paid" | "cancelled" | "refunded";
export type PaymentStatus = "pending" | "approved" | "rejected";

export type Payment = {
  id: number;
  method: "bank_transfer";
  amount: string;
  reference: string;
  paid_on: string | null;
  status: PaymentStatus;
  rejection_reason: string | null;
  receipt_name: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type Order = {
  id: number;
  order_no: string;
  invoice_no: string | null;
  offer?: { id: number; name: string; slug: string; is_addon: boolean; duration_days: number | null };
  offer_name: string;
  list_price: string | null;
  discount_amount: string;
  coupon_code: string | null;
  subtotal: string;
  tax_percent: string;
  tax_amount: string;
  total: string;
  currency: string;
  status: OrderStatus;
  payment_method: "bank_transfer";
  paid_at: string | null;
  cancelled_at: string | null;
  subscription_id: number | null;
  payments?: Payment[];
  latest_payment?: Payment | null;
  user?: User;
  created_at: string;
};

export type BankTransferDetails = {
  bank_name: string;
  account_title: string;
  account_number: string;
  iban: string;
  instructions: string;
};

export type InvoiceSeller = {
  seller_name: string;
  seller_address: string;
  seller_email: string;
  seller_phone: string | null;
  tax_number: string | null;
};

/** An order response with the bank account to pay into (and seller details when viewing one order). */
export type OrderWithBank = { data: Order; bank_transfer: BankTransferDetails; seller?: InvoiceSeller };

export type AgencyProfile = {
  id: number | null;
  slug: string | null;
  name: string;
  about: string | null;
  logo_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city?: City | null;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string | null;
};

export type AgentSeats = { used: number; limit: number | null };

export type AgentsResponse = { data: User[]; seats: AgentSeats };

/** GET /portal/dashboard — an agency sees its whole team; "expiring" covers the next 7 days. */
export type PortalDashboard = {
  quotas: QuotaSummary[];
  listings: { total: number; by_status: Record<PropertyStatus, number> };
  leads: { new: number; this_month: number; total: number };
  stats: { views: number; phone_clicks: number; whatsapp_clicks: number };
  expiring: {
    listings: { id: number; title: string; slug: string; expires_at: string }[];
    subscriptions: { id: number; offer_name: string | null; ends_at: string }[];
  };
};

/** A plain `{ message }` reply, e.g. after changing or resetting a password. */
export type MessageResponse = { message: string };

/** Present on GET /auth/me while an admin is logged in as this user. */
export type Impersonation = { admin_name: string | null; expires_at: string };

/** GET /auth/me */
export type MeResponse = { data: User; impersonation?: Impersonation | null };

export type AgencyDocumentType = "cnic_front" | "cnic_back" | "company_registration" | "trade_license" | "office_photo" | "other";

export type AgencyDocument = { id: number; type: AgencyDocumentType; original_name: string; size_kb: number; created_at: string };

export type AgencyDocumentsResponse = {
  data: AgencyDocument[];
  verification: { is_verified: boolean; verified_at: string | null; requested_at: string | null };
};

export type AllocationCode = "LISTING" | "FEATURED" | "HOT" | "REFRESH";

/** A per-agent cap on the agency's shared credits; limit null = no cap. */
export type AgentAllocation = { code: AllocationCode; name: string; limit: number | null; used: number; remaining: number | null };

export type AgentInvitation = { id: number; name: string; email: string; expires_at: string; is_expired: boolean; created_at: string; url?: string };

/** GET /auth/agent-invitations/{token} */
export type InvitationDetails = { agency_name: string; name: string; email: string; expires_at: string };

export type ActivityCounts = { views: number; phone_clicks: number; whatsapp_clicks: number; leads: number };

export type AnalyticsRange = { from: string; to: string };

/** GET /portal/analytics */
export type ListingAnalytics = {
  range: AnalyticsRange;
  totals: ActivityCounts;
  daily: ({ date: string } & ActivityCounts)[];
  listings: ({ id: number; title: string; slug: string; status: PropertyStatus; user_id: number } & ActivityCounts)[];
};

export type TeamMemberPerformance = {
  user: { id: number; name: string; account_type: AccountType; status: AccountStatus };
  listings_created: number;
  live_listings: number;
  leads: number;
  leads_closed: number;
} & ActivityCounts;

/** GET /portal/team-performance */
export type TeamPerformance = { range: AnalyticsRange; members: TeamMemberPerformance[] };

/** A buyer's "wanted" requirement; contact is null until unlocked. */
export type WantedPost = {
  id: number;
  purpose: PropertyPurpose;
  property_type?: PropertyType | null;
  city?: City | null;
  society?: Society | null;
  phase: string | null;
  min_price: string | null;
  max_price: string | null;
  min_area: string | null;
  max_area: string | null;
  area_unit: AreaUnit | null;
  bedrooms: number | null;
  description: string;
  status: "active" | "closed";
  is_open: boolean;
  is_unlocked?: boolean;
  unlocks_count?: number;
  contact: { name: string; phone: string; email: string | null } | null;
  expires_at: string | null;
  created_at: string;
};

export type BannerPlacement = "home_top" | "search_top" | "search_sidebar" | "listing_sidebar";
export type BannerStatus = "pending" | "active" | "paused" | "rejected";

export type Banner = {
  id: number;
  title: string;
  image_url: string | null;
  link_url: string | null;
  placement: BannerPlacement;
  status: BannerStatus;
  rejection_reason: string | null;
  starts_at: string | null;
  ends_at: string | null;
  impressions: number;
  clicks: number;
  created_at: string;
};
