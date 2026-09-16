"use client";

import { EnvironmentOutlined, FireOutlined, HomeOutlined, PlusOutlined, RocketOutlined, UserOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Col, Empty, Flex, Input, Pagination, Row, Select, Skeleton, Tabs, Tag, Typography } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ListingActions } from "@/components/listing-actions";
import { PageHeader } from "@/components/page-header";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api-client";
import { coverPhoto, thumbnailUrl } from "@/lib/media";
import { PROPERTY_PURPOSE_LABELS, PROPERTY_STATUS_COLORS, PROPERTY_STATUS_LABELS, formatArea, formatCompactPrice, formatDate } from "@/lib/labels";
import type { AgentsResponse, Paginated, Property, PropertyStatus } from "@/types/api";

const TABS: { key: PropertyStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "published", label: "Live" },
  { key: "pending", label: "Under review" },
  { key: "changes_requested", label: "Changes requested" },
  { key: "draft", label: "Drafts" },
  { key: "rejected", label: "Rejected" },
  { key: "expired", label: "Expired" },
  { key: "sold", label: "Sold" },
  { key: "rented", label: "Rented" },
];

function ListingCard({ property, showOwner = false }: { property: Property; showOwner?: boolean }) {
  const router = useRouter();
  const cover = coverPhoto(property.media);

  return (
    <Card
      hoverable
      className="listing-card"
      style={{ height: "100%" }}
      onClick={() => router.push(`/listings/${property.id}`)}
      cover={
        <div className="listing-cover" style={cover ? { backgroundImage: `url("${thumbnailUrl(cover)}")` } : undefined}>
          {!cover && <HomeOutlined />}
          <div className="listing-cover-badges">
            <Tag color={PROPERTY_STATUS_COLORS[property.status]} variant="solid">
              {PROPERTY_STATUS_LABELS[property.status]}
            </Tag>
            {property.is_hot && (
              <Tag color="volcano" variant="solid" icon={<FireOutlined />}>
                Hot
              </Tag>
            )}
            {property.is_featured && (
              <Tag color="gold" variant="solid" icon={<RocketOutlined />}>
                Featured
              </Tag>
            )}
          </div>
        </div>
      }
    >
      <Flex justify="space-between" align="baseline" gap={8}>
        <span className="listing-price">{formatCompactPrice(property.price)}</span>
        <Typography.Text type="secondary">{PROPERTY_PURPOSE_LABELS[property.purpose]}</Typography.Text>
      </Flex>
      <Typography.Paragraph strong ellipsis={{ rows: 1 }} style={{ margin: "4px 0" }}>
        {property.title}
      </Typography.Paragraph>
      {showOwner && property.owner && (
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
          <UserOutlined /> {property.owner.name}
        </Typography.Text>
      )}
      <div className="listing-meta">
        <span>
          <EnvironmentOutlined /> {property.society ? `${property.society.name}, ` : ""}
          {property.city?.name}
        </span>
        <span>{formatArea(property.area_size, property.area_unit)}</span>
        {property.bedrooms !== null && <span>{property.bedrooms} beds</span>}
        {property.bathrooms !== null && <span>{property.bathrooms} baths</span>}
        {(property.leads_count ?? 0) > 0 && <span>💬 {property.leads_count} lead{property.leads_count === 1 ? "" : "s"}</span>}
      </div>
      <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, margin: "8px 0 12px" }}>
        {property.status === "published" && property.expires_at
          ? `Live until ${formatDate(property.expires_at)}`
          : property.status === "pending"
            ? `Submitted ${formatDate(property.submitted_at)}`
            : `Updated ${formatDate(property.updated_at)}`}
        {property.status === "published" && property.is_hot && property.hot_until && ` · Hot until ${formatDate(property.hot_until)}`}
      </Typography.Text>
      {property.status === "rejected" && property.rejection_reason && (
        <Alert type="error" showIcon title={property.rejection_reason} style={{ marginBottom: 12 }} />
      )}
      {property.status === "changes_requested" && (
        <Alert
          type="warning"
          showIcon
          title="Changes requested"
          description={<Typography.Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>{property.rejection_reason ?? "Open the listing to see what to change."}</Typography.Paragraph>}
          style={{ marginBottom: 12 }}
        />
      )}
      <ListingActions property={property} compact />
    </Card>
  );
}

function ListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = (searchParams.get("status") ?? "all") as PropertyStatus | "all";
  const userId = searchParams.get("user_id") ?? undefined;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data: me } = useMe();
  const isAgency = me?.account_type === "agency";

  const listings = useQuery({
    queryKey: ["listings", { status, search, page, userId }],
    queryFn: () =>
      api<Paginated<Property>>("portal/properties", {
        query: { status: status === "all" ? undefined : status, search, page, per_page: 12, user_id: userId },
      }),
  });

  const agents = useQuery({
    queryKey: ["agents"],
    queryFn: () => api<AgentsResponse>("portal/agents"),
    enabled: isAgency,
  });

  function go(nextStatus: string, nextUserId?: string) {
    const params = new URLSearchParams();

    if (nextStatus !== "all") {
      params.set("status", nextStatus);
    }

    if (nextUserId) {
      params.set("user_id", nextUserId);
    }

    setPage(1);
    router.replace(params.toString() ? `/listings?${params.toString()}` : "/listings");
  }

  return (
    <>
      <PageHeader
        title={isAgency ? "Team Listings" : "My Listings"}
        subtitle={isAgency ? "Listings from your agency and your agents, from drafts to sold" : "Everything you have listed, from drafts to sold"}
        extra={
          <Link href="/listings/new">
            <Button type="primary" icon={<PlusOutlined />}>
              Add listing
            </Button>
          </Link>
        }
      />

      <Card styles={{ body: { paddingBottom: 0 } }} style={{ marginBottom: 16 }}>
        <Flex justify="space-between" align="center" gap={12} wrap>
          <Tabs
            activeKey={status}
            items={TABS.map((tab) => ({ key: tab.key, label: tab.label }))}
            onChange={(key) => go(key, userId)}
            style={{ marginBottom: 0, minWidth: 0, flex: 1 }}
          />
          <Input.Search
            placeholder="Search by title"
            allowClear
            style={{ maxWidth: 260, marginBottom: 12 }}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          {isAgency && (
            <Select<number>
              allowClear
              placeholder="Everyone in the team"
              aria-label="Filter by team member"
              style={{ minWidth: 200, marginBottom: 12 }}
              value={userId ? Number(userId) : undefined}
              options={[
                ...(me ? [{ value: me.id, label: `${me.name} (agency)` }] : []),
                ...(agents.data?.data ?? []).map((agent) => ({ value: agent.id, label: agent.name })),
              ]}
              onChange={(value) => go(status, value ? String(value) : undefined)}
            />
          )}
        </Flex>
      </Card>

      {listings.isLoading ? (
        <Skeleton active />
      ) : (listings.data?.data ?? []).length === 0 ? (
        <Card>
          <Empty description={status === "all" ? "You have not listed anything yet" : "No listings in this tab"}>
            <Link href="/listings/new">
              <Button type="primary" icon={<PlusOutlined />}>
                Add a listing
              </Button>
            </Link>
          </Empty>
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {listings.data?.data.map((property) => (
              <Col key={property.id} xs={24} md={12} xl={8}>
                <ListingCard property={property} showOwner={isAgency && property.owner?.id !== me?.id} />
              </Col>
            ))}
          </Row>
          <Flex justify="center" style={{ marginTop: 24 }}>
            <Pagination
              current={page}
              pageSize={listings.data?.meta.per_page ?? 12}
              total={listings.data?.meta.total ?? 0}
              onChange={setPage}
              hideOnSinglePage
            />
          </Flex>
        </>
      )}
    </>
  );
}

export default function ListingsPage() {
  return (
    <Suspense>
      <ListingsContent />
    </Suspense>
  );
}
