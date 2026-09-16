"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ApiError, api } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";
import type { Property, Resource } from "@/types/api";

/** Listing workflow actions with shared success messages, cache refresh and quota error handling. */
export function useListingActions() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const router = useRouter();

  const invalidate = useCallback(() => {
    for (const key of ["listings", "listing", "listings-total", "quotas", "dashboard"]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [queryClient]);

  const onError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.code === "QUOTA_EXCEEDED") {
        modal.confirm({
          title: "Not enough credits",
          content: `${error.message} Check your plan to see what is included.`,
          okText: "View plan",
          cancelText: "Close",
          onOk: () => router.push("/plan"),
        });

        return;
      }

      message.error(errorMessage(error));
    },
    [message, modal, router],
  );

  const submit = useMutation({
    mutationFn: (property: Property) => api<Resource<Property>>(`portal/properties/${property.id}/submit`, { method: "POST" }),
    onSuccess: (_, property) => {
      message.success(
        property.status === "changes_requested"
          ? "Resubmitted for review. It goes live once an admin approves it."
          : property.status === "expired"
            ? "Re-posted and sent for review. It goes live once an admin approves it."
            : "Sent for review. It goes live once an admin approves it.",
      );
      invalidate();
    },
    onError,
  });

  const feature = useMutation({
    mutationFn: (property: Property) => api<Resource<Property>>(`portal/properties/${property.id}/feature`, { method: "POST" }),
    onSuccess: () => {
      message.success("Your listing is now featured at the top of search.");
      invalidate();
    },
    onError,
  });

  const makeHot = useMutation({
    mutationFn: (property: Property) => api<Resource<Property>>(`portal/properties/${property.id}/hot`, { method: "POST" }),
    onSuccess: (response, property) => {
      message.success(
        property.is_hot
          ? `Hot period extended${response.data.hot_until ? ` until ${dayjs(response.data.hot_until).format("DD MMM YYYY")}` : ""}.`
          : "Your listing is now hot — shown first in search with a Hot tag.",
      );
      invalidate();
    },
    onError,
  });

  const bump = useMutation({
    mutationFn: (property: Property) => api<Resource<Property>>(`portal/properties/${property.id}/refresh`, { method: "POST" }),
    onSuccess: () => {
      message.success("Listing refreshed to the top of the newest results.");
      invalidate();
    },
    onError,
  });

  const close = useMutation({
    mutationFn: ({ property, status }: { property: Property; status: "sold" | "rented" }) =>
      api<Resource<Property>>(`portal/properties/${property.id}/close`, { method: "POST", body: { status } }),
    onSuccess: (_, { status }) => {
      message.success(`Marked as ${status}.`);
      invalidate();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (property: Property) => api(`portal/properties/${property.id}`, { method: "DELETE" }),
    onSuccess: () => {
      message.success("Listing deleted.");
      invalidate();
    },
    onError,
  });

  /** No credits left: explain and open the plan page instead of calling the API. */
  function goBuy(what: string) {
    modal.confirm({
      title: `No ${what} left`,
      content: "Your plan has no credits left for this. Upgrade or buy an add-on to continue.",
      okText: "View plans",
      cancelText: "Close",
      onOk: () => router.push("/plan"),
    });
  }

  function confirmResubmit(property: Property) {
    modal.confirm({
      title: "Resubmit this listing?",
      content: "Make sure you have made the changes our team asked for. Resubmitting is free — no listing credit is used.",
      okText: "Resubmit",
      onOk: () => submit.mutateAsync(property),
    });
  }

  function confirmRepost(property: Property, remaining: number | null) {
    modal.confirm({
      title: "Re-post this listing?",
      content: `It goes back to review and is live again once approved. Re-posting uses 1 listing credit${remaining === null ? "" : ` (you have ${remaining} left)`}.`,
      okText: "Re-post",
      onOk: () => submit.mutateAsync(property),
    });
  }

  function confirmClose(property: Property) {
    const status = property.purpose === "rent" ? "rented" : "sold";

    modal.confirm({
      title: `Mark this listing as ${status}?`,
      content: "It will be removed from search results.",
      okText: `Mark as ${status}`,
      onOk: () => close.mutateAsync({ property, status }),
    });
  }

  function confirmDelete(property: Property, onDone?: () => void) {
    modal.confirm({
      title: "Delete this listing?",
      content: "This cannot be undone. Credits already used are not refunded.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => remove.mutateAsync(property).then(() => onDone?.()),
    });
  }

  return { submit, feature, makeHot, bump, goBuy, confirmResubmit, confirmRepost, confirmClose, confirmDelete };
}
