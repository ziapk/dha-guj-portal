"use client";

import { AreaChartOutlined, CrownOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Col, Flex, Row, Skeleton, Statistic, Typography } from "antd";
import Link from "next/link";
import { DailyChart } from "@/components/daily-chart";
import { defaultRange } from "@/components/date-range-filter";
import { isFeatureMissing } from "@/components/upgrade-prompt";
import { api } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";
import type { ListingAnalytics } from "@/types/api";

/** Last 30 days of buyer activity for one listing, linking to the full analytics page. */
export function ListingAnalyticsCard({ propertyId }: { propertyId: number }) {
  const range = defaultRange();

  const analytics = useQuery({
    queryKey: ["analytics", { ...range, propertyId: String(propertyId) }],
    queryFn: () => api<{ data: ListingAnalytics }>("portal/analytics", { query: { ...range, property_id: propertyId } }).then((response) => response.data),
  });

  const link = (
    <Link href={`/analytics?property_id=${propertyId}`}>
      <Button size="small" icon={<AreaChartOutlined />}>
        Full analytics
      </Button>
    </Link>
  );

  return (
    <Card title="Last 30 days" extra={analytics.data ? link : undefined} style={{ marginBottom: 16 }}>
      {analytics.isLoading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : isFeatureMissing(analytics.error) ? (
        <Flex align="center" justify="space-between" gap={12} wrap>
          <Typography.Text type="secondary">Daily views, clicks and leads for this listing are part of Analytics, which your plan does not include.</Typography.Text>
          <Link href="/plan">
            <Button size="small" icon={<CrownOutlined />}>
              View plans
            </Button>
          </Link>
        </Flex>
      ) : analytics.isError || !analytics.data ? (
        <Typography.Text type="danger">{errorMessage(analytics.error)}</Typography.Text>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}>
              <Statistic title="Views" value={analytics.data.totals.views} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="Phone clicks" value={analytics.data.totals.phone_clicks} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="WhatsApp clicks" value={analytics.data.totals.whatsapp_clicks} />
            </Col>
            <Col xs={12} md={6}>
              <Statistic title="Leads" value={analytics.data.totals.leads} />
            </Col>
          </Row>
          <div style={{ marginTop: 16 }}>
            <DailyChart label="Views" height={160} data={analytics.data.daily.map((day) => ({ date: day.date, value: day.views }))} />
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Daily counting started when analytics launched; earlier days show zero.
          </Typography.Text>
        </>
      )}
    </Card>
  );
}
