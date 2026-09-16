"use client";

import { CheckSquareOutlined, DeleteOutlined, EditOutlined, FireOutlined, MoreOutlined, ReloadOutlined, RocketOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Dropdown, type MenuProps } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useListingActions } from "@/hooks/use-listing-actions";
import { remainingFor, useQuotas } from "@/hooks/use-quotas";
import type { Property } from "@/types/api";

/** " (3 left)" for limited credits; nothing when unlimited or not loaded yet. */
const leftSuffix = (remaining: number | null) => (remaining === null ? "" : ` (${remaining} left)`);

/** The next sensible actions for a listing, based on its status. */
export function ListingActions({
  property,
  compact = false,
  onDeleted,
  beforeSubmit,
}: {
  property: Property;
  compact?: boolean;
  onDeleted?: () => void;
  /** Runs before submitting, e.g. to save unsaved edits first; throw to stop. */
  beforeSubmit?: () => Promise<void>;
}) {
  const router = useRouter();
  const { submit, feature, makeHot, bump, goBuy, confirmResubmit, confirmRepost, confirmClose, confirmDelete } = useListingActions();
  const quotas = useQuotas();

  const isLive = property.status === "published" && (!property.expires_at || dayjs(property.expires_at).isAfter(dayjs()));
  const canSubmit = ["draft", "rejected", "changes_requested", "expired"].includes(property.status);

  const listingsLeft = remainingFor(quotas.data, "LISTING");
  const featuresLeft = remainingFor(quotas.data, "FEATURED");
  const refreshesLeft = remainingFor(quotas.data, "REFRESH");
  const hotLeft = remainingFor(quotas.data, "HOT");

  const hotLabel = property.is_hot ? "Extend hot" : "Make hot";
  const onHot = () => (hotLeft === 0 ? goBuy("hot listing credits") : makeHot.mutate(property));

  async function onSubmit() {
    if (beforeSubmit) {
      try {
        await beforeSubmit();
      } catch {
        return;
      }
    }

    if (property.status === "changes_requested") {
      confirmResubmit(property);
    } else if (listingsLeft === 0) {
      goBuy("listing credits");
    } else if (property.status === "expired") {
      confirmRepost(property, listingsLeft);
    } else {
      submit.mutate(property);
    }
  }

  const submitLabel =
    property.status === "changes_requested"
      ? "Resubmit"
      : property.status === "expired"
        ? `Re-post${leftSuffix(listingsLeft)}`
        : `Submit for review${leftSuffix(listingsLeft)}`;

  const extraItems: NonNullable<MenuProps["items"]> = [
    ...(compact ? [{ key: "edit", icon: <EditOutlined />, label: "Edit", onClick: () => router.push(`/listings/${property.id}`) }] : []),
    ...(isLive
      ? [
          // On cards there is only room for one button, so "Make hot" moves into the menu.
          ...(compact ? [{ key: "hot", icon: <FireOutlined />, label: `${hotLabel}${leftSuffix(hotLeft)}`, onClick: onHot }] : []),
          {
            key: "refresh",
            icon: <ReloadOutlined />,
            label: `Refresh to top${leftSuffix(refreshesLeft)}`,
            onClick: () => (refreshesLeft === 0 ? goBuy("refresh credits") : bump.mutate(property)),
          },
          {
            key: "close",
            icon: <CheckSquareOutlined />,
            label: property.purpose === "rent" ? "Mark as rented" : "Mark as sold",
            onClick: () => confirmClose(property),
          },
        ]
      : []),
  ];

  const menuItems: NonNullable<MenuProps["items"]> =
    property.status === "pending"
      ? extraItems
      : [
          ...extraItems,
          ...(extraItems.length > 0 ? [{ type: "divider" as const }] : []),
          { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true, onClick: () => confirmDelete(property, onDeleted) },
        ];

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} onClick={(event) => event.stopPropagation()}>
      {canSubmit && (
        <Button type="primary" icon={<SendOutlined />} loading={submit.isPending && submit.variables?.id === property.id} onClick={() => void onSubmit()}>
          {submitLabel}
        </Button>
      )}
      {isLive && (
        <Button
          type="primary"
          icon={<RocketOutlined />}
          loading={feature.isPending && feature.variables?.id === property.id}
          onClick={() => (featuresLeft === 0 ? goBuy("feature credits") : feature.mutate(property))}
        >
          {property.is_featured ? "Extend feature" : "Feature"}
          {leftSuffix(featuresLeft)}
        </Button>
      )}
      {isLive && !compact && (
        <Button icon={<FireOutlined />} className="hot-button" loading={makeHot.isPending && makeHot.variables?.id === property.id} onClick={onHot}>
          {hotLabel}
          {leftSuffix(hotLeft)}
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
