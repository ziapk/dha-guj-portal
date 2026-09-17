"use client";

import {
  ApartmentOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  EyeOutlined,
  FieldTimeOutlined,
  HomeOutlined,
  MessageOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Avatar, Button, Card, Col, Empty, Flex, Row, Skeleton, Statistic, Tag, Typography } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { QuotaCard } from "@/components/quota-card";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS, PROPERTY_STATUS_COLORS, PROPERTY_STATUS_LABELS, formatCompactPrice, formatDate, formatProjectPrice } from "@/lib/labels";
import { coverPhoto, thumbnailUrl } from "@/lib/media";
import type { Paginated, PortalDashboard, Project, Property, PropertyStatus } from "@/types/api";

/** Order of the status rows; matches the listings tabs. */
const STATUS_ORDER: PropertyStatus[] = ["published", "pending", "changes_requested", "draft", "rejected", "expired", "sold", "rented"];

function greeting(): string {
  const hour = new Date().getHours();

  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/** "Today", "Tomorrow" or "In 5 days" with a colour that gets warmer as the date gets closer. */
function DaysLeftTag({ date }: { date: string }) {
  const days = dayjs(date).startOf("day").diff(dayjs().startOf("day"), "day");
  const label = days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;

  return <Tag color={days <= 1 ? "red" : days <= 3 ? "orange" : "gold"}>{label}</Tag>;
}

function KpiCard({ title, value, loading, icon, color, href }: { title: string; value: ReactNode; loading: boolean; icon: ReactNode; color: string; href: string }) {
  const router = useRouter();

  return (
    <Card hoverable onClick={() => router.push(href)} style={{ height: "100%" }}>
      <Flex justify="space-between" align="flex-start" gap={12}>
        <Statistic title={title} value={value as number} loading={loading} />
        <span className="kpi-icon" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
          {icon}
        </span>
      </Flex>
      <div className="kpi-link" style={{ marginTop: 12 }}>
        View <ArrowRightOutlined />
      </div>
    </Card>
  );
}

/** A label and a number that links somewhere, used in the status, leads and stats cards. */
function CountRow({ label, value, href }: { label: ReactNode; value: number; href?: string }) {
  const content = (
    <>
      <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
      <Typography.Text strong>{value.toLocaleString("en-PK")}</Typography.Text>
      {href && <ArrowRightOutlined className="kpi-link" />}
    </>
  );

  return href ? (
    <Link href={href} className="activity-item count-row" style={{ color: "inherit", alignItems: "center" }}>
      {content}
    </Link>
  ) : (
    <div className="activity-item count-row" style={{ alignItems: "center" }}>
      {content}
    </div>
  );
}

export default function DashboardPage() {
  const { data: me } = useMe();

  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<{ data: PortalDashboard }>("portal/dashboard").then((response) => response.data),
  });

  const recent = useQuery({
    queryKey: ["listings", "recent"],
    queryFn: () => api<Paginated<Property>>("portal/properties", { query: { per_page: 5 } }).then((page) => page.data),
  });

  const data = dashboard.data;
  const loading = dashboard.isLoading;
  const isAgency = me?.account_type === "agency";
  const isAgent = me?.account_type === "agent";
  const isDeveloper = me?.account_type === "developer";

  // Developers also see their latest projects.
  const projects = useQuery({
    queryKey: ["projects", "recent"],
    queryFn: () => api<Paginated<Project>>("portal/projects", { query: { per_page: 5 } }),
    enabled: isDeveloper,
  });

  const listingCredits = data?.quotas.find((quota) => quota.code === "LISTING");
  const creditsValue = !listingCredits ? 0 : listingCredits.is_unlimited ? "∞" : (listingCredits.remaining ?? 0);
  // Features that are simply included (on/off) are shown on the plan page; here we show balances.
  const balances = (data?.quotas ?? []).filter((quota) => quota.type !== "boolean");

  return (
    <>
      <div className="hero" style={{ marginBottom: 24 }}>
        <Flex justify="space-between" align="center" gap={20} wrap>
          <div>
            <Typography.Title level={2}>
              {greeting()}, {me?.name.split(" ")[0] ?? "there"} 👋
            </Typography.Title>
            <p>
              {isAgency
                ? "Your whole team's listings, leads and plan credits at a glance."
                : isDeveloper
                  ? "Manage your projects and listings and keep an eye on your plan credits."
                  : "Manage your listings and keep an eye on your plan credits."}
            </p>
          </div>
          <Flex gap={10} wrap className="hero-actions">
            {isDeveloper && (
              <Link href="/projects/new">
                <Button className="hero-primary" icon={<PlusOutlined />}>
                  Add project
                </Button>
              </Link>
            )}
            {isDeveloper && (
              <Link href="/projects">
                <Button icon={<ApartmentOutlined />}>My projects</Button>
              </Link>
            )}
            <Link href="/listings/new">
              <Button className={isDeveloper ? undefined : "hero-primary"} icon={<PlusOutlined />}>
                Add listing
              </Button>
            </Link>
            <Link href="/listings">
              <Button icon={<HomeOutlined />}>My listings</Button>
            </Link>
            <Link href="/plan">
              <Button icon={<CrownOutlined />}>Plan & quota</Button>
            </Link>
          </Flex>
        </Flex>
      </div>

      {dashboard.isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          title="Could not load your dashboard"
          description={errorMessage(dashboard.error)}
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={() => dashboard.refetch()}>
              Try again
            </Button>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard title="Live listings" value={data?.listings.by_status.published ?? 0} loading={loading} icon={<HomeOutlined />} color="#10b981" href="/listings?status=published" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard title="Under review" value={data?.listings.by_status.pending ?? 0} loading={loading} icon={<ClockCircleOutlined />} color="#f59e0b" href="/listings?status=pending" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard title="New leads" value={data?.leads.new ?? 0} loading={loading} icon={<MessageOutlined />} color="#0ea5e9" href="/leads" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard title="Listing credits left" value={creditsValue} loading={loading} icon={<ThunderboltOutlined />} color="var(--accent)" href="/plan" />
        </Col>
      </Row>

      {(data?.listings.by_status.changes_requested ?? 0) > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
          title={`${data?.listings.by_status.changes_requested} listing${data?.listings.by_status.changes_requested === 1 ? " needs" : "s need"} changes before going live`}
          description="Our team left a note on each one. Resubmitting after you make the changes is free."
          action={
            <Link href="/listings?status=changes_requested">
              <Button size="small">Review</Button>
            </Link>
          }
        />
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12} xl={8}>
          <Card title="Listings by status" extra={<Link href="/listings">All ({data?.listings.total ?? 0})</Link>} style={{ height: "100%" }}>
            {loading ? (
              <Skeleton active />
            ) : !data || data.listings.total === 0 ? (
              <Empty description="No listings yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              STATUS_ORDER.map((status) => (
                <CountRow
                  key={status}
                  href={`/listings?status=${status}`}
                  value={data.listings.by_status[status] ?? 0}
                  label={<Tag color={PROPERTY_STATUS_COLORS[status]}>{PROPERTY_STATUS_LABELS[status]}</Tag>}
                />
              ))
            )}
          </Card>
        </Col>

        <Col xs={24} md={12} xl={8}>
          <Card title="Leads" extra={<Link href="/leads?status=all">All leads</Link>} style={{ marginBottom: 16 }}>
            {loading || !data ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : (
              <>
                <CountRow label="New (not contacted yet)" value={data.leads.new} href="/leads" />
                <CountRow label="This month" value={data.leads.this_month} href="/leads?status=all" />
                <CountRow label="All time" value={data.leads.total} href="/leads?status=all" />
              </>
            )}
          </Card>
          <Card title="Buyer interest" extra={<Typography.Text type="secondary">All listings</Typography.Text>}>
            {loading || !data ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : (
              <>
                <CountRow label={<><EyeOutlined /> Views</>} value={data.stats.views} />
                <CountRow label={<><PhoneOutlined /> Phone clicks</>} value={data.stats.phone_clicks} />
                <CountRow label={<><WhatsAppOutlined /> WhatsApp clicks</>} value={data.stats.whatsapp_clicks} />
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            title={
              <Flex align="center" gap={8}>
                <FieldTimeOutlined /> Expiring soon
              </Flex>
            }
            extra={<Typography.Text type="secondary">Next 7 days</Typography.Text>}
            style={{ height: "100%" }}
          >
            {loading || !data ? (
              <Skeleton active />
            ) : data.expiring.listings.length === 0 && data.expiring.subscriptions.length === 0 ? (
              <Empty description="Nothing expires in the next 7 days" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <>
                {data.expiring.subscriptions.map((subscription) => (
                  <div key={`plan-${subscription.id}`} className="activity-item" style={{ alignItems: "center", flexWrap: "wrap" }}>
                    <CrownOutlined style={{ color: "var(--accent)" }} />
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <Typography.Text strong style={{ display: "block" }}>
                        {subscription.offer_name ?? "Your plan"}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                        Plan ends {formatDate(subscription.ends_at)}
                      </Typography.Text>
                    </div>
                    <DaysLeftTag date={subscription.ends_at} />
                    {!isAgent && (
                      <Link href="/plan">
                        <Button size="small" type="primary">
                          Renew
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
                {data.expiring.listings.map((listing) => (
                  <Link key={`listing-${listing.id}`} href={`/listings/${listing.id}`} className="activity-item" style={{ color: "inherit", alignItems: "center" }}>
                    <HomeOutlined style={{ color: "#10b981" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Typography.Text strong ellipsis style={{ display: "block" }}>
                        {listing.title}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                        Live until {formatDate(listing.expires_at)}
                      </Typography.Text>
                    </div>
                    <DaysLeftTag date={listing.expires_at} />
                  </Link>
                ))}
                {isAgent && data.expiring.subscriptions.length > 0 && (
                  <Typography.Paragraph type="secondary" style={{ margin: "8px 0 0", fontSize: 13 }}>
                    Ask your agency to renew the plan.
                  </Typography.Paragraph>
                )}
              </>
            )}
          </Card>
        </Col>
      </Row>

      <Card title={isAgent ? "Your agency's credits" : "Your credits"} extra={<Link href="/plan">Plan details</Link>} style={{ marginTop: 16 }}>
        {loading ? (
          <Skeleton active />
        ) : balances.length === 0 ? (
          <Empty description="No active plan.">
            {!isAgent && (
              <Link href="/plan">
                <Button type="primary" icon={<CrownOutlined />}>
                  See plans
                </Button>
              </Link>
            )}
          </Empty>
        ) : (
          <Row gutter={[12, 12]}>
            {balances.map((quota) => (
              <Col key={quota.code} xs={24} sm={12} lg={8} xl={6}>
                <QuotaCard quota={quota} usage />
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {isDeveloper && (
        <Card title="Recent projects" extra={<Link href="/projects">All projects ({projects.data?.meta.total ?? 0})</Link>} style={{ marginTop: 16 }}>
          {projects.isLoading ? (
            <Skeleton active />
          ) : projects.isError ? (
            <Alert type="error" showIcon title="Could not load your projects" description={errorMessage(projects.error)} />
          ) : (projects.data?.data ?? []).length === 0 ? (
            <Empty description="You have no projects yet">
              <Link href="/projects/new">
                <Button type="primary" icon={<PlusOutlined />}>
                  Add your first project
                </Button>
              </Link>
            </Empty>
          ) : (
            projects.data?.data.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="activity-item" style={{ color: "inherit", alignItems: "center" }}>
                <Avatar shape="square" size={52} src={project.cover_url ?? undefined} icon={<ApartmentOutlined />} style={{ borderRadius: 10, flex: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Typography.Text strong ellipsis style={{ display: "block" }}>
                    {project.name}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {formatProjectPrice(project.price_from, project.price_to)} · {project.city?.name}
                    {project.society ? `, ${project.society.name}` : ""}
                    {(project.leads_count ?? 0) > 0 && ` · ${project.leads_count} lead${project.leads_count === 1 ? "" : "s"}`}
                  </Typography.Text>
                </div>
                <Tag color={PROJECT_STATUS_COLORS[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Tag>
              </Link>
            ))
          )}
        </Card>
      )}

      <Card title="Recent listings" extra={<Link href="/listings">All listings</Link>} style={{ marginTop: 16 }}>
        {recent.isLoading ? (
          <Skeleton active />
        ) : recent.isError ? (
          <Alert type="error" showIcon title="Could not load your recent listings" description={errorMessage(recent.error)} />
        ) : (recent.data ?? []).length === 0 ? (
          <Empty description="You have no listings yet">
            <Link href="/listings/new">
              <Button type="primary" icon={<PlusOutlined />}>
                Add your first listing
              </Button>
            </Link>
          </Empty>
        ) : (
          recent.data?.map((property) => {
            const cover = coverPhoto(property.media);

            return (
              <Link key={property.id} href={`/listings/${property.id}`} className="activity-item" style={{ color: "inherit", alignItems: "center" }}>
                <Avatar shape="square" size={52} src={thumbnailUrl(cover)} icon={<HomeOutlined />} style={{ borderRadius: 10, flex: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Typography.Text strong ellipsis style={{ display: "block" }}>
                    {property.title}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {formatCompactPrice(property.price)} · {property.city?.name}
                    {property.society ? `, ${property.society.name}` : ""}
                  </Typography.Text>
                </div>
                <Tag color={PROPERTY_STATUS_COLORS[property.status]}>{PROPERTY_STATUS_LABELS[property.status]}</Tag>
              </Link>
            );
          })
        )}
      </Card>
    </>
  );
}
