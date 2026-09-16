import dayjs from "dayjs";
import type {
  AccountStatus,
  AgencyDocumentType,
  BannerPlacement,
  BannerStatus,
  AccountType,
  AreaUnit,
  FurnishedStatus,
  LeadStatus,
  OrderStatus,
  PaymentStatus,
  OfferAudience,
  OfferStatus,
  OfferVisibility,
  PropertyCategory,
  PropertyPurpose,
  PropertyStatus,
  QuotaAction,
  QuotaItemType,
  ResetPeriod,
  SubscriptionSource,
  SubscriptionStatus,
} from "@/types/api";

export const QUOTA_ITEM_TYPE_LABELS: Record<QuotaItemType, string> = {
  credit: "Credit (used up)",
  concurrent: "Concurrent limit",
  per_entity: "Per listing limit",
  boolean: "On / off feature",
  duration: "Duration (days)",
};

export const RESET_PERIOD_LABELS: Record<ResetPeriod, string> = {
  none: "No reset",
  monthly: "Resets monthly",
  yearly: "Resets yearly",
};

export const OFFER_AUDIENCE_LABELS: Record<OfferAudience, string> = {
  individual: "Individuals",
  agency: "Agencies",
  both: "Individuals & agencies",
};

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

export const OFFER_STATUS_COLORS: Record<OfferStatus, string> = {
  active: "green",
  inactive: "default",
  archived: "red",
};

export const OFFER_VISIBILITY_LABELS: Record<OfferVisibility, string> = {
  public: "Public",
  hidden: "Hidden (assign only)",
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  individual: "Individual",
  agency: "Agency",
  agent: "Agent",
};

export const ACCOUNT_STATUS_COLORS: Record<AccountStatus, string> = {
  active: "green",
  suspended: "red",
};

export const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, string> = {
  pending: "gold",
  active: "green",
  expired: "default",
  cancelled: "red",
  suspended: "orange",
};

export const SUBSCRIPTION_SOURCE_LABELS: Record<SubscriptionSource, string> = {
  purchase: "Purchase",
  admin_assigned: "Assigned by admin",
  free: "Free",
  trial: "Trial",
};

export const QUOTA_ACTION_LABELS: Record<QuotaAction, string> = {
  consume: "Consume",
  refund: "Refund",
  adjust: "Adjust",
  reset: "Reset",
  expire: "Expire",
};

export function toOptions<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

export function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return `Rs ${Number(value).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | null | undefined, withTime = false): string {
  return value ? dayjs(value).format(withTime ? "DD MMM YYYY, HH:mm" : "DD MMM YYYY") : "—";
}

export const PROPERTY_PURPOSE_LABELS: Record<PropertyPurpose, string> = {
  sale: "For sale",
  rent: "For rent",
};

export const PROPERTY_CATEGORY_LABELS: Record<PropertyCategory, string> = {
  residential: "Residential",
  plot: "Plot",
  commercial: "Commercial",
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  draft: "Draft",
  pending: "Under review",
  published: "Live",
  rejected: "Rejected",
  changes_requested: "Changes requested",
  expired: "Expired",
  sold: "Sold",
  rented: "Rented",
};

export const PROPERTY_STATUS_COLORS: Record<PropertyStatus, string> = {
  draft: "default",
  pending: "gold",
  published: "green",
  rejected: "red",
  changes_requested: "orange",
  expired: "default",
  sold: "purple",
  rented: "cyan",
};

export const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
  marla: "Marla",
  kanal: "Kanal",
  sq_ft: "Sq. ft",
  sq_yd: "Sq. yd",
  sq_m: "Sq. m",
};

export const FURNISHED_LABELS: Record<FurnishedStatus, string> = {
  unfurnished: "Unfurnished",
  semi_furnished: "Semi-furnished",
  furnished: "Furnished",
};

export function formatArea(size: string | number, unit: AreaUnit): string {
  return `${Number(size).toLocaleString("en-PK", { maximumFractionDigits: 2 })} ${AREA_UNIT_LABELS[unit]}`;
}

/** Pakistani-style short price: Rs 2.5 Crore, Rs 85 Lakh, Rs 45,000. */
export function formatCompactPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  const amount = Number(value);
  const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");

  if (amount >= 10_000_000) {
    return `Rs ${trim(amount / 10_000_000)} Crore`;
  }

  if (amount >= 100_000) {
    return `Rs ${trim(amount / 100_000)} Lakh`;
  }

  return formatPrice(amount);
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  closed: "Deal closed",
  lost: "Lost",
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: "blue",
  contacted: "gold",
  interested: "purple",
  closed: "green",
  lost: "default",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  awaiting_approval: "Receipt under review",
  paid: "Paid",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: "gold",
  awaiting_approval: "blue",
  paid: "green",
  cancelled: "default",
  refunded: "purple",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Under review",
  approved: "Approved",
  rejected: "Rejected",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: "blue",
  approved: "green",
  rejected: "red",
};

export const AGENCY_DOCUMENT_TYPE_LABELS: Record<AgencyDocumentType, string> = {
  cnic_front: "CNIC (front)",
  cnic_back: "CNIC (back)",
  company_registration: "Company registration",
  trade_license: "Trade licence",
  office_photo: "Office photo",
  other: "Other document",
};

export const BANNER_PLACEMENT_LABELS: Record<BannerPlacement, string> = {
  home_top: "Home page — top",
  search_top: "Search results — top",
  search_sidebar: "Search results — sidebar",
  listing_sidebar: "Listing page — sidebar",
};

export const BANNER_PLACEMENT_HINTS: Record<BannerPlacement, string> = {
  home_top: "Wide banner under the home page search. Most visitors see it. Suggested size 1200 × 300 px.",
  search_top: "Wide banner above the search results, seen by active buyers. Suggested size 1200 × 200 px.",
  search_sidebar: "Tall banner beside the search results on larger screens. Suggested size 300 × 600 px.",
  listing_sidebar: "Banner beside a property's details, where buyers decide to call. Suggested size 300 × 250 px.",
};

export const BANNER_STATUS_LABELS: Record<BannerStatus, string> = {
  pending: "Under review",
  active: "Running",
  paused: "Paused",
  rejected: "Rejected",
};

export const BANNER_STATUS_COLORS: Record<BannerStatus, string> = {
  pending: "gold",
  active: "green",
  paused: "default",
  rejected: "red",
};

/** "Rs 50 Lakh – Rs 1 Crore", "Up to Rs 80 Lakh", "From Rs 2 Crore" or "Any budget". */
export function formatPriceRange(min: string | number | null | undefined, max: string | number | null | undefined): string {
  const hasMin = min !== null && min !== undefined && Number(min) > 0;
  const hasMax = max !== null && max !== undefined && Number(max) > 0;

  if (hasMin && hasMax) {
    return `${formatCompactPrice(min)} – ${formatCompactPrice(max)}`;
  }

  if (hasMax) {
    return `Up to ${formatCompactPrice(max)}`;
  }

  return hasMin ? `From ${formatCompactPrice(min)}` : "Any budget";
}
