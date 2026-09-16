import { AppstoreOutlined, CheckCircleOutlined, FieldTimeOutlined, PictureOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Card, Flex, Progress, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import { formatDate } from "@/lib/labels";
import type { QuotaItemType, QuotaSummary } from "@/types/api";

const TYPE_ICONS: Record<QuotaItemType, ReactNode> = {
  credit: <ThunderboltOutlined />,
  concurrent: <AppstoreOutlined />,
  per_entity: <PictureOutlined />,
  duration: <FieldTimeOutlined />,
  boolean: <CheckCircleOutlined />,
};

/** Credit and concurrent balances as "Used X / Y — Z remaining" with a usage bar. */
function QuotaUsage({ quota }: { quota: QuotaSummary }) {
  if (quota.is_unlimited) {
    return (
      <>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Unlimited <Tag color="green">No limit</Tag>
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Used {quota.used.toLocaleString("en-PK")} so far
        </Typography.Text>
      </>
    );
  }

  const remaining = quota.remaining ?? Math.max(0, quota.total - quota.used);
  const percentUsed = quota.total === 0 ? 100 : Math.min(100, Math.round((quota.used / quota.total) * 100));

  return (
    <>
      <Typography.Title level={3} style={{ margin: 0 }}>
        <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
          Used{" "}
        </Typography.Text>
        {quota.used} / {quota.total}
      </Typography.Title>
      <Typography.Text type={remaining === 0 ? "danger" : "secondary"} style={{ fontSize: 13 }}>
        {remaining} remaining
      </Typography.Text>
      <Progress percent={percentUsed} showInfo={false} size="small" status={remaining === 0 || percentUsed >= 90 ? "exception" : "normal"} style={{ marginTop: 8, marginBottom: 0 }} />
    </>
  );
}

function QuotaValue({ quota }: { quota: QuotaSummary }) {
  const unit = quota.unit_label ? ` ${quota.unit_label}` : "";

  if (quota.type === "boolean") {
    return quota.is_unlimited || quota.total > 0 ? <Tag color="green">Included</Tag> : <Tag>Not included</Tag>;
  }

  if (quota.type === "per_entity" || quota.type === "duration") {
    return (
      <Typography.Title level={3} style={{ margin: 0 }}>
        {quota.is_unlimited ? "Unlimited" : `${quota.total}${unit}`}
        {quota.type === "per_entity" && (
          <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
            {" "}
            per listing
          </Typography.Text>
        )}
      </Typography.Title>
    );
  }

  if (quota.is_unlimited) {
    return (
      <Typography.Title level={3} style={{ margin: 0 }}>
        Unlimited
      </Typography.Title>
    );
  }

  const percentLeft = quota.total === 0 ? 0 : Math.round(((quota.remaining ?? 0) / quota.total) * 100);

  return (
    <>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {quota.remaining}
        <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
          {" "}
          of {quota.total} left
        </Typography.Text>
      </Typography.Title>
      <Progress
        percent={percentLeft}
        showInfo={false}
        size="small"
        status={percentLeft <= 10 ? "exception" : "normal"}
        style={{ marginTop: 8, marginBottom: 0 }}
      />
    </>
  );
}

/** One quota balance: remaining credits, per-listing limits, durations or included features. */
export function QuotaCard({ quota, usage = false }: { quota: QuotaSummary; /** Show "used of total" with a usage bar instead of "left". */ usage?: boolean }) {
  return (
    <Card size="small" style={{ height: "100%" }}>
      <Flex gap={12} align="flex-start">
        <span className="kpi-icon" style={{ width: 38, height: 38, fontSize: 17, color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}>
          {TYPE_ICONS[quota.type]}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Text type="secondary">{quota.name}</Typography.Text>
          {usage && (quota.type === "credit" || quota.type === "concurrent") ? <QuotaUsage quota={quota} /> : <QuotaValue quota={quota} />}
          {quota.expires_at && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Until {formatDate(quota.expires_at)}
            </Typography.Text>
          )}
        </div>
      </Flex>
    </Card>
  );
}
