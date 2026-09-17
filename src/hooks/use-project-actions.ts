"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ApiError, api } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";
import type { Project, Resource } from "@/types/api";

/** Quota code a project submission uses. */
export const PROJECT_CREDIT_CODE = "PROJECT_LISTINGS";

/** "1 Project Listings credit" / "3 Project Listings credits". */
export const projectCredits = (count: number) => `${count} Project Listings credit${count === 1 ? "" : "s"}`;

/** Project workflow actions (developer accounts) with shared success messages, cache refresh and quota error handling. */
export function useProjectActions() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const router = useRouter();

  const invalidate = useCallback(() => {
    for (const key of ["projects", "project", "quotas", "dashboard"]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [queryClient]);

  /** No Project Listings credits left: explain and open the plan page instead of calling the API. */
  const goBuy = useCallback(() => {
    modal.confirm({
      title: "No Project Listings credits left",
      content: "Your plan has no credits left to submit a project. Upgrade or buy an add-on to continue.",
      okText: "View plans",
      cancelText: "Close",
      onOk: () => router.push("/plan"),
    });
  }, [modal, router]);

  const onError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.code === "QUOTA_EXCEEDED") {
        goBuy();

        return;
      }

      if (error instanceof ApiError && error.code === "PROJECT_STATE") {
        // The status may have changed elsewhere (e.g. an admin picked it up), so reload it.
        invalidate();
      }

      message.error(errorMessage(error));
    },
    [goBuy, invalidate, message],
  );

  const submit = useMutation({
    mutationFn: (project: Project) => api<Resource<Project>>(`portal/projects/${project.id}/submit`, { method: "POST" }),
    onSuccess: (_, project) => {
      message.success(
        project.status === "changes_requested"
          ? "Resubmitted for review. It goes live once an admin approves it."
          : project.status === "expired"
            ? "Re-posted and sent for review. It goes live once an admin approves it."
            : "Sent for review. It goes live once an admin approves it.",
      );
      invalidate();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (project: Project) => api(`portal/projects/${project.id}`, { method: "DELETE" }),
    onSuccess: () => {
      message.success("Project deleted.");
      invalidate();
    },
    onError,
  });

  function confirmResubmit(project: Project) {
    modal.confirm({
      title: "Resubmit this project?",
      content: "Make sure you have made the changes our team asked for. Resubmitting is free — no Project Listings credit is used.",
      okText: "Resubmit",
      onOk: () => submit.mutateAsync(project).catch(() => undefined),
    });
  }

  function confirmRepost(project: Project, remaining: number | null) {
    modal.confirm({
      title: "Re-post this project?",
      content: `It goes back to review and is live again once approved. Re-posting uses 1 Project Listings credit${remaining === null ? "" : ` (you have ${remaining} left)`}.`,
      okText: "Re-post",
      onOk: () => submit.mutateAsync(project).catch(() => undefined),
    });
  }

  function confirmDelete(project: Project, onDone?: () => void) {
    modal.confirm({
      title: "Delete this project?",
      content: "Its unit types, photos and brochures are removed. This cannot be undone, and a credit already used is not refunded.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => remove.mutateAsync(project).then(() => onDone?.()),
    });
  }

  return { submit, remove, goBuy, confirmResubmit, confirmRepost, confirmDelete };
}
