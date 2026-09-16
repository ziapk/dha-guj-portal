"use client";

import { EyeOutlined, InfoCircleOutlined, MessageOutlined, PhoneOutlined, ReloadOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Col, Empty, Flex, Row, Segmented, Skeleton, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { DailyChart } from "@/components/daily-chart";
import { DateRangeFilter, defaultRange, type DateRange } from "@/components/date-range-filter";
import { PageHeader } from "@/components/page-header";
import { UpgradePrompt, isFeatureMissing } from "@/components/upgrade-prompt";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";
import { PROPERTY_STATUS_COLORS, PROPERTY_STATUS_LABELS, formatDate } from "@/lib/labels";
import type { ActivityCounts, AgentsResponse, ListingAnalytics, PropertyStatus } from "@/types/api";

type Metric = keyof ActivityCounts;

const METRICS: { key: Metric; label: string; icon: ReactNode; color: string }[] = [
  { key: "views", label: "Views", icon: <EyeOutlined />, color: "var(--accent)" },
  { key: "phone_clicks", label: "Phone clicks", icon: <PhoneOutlined />, color: "#0ea5e9" },
  { key: "whatsapp_clicks", label: "WhatsApp clicks", icon: <WhatsAppOutlined />, color: "#10b981" },
  { key: "leads", label: "Leads", icon: <MessageOutlined />, color: "#f59e0b" },
];

type ListingRow = ListingAnalytics["listings"][number];

function AnalyticsContent() {
  const router = useRouter();
  const propertyId = useSearchParams().get("property_id") ?? undefined;
  const [range, setRange] = useState<DateRange>(() => defaultRange());
  const [metric, setMetric] = useState<Metric>("views");
  const { data: me } = useMe();
  const isAgency = me?.account_type === "agency";

  const analytics = useQuery({
    queryKey: ["analytics", { ...range, propertyId }],
    queryFn: () => api<{ data: ListingAnalytics }>("portal/analytics", { query: { ...range, property_id: propertyId } }).then((response) => response.data),
  });

  const agents = useQuery({
    queryKey: ["agents"],
    queryFn: () => api<AgentsResponse>("portal/agents"),
    enabled: isAgency,
  });

  const memberName = (userId: number) =>
    userId === me?.id ? `${me.name} (agency)` : (agents.data?.data.find((agent) => agent.id === userId)?.name ?? `#${userId}`);

  const data = analytics.data;
  const selectedMetric = METRICS.find((item) => item.key === metric) ?? METRICS[0];
  const filteredTitle = propertyId ? data?.listings.find((row) => String(row.id) === propertyId)?.title : undefined;

  const columns: ColumnsType<ListingRow> = [
    {
      title: "Listing",
      dataIndex: "title",
      render: (title: string, row) => (
        <>
          <Link href={`/listings/${row.id}`}>
            <Typography.Text ellipsis style={{ maxWidth: 320, color: "inherit" }}>
              {title}
            </Typography.Text>
          </Link>
          {isAgency && (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {memberName(row.user_id)}
              </Typography.Text>
            </div>
          )}
        </>
      ),
    },
    { title: "Status", dataIndex: "status", render: (status: PropertyStatus) => <Tag color={PROPERTY_STATUS_COLORS[status]}>{PROPERTY_STATUS_LABELS[status]}</Tag> },
    ...METRICS.map((item) => ({
      title: item.label,
      dataIndex: item.key,
      align: "right" as const,
      sorter: (a: ListingRow, b: ListingRow) => a[item.key] - b[item.key],
      render: (value: number) => value.toLocaleString("en-PK"),
    })),
    {
      title: "",
      align: "right",
      render: (_, row) =>
        String(row.id) === propertyId ? null : (
          <Button size="small" onClick={() => router.replace(`/analytics?property_id=${row.id}`)}>
            Daily chart
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle={isAgency ? "How buyers respond to your team's listings, day by day" : "How buyers respond to your listings, day by day"}
        extra={<DateRangeFilter value={range} onChange={setRange} />}
      />

      {analytics.isError && isFeatureMissing(analytics.error) ? (
        <UpgradePrompt
          title="Analytics is not included in your plan"
          description="Upgrade to see daily views, call and WhatsApp clicks and leads for every listing, so you know which ads work."
        />
      ) : analytics.isError ? (
        <Alert
          type="error"
          showIcon
          title="Could not load analytics"
          description={errorMessage(analytics.error)}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => analytics.refetch()}>
              Try again
            </Button>
          }
        />
      ) : (
        <>
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 16 }}
            title="Daily figures start from when analytics launched"
            description="Days before that show zero. Lifetime totals for each listing are still on the listing itself."
            closable
          />

          {propertyId && (
            <Tag closable onClose={() => router.replace("/analytics")} style={{ marginBottom: 16 }}>
              Showing one listing: {filteredTitle ?? `#${propertyId}`}
            </Tag>
          )}

          <Row gutter={[16, 16]}>
            {METRICS.map((item) => (
              <Col key={item.key} xs={12} xl={6}>
                <Card hoverable onClick={() => setMetric(item.key)} className={metric === item.key ? "metric-card active" : "metric-card"} style={{ height: "100%" }}>
                  <Flex justify="space-between" align="flex-start" gap={12}>
                    <Statistic title={item.label} value={data?.totals[item.key] ?? 0} loading={analytics.isLoading} />
                    <span className="kpi-icon" style={{ color: item.color, background: `color-mix(in srgb, ${item.color} 14%, transparent)` }}>
                      {item.icon}
                    </span>
                  </Flex>
                </Card>
              </Col>
            ))}
          </Row>

          <Card
            style={{ marginTop: 16 }}
            title={`${selectedMetric.label} per day`}
            extra={
              <Segmented<Metric>
                size="small"
                value={metric}
                onChange={setMetric}
                options={METRICS.map((item) => ({ value: item.key, label: item.label }))}
              />
            }
          >
            {analytics.isLoading || !data ? (
              <Skeleton active />
            ) : (
              <>
                <DailyChart label={selectedMetric.label} data={data.daily.map((day) => ({ date: day.date, value: day[metric] }))} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {formatDate(data.range.from)} – {formatDate(data.range.to)}
                </Typography.Text>
              </>
            )}
          </Card>

          <Card style={{ marginTop: 16 }} title="By listing" extra={<Typography.Text type="secondary">Top 50 by views</Typography.Text>}>
            <Table
              rowKey="id"
              loading={analytics.isLoading}
              dataSource={data?.listings}
              columns={columns}
              pagination={false}
              scroll={{ x: "max-content" }}
              locale={{ emptyText: <Empty description="No buyer activity in this period" /> }}
            />
          </Card>
        </>
      )}
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense>
      <AnalyticsContent />
    </Suspense>
  );
}
