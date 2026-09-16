"use client";

import { CheckOutlined, CrownOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, App, Button, Card, Col, Empty, Flex, Row, Skeleton, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { QuotaCard } from "@/components/quota-card";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";
import { SUBSCRIPTION_SOURCE_LABELS, SUBSCRIPTION_STATUS_COLORS, formatDate, formatPrice } from "@/lib/labels";
import type { Collection, Offer, OfferItem, OrderWithBank, Paginated, QuotaSummary, Subscription, SubscriptionStatus } from "@/types/api";

function limitText(item: OfferItem): string {
  if (item.quota_item?.type === "boolean") {
    return item.quota_item.name;
  }

  const value = item.is_unlimited ? "Unlimited" : item.limit_value;
  const suffix = item.reset_period === "monthly" ? " / month" : item.reset_period === "yearly" ? " / year" : "";

  return `${value} ${item.quota_item?.name ?? ""}${suffix}`;
}

export default function PlanPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { data: me } = useMe();
  const isAgent = me?.account_type === "agent";

  const buy = useMutation({
    mutationFn: (offerId: number) => api<OrderWithBank>("portal/orders", { method: "POST", body: { offer_id: offerId } }),
    onSuccess: (response) => router.push(`/orders/${response.data.id}`),
    onError: (error) => message.error(errorMessage(error)),
  });

  const quotas = useQuery({
    queryKey: ["quotas"],
    queryFn: () => api<Collection<QuotaSummary>>("portal/quotas").then((response) => response.data),
  });

  const subscriptions = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => api<Paginated<Subscription>>("portal/subscriptions").then((page) => page.data),
  });

  const offers = useQuery({
    queryKey: ["offers"],
    queryFn: () => api<Collection<Offer>>("portal/offers").then((response) => response.data),
  });

  const columns: ColumnsType<Subscription> = [
    { title: "Plan", render: (_, subscription) => subscription.offer_snapshot.name },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: SubscriptionStatus) => <Tag color={SUBSCRIPTION_STATUS_COLORS[status]}>{status}</Tag>,
    },
    { title: "Source", dataIndex: "source", render: (source: Subscription["source"]) => SUBSCRIPTION_SOURCE_LABELS[source] },
    { title: "Started", dataIndex: "starts_at", render: (value: string | null) => formatDate(value) },
    { title: "Ends", dataIndex: "ends_at", render: (value: string | null) => (value ? formatDate(value) : "Never") },
  ];

  return (
    <>
      <PageHeader title="Plan & Quota" subtitle="What your plan includes and how much you have left" extra={!isAgent && <Link href="/orders"><Button>Billing & orders</Button></Link>} />

      {isAgent && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={`You list on ${me?.agency?.name ?? "your agency"}'s plan`}
          description="These balances are shared by everyone in your agency. Ask your agency when you need more."
        />
      )}

      <Card title="Your balances" style={{ marginBottom: 16 }}>
        {quotas.isLoading ? (
          <Skeleton active />
        ) : (quotas.data ?? []).length === 0 ? (
          <Empty description="You have no active plan right now." />
        ) : (
          <Row gutter={[12, 12]}>
            {quotas.data?.map((quota) => (
              <Col key={quota.code} xs={24} sm={12} lg={8} xl={6}>
                <QuotaCard quota={quota} />
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Card title="Your subscriptions" style={{ marginBottom: 16 }}>
        <Table rowKey="id" loading={subscriptions.isLoading} dataSource={subscriptions.data} columns={columns} pagination={false} scroll={{ x: "max-content" }} />
      </Card>

      {!isAgent && (
        <>
      <Typography.Title level={4} style={{ margin: "24px 0 12px" }}>
        Upgrade your plan
      </Typography.Title>

      {offers.isLoading ? (
        <Skeleton active />
      ) : (
        <Row gutter={[16, 16]}>
          {(offers.data ?? []).map((offer) => (
            <Col key={offer.id} xs={24} md={12} xl={8}>
              <Card
                hoverable
                style={{ height: "100%", borderColor: offer.badge_text ? "var(--accent)" : undefined }}
                title={
                  <Flex justify="space-between" align="center" gap={8}>
                    <span>
                      <CrownOutlined style={{ color: "var(--accent)", marginRight: 8 }} />
                      {offer.name}
                    </span>
                    {offer.badge_text && <Tag color="gold">{offer.badge_text}</Tag>}
                    {offer.is_addon && <Tag color="purple">Add-on</Tag>}
                  </Flex>
                }
              >
                <Typography.Title level={2} style={{ margin: 0 }}>
                  {offer.is_free ? "Free" : formatPrice(offer.current_price)}
                </Typography.Title>
                <Typography.Text type="secondary">{offer.duration_days ? `for ${offer.duration_days} days` : "never expires"}</Typography.Text>

                <div style={{ margin: "16px 0" }}>
                  {(offer.items ?? []).map((item) => (
                    <div key={item.id} style={{ padding: "4px 0" }}>
                      <CheckOutlined style={{ color: "#10b981", marginRight: 8 }} />
                      {limitText(item)}
                    </div>
                  ))}
                </div>

                <Button
                  block
                  type={offer.badge_text ? "primary" : "default"}
                  disabled={offer.is_free}
                  loading={buy.isPending && buy.variables === offer.id}
                  onClick={() => buy.mutate(offer.id)}
                >
                  {offer.is_free ? "Included free" : offer.is_addon ? "Buy add-on" : "Upgrade"}
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      )}
        </>
      )}
    </>
  );
}
