"use client";

import {
  EnvironmentOutlined,
  EyeInvisibleOutlined,
  FilterOutlined,
  HomeOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  ThunderboltOutlined,
  UnlockOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Col, Empty, Flex, InputNumber, Pagination, Row, Select, Skeleton, Tag, Typography } from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useMe } from "@/hooks/use-me";
import { remainingFor, useQuotas } from "@/hooks/use-quotas";
import { ApiError, api } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";
import { AREA_UNIT_LABELS, PROPERTY_PURPOSE_LABELS, formatDate, formatPriceRange, toOptions } from "@/lib/labels";
import { whatsappNumber } from "@/lib/phone";
import type { City, Collection, Paginated, PropertyPurpose, PropertyType, Resource, Society, WantedPost } from "@/types/api";

dayjs.extend(relativeTime);

type Filters = { purpose?: PropertyPurpose; city_id?: number; society_id?: number; property_type_id?: number; budget?: number };

function areaRange(post: WantedPost): string | null {
  const unit = post.area_unit ? ` ${AREA_UNIT_LABELS[post.area_unit]}` : "";
  const min = post.min_area ? Number(post.min_area) : null;
  const max = post.max_area ? Number(post.max_area) : null;

  if (min && max) {
    return min === max ? `${min}${unit}` : `${min}–${max}${unit}`;
  }

  return max ? `Up to ${max}${unit}` : min ? `From ${min}${unit}` : null;
}

function ContactDetails({ post }: { post: WantedPost }) {
  if (!post.contact) {
    return null;
  }

  const { name, phone, email } = post.contact;

  return (
    <div className="wanted-contact">
      <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
        <UnlockOutlined /> {name}
      </Typography.Text>
      <Flex gap={8} wrap>
        <Button size="small" type="primary" icon={<PhoneOutlined />} href={`tel:${phone}`}>
          {phone}
        </Button>
        <Button
          size="small"
          icon={<WhatsAppOutlined />}
          style={{ background: "#25d366", borderColor: "#25d366", color: "#fff" }}
          href={`https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(`Hi ${name}, I saw your property requirement on DHA GUJ and may have something that suits you.`)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </Button>
        {email && (
          <Button size="small" icon={<MailOutlined />} href={`mailto:${email}?subject=${encodeURIComponent("Your property requirement on DHA GUJ")}`}>
            Email
          </Button>
        )}
      </Flex>
    </div>
  );
}

function RequirementCard({ post, unlocking, onUnlock }: { post: WantedPost; unlocking: boolean; onUnlock: (post: WantedPost) => void }) {
  const area = areaRange(post);
  const location = [post.phase, post.society?.name, post.city?.name].filter(Boolean).join(", ");

  return (
    <Card style={{ height: "100%" }} styles={{ body: { display: "flex", flexDirection: "column", height: "100%" } }}>
      <Flex justify="space-between" align="flex-start" gap={8}>
        <Flex gap={6} wrap>
          <Tag color={post.purpose === "sale" ? "blue" : "cyan"}>{post.purpose === "sale" ? "Wants to buy" : "Wants to rent"}</Tag>
          {post.property_type && <Tag>{post.property_type.name}</Tag>}
        </Flex>
        <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }} title={formatDate(post.created_at, true)}>
          {dayjs(post.created_at).fromNow()}
        </Typography.Text>
      </Flex>

      <div className="listing-price" style={{ margin: "10px 0 4px" }}>
        {formatPriceRange(post.min_price, post.max_price)}
      </div>

      <div className="listing-meta" style={{ marginBottom: 8 }}>
        <span>
          <EnvironmentOutlined /> {location || "Any location"}
        </span>
        {area && <span>{area}</span>}
        {post.bedrooms !== null && <span>{post.bedrooms}+ beds</span>}
      </div>

      <Typography.Paragraph ellipsis={{ rows: 3, expandable: "collapsible" }} style={{ marginBottom: 12, whiteSpace: "pre-line" }}>
        {post.description}
      </Typography.Paragraph>

      <div style={{ marginTop: "auto" }}>
        {post.contact ? (
          <ContactDetails post={post} />
        ) : (
          <Button block icon={<LockOutlined />} loading={unlocking} onClick={() => onUnlock(post)}>
            Unlock contact (uses 1 Lead Access credit)
          </Button>
        )}
        {post.expires_at && (
          <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 8 }}>
            Open until {formatDate(post.expires_at)}
          </Typography.Text>
        )}
      </div>
    </Card>
  );
}

export default function BuyerRequirementsPage() {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const quotas = useQuotas();
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);
  const isAgent = me?.account_type === "agent";
  const creditsLeft = remainingFor(quotas.data, "LEAD_ACCESS");

  const posts = useQuery({
    queryKey: ["wanted-posts", filters, page],
    queryFn: () => api<Paginated<WantedPost>>("portal/wanted-posts", { query: { ...filters, page, per_page: 12 } }),
  });

  const cities = useQuery({
    queryKey: ["master", "cities"],
    queryFn: () => api<Collection<City>>("public/cities").then((response) => response.data),
  });

  const societies = useQuery({
    queryKey: ["master", "societies", filters.city_id],
    queryFn: () => api<Collection<Society>>("public/societies", { query: { city_id: filters.city_id } }).then((response) => response.data),
    enabled: filters.city_id !== undefined,
  });

  const propertyTypes = useQuery({
    queryKey: ["master", "property-types"],
    queryFn: () => api<Collection<PropertyType>>("public/property-types").then((response) => response.data),
  });

  function update(next: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  }

  function goBuy() {
    modal.confirm({
      title: "No Lead Access credits left",
      content: isAgent
        ? "Your agency's plan has no Lead Access credits left. Ask your agency to upgrade or buy an add-on."
        : "Your plan has no Lead Access credits left. Upgrade or buy an add-on to see buyers' contact details.",
      okText: "View plans",
      cancelText: "Close",
      onOk: () => router.push("/plan"),
    });
  }

  const unlock = useMutation({
    mutationFn: (post: WantedPost) => api<Resource<WantedPost>>(`portal/wanted-posts/${post.id}/unlock`, { method: "POST" }),
    onSuccess: (response) => {
      queryClient.setQueryData<Paginated<WantedPost>>(["wanted-posts", filters, page], (current) =>
        current ? { ...current, data: current.data.map((item) => (item.id === response.data.id ? { ...item, ...response.data } : item)) } : current,
      );
      queryClient.invalidateQueries({ queryKey: ["quotas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      message.success("Contact unlocked — reach out while the requirement is fresh.");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "QUOTA_EXCEEDED") {
        goBuy();

        return;
      }

      message.error(errorMessage(error));
    },
  });

  function confirmUnlock(post: WantedPost) {
    if (creditsLeft === 0) {
      goBuy();

      return;
    }

    modal.confirm({
      title: "Unlock this buyer's contact?",
      icon: <UnlockOutlined />,
      content: (
        <>
          This uses 1 Lead Access credit{creditsLeft === null ? "" : ` — you have ${creditsLeft} left`}
          {isAgent ? " on your agency's plan" : ""}. The contact then stays visible to {me && me.account_type !== "individual" ? "everyone in your agency" : "you"} at no extra cost.
        </>
      ),
      okText: "Unlock contact",
      onOk: () => unlock.mutateAsync(post).catch(() => undefined),
    });
  }

  const hasFilters = Object.values(filters).some((value) => value !== undefined && value !== null);

  return (
    <>
      <PageHeader
        title="Buyer Requirements"
        subtitle="People looking to buy or rent. Find a match for your listings and contact them first."
        extra={
          <Tag icon={<ThunderboltOutlined />} color={creditsLeft === 0 ? "red" : "blue"} style={{ padding: "4px 10px", fontSize: 13 }}>
            {quotas.isLoading ? "Checking credits…" : creditsLeft === null ? "Unlimited Lead Access credits" : `${creditsLeft} Lead Access credit${creditsLeft === 1 ? "" : "s"} left`}
          </Tag>
        }
      />

      {creditsLeft === 0 && !quotas.isLoading && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title="You can browse requirements, but unlocking a contact needs a Lead Access credit"
          action={
            <Link href="/plan">
              <Button size="small">{isAgent ? "See plan" : "View plans"}</Button>
            </Link>
          }
        />
      )}

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} lg={4}>
            <Select<PropertyPurpose>
              allowClear
              placeholder="Buy or rent"
              aria-label="Purpose"
              style={{ width: "100%" }}
              value={filters.purpose}
              options={toOptions(PROPERTY_PURPOSE_LABELS).map((option) => ({ ...option, label: option.value === "sale" ? "Buyers" : "Tenants" }))}
              onChange={(purpose) => update({ purpose })}
            />
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Select<number>
              allowClear
              showSearch={{ optionFilterProp: "label" }}
              placeholder="City"
              aria-label="City"
              style={{ width: "100%" }}
              loading={cities.isLoading}
              value={filters.city_id}
              options={(cities.data ?? []).map((city) => ({ value: city.id, label: city.name }))}
              onChange={(cityId) => update({ city_id: cityId, society_id: undefined })}
            />
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Select<number>
              allowClear
              showSearch={{ optionFilterProp: "label" }}
              placeholder={filters.city_id ? "Society" : "Choose a city first"}
              aria-label="Society"
              style={{ width: "100%" }}
              disabled={!filters.city_id}
              loading={societies.isLoading && filters.city_id !== undefined}
              value={filters.society_id}
              options={(societies.data ?? []).map((society) => ({ value: society.id, label: society.name }))}
              onChange={(societyId) => update({ society_id: societyId })}
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Select<number>
              allowClear
              showSearch={{ optionFilterProp: "label" }}
              placeholder="Property type"
              aria-label="Property type"
              style={{ width: "100%" }}
              loading={propertyTypes.isLoading}
              value={filters.property_type_id}
              options={(propertyTypes.data ?? []).map((type) => ({ value: type.id, label: type.name }))}
              onChange={(typeId) => update({ property_type_id: typeId })}
            />
          </Col>
          <Col xs={24} sm={16} lg={4}>
            <InputNumber<number>
              min={0}
              placeholder="Your asking price"
              aria-label="Budget: your asking price"
              style={{ width: "100%" }}
              prefix="Rs"
              value={filters.budget}
              formatter={(value) => (value ? Number(value).toLocaleString("en-PK") : "")}
              parser={(value) => Number((value ?? "").replace(/[^\d]/g, ""))}
              onChange={(budget) => update({ budget: budget || undefined })}
            />
          </Col>
          <Col xs={24} sm={8} lg={2}>
            <Button block icon={<FilterOutlined />} disabled={!hasFilters} onClick={() => update({ purpose: undefined, city_id: undefined, society_id: undefined, property_type_id: undefined, budget: undefined })}>
              Clear
            </Button>
          </Col>
        </Row>
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 8 }}>
          <EyeInvisibleOutlined /> Enter your asking price to see only buyers whose budget fits it. Contact details stay hidden until you unlock them.
        </Typography.Text>
      </Card>

      {posts.isLoading ? (
        <Skeleton active />
      ) : posts.isError ? (
        <Alert type="error" showIcon title="Could not load buyer requirements" description={errorMessage(posts.error)} />
      ) : (posts.data?.data ?? []).length === 0 ? (
        <Card>
          <Empty image={<HomeOutlined style={{ fontSize: 48, color: "var(--app-muted)" }} />} description={hasFilters ? "No open requirements match these filters" : "No open buyer requirements right now. Check back soon."} />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {posts.data?.data.map((post) => (
              <Col key={post.id} xs={24} md={12} xl={8}>
                <RequirementCard post={post} unlocking={unlock.isPending && unlock.variables?.id === post.id} onUnlock={confirmUnlock} />
              </Col>
            ))}
          </Row>
          <Flex justify="center" style={{ marginTop: 24 }}>
            <Pagination current={page} pageSize={posts.data?.meta.per_page ?? 12} total={posts.data?.meta.total ?? 0} onChange={setPage} hideOnSinglePage showSizeChanger={false} />
          </Flex>
        </>
      )}
    </>
  );
}
