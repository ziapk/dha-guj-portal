"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Impersonation, MeResponse, User } from "@/types/api";

const meQuery = {
  queryKey: ["me"],
  queryFn: () => api<MeResponse>("auth/me"),
  staleTime: 5 * 60 * 1000,
};

/** The logged-in owner, agency or agent. The full auth/me reply is cached under ["me"]. */
export function useMe() {
  return useQuery({ ...meQuery, select: (response: MeResponse): User => response.data });
}

/** Set while an admin is logged in as this user ("login as user"); null otherwise. */
export function useImpersonation() {
  return useQuery({ ...meQuery, select: (response: MeResponse): Impersonation | null => response.impersonation ?? null });
}
