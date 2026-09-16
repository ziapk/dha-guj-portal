"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Collection, QuotaSummary } from "@/types/api";

/** The account's quota balances (shared with the agency for agents). Cached under ["quotas"], which listing actions invalidate. */
export function useQuotas() {
  return useQuery({
    queryKey: ["quotas"],
    queryFn: () => api<Collection<QuotaSummary>>("portal/quotas").then((response) => response.data),
    staleTime: 30 * 1000,
  });
}

/**
 * Credits left for a quota code: null when unlimited or when balances are not loaded yet (so nothing is blocked),
 * 0 when the plan does not include the item at all (the API would refuse it).
 */
export function remainingFor(quotas: QuotaSummary[] | undefined, code: string): number | null {
  if (!quotas) {
    return null;
  }

  const quota = quotas.find((item) => item.code === code);

  if (!quota) {
    return 0;
  }

  return quota.is_unlimited ? null : (quota.remaining ?? 0);
}
