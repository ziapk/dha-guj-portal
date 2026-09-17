"use client";

import { DeleteOutlined, EditOutlined, ExportOutlined, MoreOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Dropdown, type MenuProps } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { PROJECT_CREDIT_CODE, projectCredits, useProjectActions } from "@/hooks/use-project-actions";
import { remainingFor, useQuotas } from "@/hooks/use-quotas";
import { PUBLIC_WEB_URL } from "@/lib/constants";
import type { Project } from "@/types/api";

/** The project's page on the Public Web; only reachable while it is live. */
export const projectWebUrl = (project: Project) => `${PUBLIC_WEB_URL}/projects/${project.slug}`;

export const isProjectLive = (project: Project) => project.status === "published" && (!project.expires_at || dayjs(project.expires_at).isAfter(dayjs()));

/** The next sensible actions for a project, based on its status. */
export function ProjectActions({
  project,
  compact = false,
  onDeleted,
  beforeSubmit,
}: {
  project: Project;
  compact?: boolean;
  onDeleted?: () => void;
  /** Runs before submitting, e.g. to save unsaved edits first; throw to stop. */
  beforeSubmit?: () => Promise<void>;
}) {
  const router = useRouter();
  const { submit, goBuy, confirmResubmit, confirmRepost, confirmDelete } = useProjectActions();
  const quotas = useQuotas();

  const isLive = isProjectLive(project);
  const canSubmit = ["draft", "rejected", "changes_requested", "expired"].includes(project.status);
  const creditsLeft = remainingFor(quotas.data, PROJECT_CREDIT_CODE);
  const leftSuffix = creditsLeft === null ? "" : ` (${projectCredits(creditsLeft)} left)`;

  async function onSubmit() {
    if (beforeSubmit) {
      try {
        await beforeSubmit();
      } catch {
        return;
      }
    }

    if (project.status === "changes_requested") {
      confirmResubmit(project);
    } else if (creditsLeft === 0) {
      goBuy();
    } else if (project.status === "expired") {
      confirmRepost(project, creditsLeft);
    } else {
      submit.mutate(project);
    }
  }

  const submitLabel =
    project.status === "changes_requested"
      ? "Resubmit"
      : creditsLeft === 0
        ? "Buy Project Listings credits"
        : project.status === "expired"
          ? `Re-post${leftSuffix}`
          : `Submit${leftSuffix}`;

  const extraItems: NonNullable<MenuProps["items"]> = [
    ...(compact ? [{ key: "edit", icon: <EditOutlined />, label: project.status === "pending" ? "View" : "Edit", onClick: () => router.push(`/projects/${project.id}`) }] : []),
    // On cards there is only room for one button, so "View on website" moves into the menu.
    ...(isLive && compact
      ? [{ key: "web", icon: <ExportOutlined />, label: <a href={projectWebUrl(project)} target="_blank" rel="noopener noreferrer">View on website</a> }]
      : []),
  ];

  const menuItems: NonNullable<MenuProps["items"]> =
    project.status === "pending"
      ? extraItems
      : [
          ...extraItems,
          ...(extraItems.length > 0 ? [{ type: "divider" as const }] : []),
          { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true, onClick: () => confirmDelete(project, onDeleted) },
        ];

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} onClick={(event) => event.stopPropagation()}>
      {canSubmit && (
        <Button type="primary" icon={<SendOutlined />} loading={submit.isPending && submit.variables?.id === project.id} onClick={() => void onSubmit()}>
          {submitLabel}
        </Button>
      )}
      {isLive && !compact && (
        <Button icon={<ExportOutlined />} href={projectWebUrl(project)} target="_blank" rel="noopener noreferrer">
          View on website
        </Button>
      )}
      {menuItems.length > 0 && (
        <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
          <Button icon={<MoreOutlined />} aria-label="More actions">
            {compact ? null : "More"}
          </Button>
        </Dropdown>
      )}
    </div>
  );
}
