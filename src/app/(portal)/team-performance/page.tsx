"use client";

import { InfoCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Avatar, Button, Card, Empty, Flex, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useState } from "react";
import { DateRangeFilter, defaultRange, type DateRange } from "@/components/date-range-filter";
import { PageHeader } from "@/components/page-header";
import { UpgradePrompt, isFeatureMissing } from "@/components/upgrade-prompt";
import { api } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";
import { formatDate } from "@/lib/labels";
import type { TeamMemberPerformance, TeamPerformance } from "@/types/api";

type NumericKey = Exclude<keyof TeamMemberPerformance, "user">;

const NUMBER_COLUMNS: { key: NumericKey; title: string; hint?: string }[] = [
  { key: "listings_created", title: "Listings added", hint: "Created in this period" },
  { key: "live_listings", title: "Live now", hint: "Live today, whatever the period" },
  { key: "leads", title: "Leads", hint: "Received on their listings or assigned to them" },
  { key: "leads_closed", title: "Deals closed" },
  { key: "views", title: "Views" },
  { key: "phone_clicks", title: "Phone clicks" },
  { key: "whatsapp_clicks", title: "WhatsApp clicks" },
];

export default function TeamPerformancePage() {
  const [range, setRange] = useState<DateRange>(() => defaultRange());

  const performance = useQuery({
    queryKey: ["team-performance", range],
    queryFn: () => api<{ data: TeamPerformance }>("portal/team-performance", { query: range }).then((response) => response.data),
  });

  const members = performance.data?.members ?? [];
  const best = (key: NumericKey) => Math.max(0, ...members.map((member) => member[key]));

  const columns: ColumnsType<TeamMemberPerformance> = [
    {
      title: "Team member",
      fixed: "left",
      render: (_, member) => (
        <Flex align="center" gap={10}>
          <Avatar className="avatar-accent">{member.user.name.slice(0, 1).toUpperCase()}</Avatar>
          <div>
            <Link href={`/listings?user_id=${member.user.id}`} style={{ color: "inherit" }}>
              <Typography.Text strong>{member.user.name}</Typography.Text>
            </Link>
            <div>
              {member.user.account_type === "agency" ? (
                <Tag color="blue">Agency</Tag>
              ) : member.user.status === "active" ? (
                <Tag>Agent</Tag>
              ) : (
                <Tag color="default">Deactivated</Tag>
              )}
            </div>
          </div>
        </Flex>
      ),
    },
    ...NUMBER_COLUMNS.map((column) => ({
      title: column.hint ? (
        <span title={column.hint}>
          {column.title} <InfoCircleOutlined style={{ fontSize: 11, opacity: 0.6 }} />
        </span>
      ) : (
        column.title
      ),
      dataIndex: column.key,
      align: "right" as const,
      sorter: (a: TeamMemberPerformance, b: TeamMemberPerformance) => a[column.key] - b[column.key],
      render: (value: number) => {
        const top = best(column.key);

        return <span style={value > 0 && value === top && members.length > 1 ? { fontWeight: 700, color: "var(--accent)" } : undefined}>{value.toLocaleString("en-PK")}</span>;
      },
    })),
    {
      title: "Close rate",
      align: "right",
      sorter: (a, b) => (a.leads ? a.leads_closed / a.leads : 0) - (b.leads ? b.leads_closed / b.leads : 0),
      render: (_, member) => (member.leads > 0 ? `${Math.round((member.leads_closed / member.leads) * 100)}%` : "—"),
    },
  ];

  return (
    <>
      <PageHeader title="Team Performance" subtitle="Listings, leads and buyer activity for each person in your agency" extra={<DateRangeFilter value={range} onChange={setRange} />} />

      {performance.isError && isFeatureMissing(performance.error) ? (
        <UpgradePrompt
          title="Team performance is part of Analytics"
          description="Your plan does not include Analytics. Upgrade to compare your agents' listings, leads and deals side by side."
        />
      ) : performance.isError ? (
        <Alert
          type="error"
          showIcon
          title="Could not load team performance"
          description={errorMessage(performance.error)}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => performance.refetch()}>
              Try again
            </Button>
          }
        />
      ) : (
        <Card
          title={performance.data ? `${formatDate(performance.data.range.from)} – ${formatDate(performance.data.range.to)}` : "Team"}
          extra={<Typography.Text type="secondary">Top figure in each column is highlighted</Typography.Text>}
        >
          <Table
            rowKey={(member) => member.user.id}
            loading={performance.isLoading}
            dataSource={members}
            columns={columns}
            pagination={false}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: <Empty description="No team members yet" /> }}
          />
          <Typography.Paragraph type="secondary" style={{ margin: "12px 0 0", fontSize: 12 }}>
            Views and clicks are counted daily from when analytics launched, so earlier days show zero.
          </Typography.Paragraph>
        </Card>
      )}
    </>
  );
}
