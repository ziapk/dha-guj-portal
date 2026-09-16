"use client";

import { EyeOutlined, FireOutlined, MessageOutlined, PhoneOutlined, SendOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Flex, Form, Result, Skeleton, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ListingActions } from "@/components/listing-actions";
import { ListingAnalyticsCard } from "@/components/listing-analytics-card";
import { ListingForm, formValuesToPayload, propertyToFormValues, type ListingFormValues } from "@/components/listing-form";
import { MediaManager } from "@/components/media-manager";
import { PageHeader } from "@/components/page-header";
import { useListingActions } from "@/hooks/use-listing-actions";
import { remainingFor, useQuotas } from "@/hooks/use-quotas";
import { api } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import { PROPERTY_STATUS_COLORS, PROPERTY_STATUS_LABELS, formatDate } from "@/lib/labels";
import type { Property, Resource } from "@/types/api";

function StatusBanner({ property, onResubmit }: { property: Property; onResubmit: () => void }) {
  const { goBuy, confirmRepost, submit } = useListingActions();
  const quotas = useQuotas();
  const listingsLeft = remainingFor(quotas.data, "LISTING");
  const submitting = submit.isPending && submit.variables?.id === property.id;

  switch (property.status) {
    case "draft":
      return <Alert type="info" showIcon title="Draft — add photos, then submit for review." description="Submitting uses 1 listing credit. Drafts are free." />;
    case "pending":
      return <Alert type="warning" showIcon title={`Under review since ${formatDate(property.submitted_at, true)}`} description="You can edit it again once an admin approves or rejects it." />;
    case "rejected":
      return <Alert type="error" showIcon title="Rejected by our team" description={`${property.rejection_reason ?? "No reason given."} Fix the listing and submit again — your credit was refunded.`} />;
    case "changes_requested":
      return (
        <Alert
          type="warning"
          showIcon
          title="Our team asked for changes before this listing can go live"
          description={
            <>
              <div className="admin-note">
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                  Note from our team
                </Typography.Text>
                <Typography.Paragraph style={{ margin: 0, whiteSpace: "pre-line" }}>{property.rejection_reason ?? "No details given. Contact us if you are unsure what to change."}</Typography.Paragraph>
              </div>
              <Typography.Paragraph style={{ margin: "12px 0" }}>
                Edit the listing below, then resubmit it. Resubmitting is free — no listing credit is used.
              </Typography.Paragraph>
              <Button type="primary" icon={<SendOutlined />} loading={submitting} onClick={onResubmit}>
                Resubmit for review
              </Button>
            </>
          }
        />
      );
    case "published":
      return (
        <Alert
          type="success"
          showIcon
          title={property.expires_at ? `Live until ${formatDate(property.expires_at)}` : "Live"}
          description={
            <Space size="large" wrap>
              <span>
                <EyeOutlined /> {property.views_count} views
              </span>
              <span>
                <PhoneOutlined /> {property.phone_clicks} calls
              </span>
              <span>
                <WhatsAppOutlined /> {property.whatsapp_clicks} WhatsApp
              </span>
              {property.is_featured && <Tag color="gold">Featured until {formatDate(property.featured_until)}</Tag>}
              {property.is_hot && (
                <Tag color="volcano" icon={<FireOutlined />}>
                  Hot until {formatDate(property.hot_until)}
                </Tag>
              )}
            </Space>
          }
        />
      );
    case "expired":
      return (
        <Alert
          type="warning"
          showIcon
          title={`Expired${property.expires_at ? ` on ${formatDate(property.expires_at)}` : ""}`}
          description={
            <>
              <Typography.Paragraph style={{ margin: "0 0 12px" }}>
                Re-post it to put it back in search. It goes through review again, and re-posting uses 1 listing credit
                {listingsLeft === null ? "." : ` (you have ${listingsLeft} left).`}
              </Typography.Paragraph>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={submitting}
                onClick={() => (listingsLeft === 0 ? goBuy("listing credits") : confirmRepost(property, listingsLeft))}
              >
                {listingsLeft === 0 ? "Buy listing credits" : `Re-post${listingsLeft === null ? "" : ` (${listingsLeft} left)`}`}
              </Button>
            </>
          }
        />
      );
    default:
      return <Alert type="info" showIcon title={`Marked as ${property.status} on ${formatDate(property.closed_at)}`} />;
  }
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ListingFormValues>();

  const listing = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api<Resource<Property>>(`portal/properties/${id}`).then((response) => response.data),
  });

  useEffect(() => {
    if (listing.data) {
      form.setFieldsValue(propertyToFormValues(listing.data));
    }
  }, [listing.data, form]);

  const save = useMutation({
    mutationFn: (values: ListingFormValues) =>
      api<Resource<Property>>(`portal/properties/${id}`, { method: "PATCH", body: formValuesToPayload(values) }),
    onSuccess: (response) => {
      message.success("Changes saved");
      queryClient.setQueryData(["listing", id], response.data);
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: (error) => {
      if (!applyFormErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  const { confirmResubmit } = useListingActions();

  /** Save unsaved edits first so the admin reviews the latest version; throws when the form is invalid or saving fails. */
  async function saveBeforeSubmit() {
    if (!form.isFieldsTouched()) {
      return;
    }

    const values = await form.validateFields();
    await save.mutateAsync(values);
  }

  async function resubmit() {
    if (!listing.data) {
      return;
    }

    try {
      await saveBeforeSubmit();
    } catch {
      return;
    }

    confirmResubmit(listing.data);
  }

  if (listing.isError) {
    return <Result status="404" title="Listing not found" extra={<Link href="/listings">Back to my listings</Link>} />;
  }

  if (!listing.data) {
    return <Skeleton active />;
  }

  const property = listing.data;
  const locked = property.status === "pending";

  return (
    <>
      <PageHeader
        title={
          <Flex align="center" gap={10} wrap>
            <span>{property.title}</span>
            <Tag color={PROPERTY_STATUS_COLORS[property.status]}>{PROPERTY_STATUS_LABELS[property.status]}</Tag>
            {property.is_hot && (
              <Tag color="volcano" icon={<FireOutlined />}>
                Hot
              </Tag>
            )}
          </Flex>
        }
        subtitle={`${property.city?.name ?? ""}${property.society ? ` · ${property.society.name}` : ""}`}
        extra={
          <Space wrap>
            {(property.leads_count ?? 0) > 0 && (
              <Link href={`/leads?status=all&property_id=${property.id}`}>
                <Button icon={<MessageOutlined />}>
                  {property.leads_count} lead{property.leads_count === 1 ? "" : "s"}
                </Button>
              </Link>
            )}
            <ListingActions property={property} onDeleted={() => router.push("/listings")} beforeSubmit={saveBeforeSubmit} />
            {!locked && (
              <Button type="primary" ghost loading={save.isPending} onClick={() => form.submit()}>
                Save changes
              </Button>
            )}
          </Space>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <StatusBanner property={property} onResubmit={() => void resubmit()} />
      </div>

      {property.published_at && <ListingAnalyticsCard propertyId={property.id} />}

      <MediaManager property={property} disabled={locked} />

      <Typography.Title level={4} style={{ margin: "24px 0 12px" }}>
        Listing details
      </Typography.Title>
      <ListingForm form={form} disabled={locked} onFinish={(values) => save.mutate(values)} />
    </>
  );
}
