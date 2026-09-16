"use client";

import { DeleteOutlined, InboxOutlined, LinkOutlined, NotificationOutlined, PictureOutlined, PlusOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Avatar, Button, Card, Empty, Flex, Form, Input, Modal, Popconfirm, Radio, Result, Table, Tag, Tooltip, Typography, Upload, type UploadFile } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useMe } from "@/hooks/use-me";
import { remainingFor, useQuotas } from "@/hooks/use-quotas";
import { ApiError, api, apiUpload } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import { BANNER_PLACEMENT_HINTS, BANNER_PLACEMENT_LABELS, BANNER_STATUS_COLORS, BANNER_STATUS_LABELS, formatDate } from "@/lib/labels";
import type { Banner, BannerPlacement, BannerStatus, Collection, Resource } from "@/types/api";

const MAX_IMAGE_MB = 4;
const PLACEMENTS = Object.keys(BANNER_PLACEMENT_LABELS) as BannerPlacement[];

type BannerValues = { title: string; placement: BannerPlacement; link_url?: string; image: UploadFile[] };

function RequestBannerModal({ onClose, onQuotaExceeded }: { onClose: () => void; onQuotaExceeded: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<BannerValues>();
  const placement = Form.useWatch("placement", form);

  const create = useMutation({
    mutationFn: (values: BannerValues) => {
      const formData = new FormData();
      formData.append("title", values.title.trim());
      formData.append("placement", values.placement);

      if (values.link_url?.trim()) {
        formData.append("link_url", values.link_url.trim());
      }

      formData.append("image", values.image[0].originFileObj as Blob);

      return apiUpload<Resource<Banner>>("portal/banners", formData);
    },
    onSuccess: () => {
      message.success("Banner sent for review. It starts running once our team approves it.");
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "QUOTA_EXCEEDED") {
        onClose();
        onQuotaExceeded();

        return;
      }

      if (!applyFormErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  return (
    <Modal open title="Request a banner" okText="Send for review" confirmLoading={create.isPending} onOk={() => form.submit()} onCancel={onClose} width={640}>
      <Typography.Paragraph type="secondary">
        Our team checks every banner before it runs. One Banner Ads credit is used when it is approved; rejected requests use nothing.
      </Typography.Paragraph>

      <Form form={form} layout="vertical" requiredMark={false} initialValues={{ placement: "home_top" }} onFinish={(values) => create.mutate(values)}>
        <Form.Item name="title" label="Title" extra="For your records and as the image description for screen readers." rules={[{ required: true, whitespace: true, message: "Enter a title" }, { max: 150 }]}>
          <Input placeholder="e.g. Plots available in Phase 2 — call now" />
        </Form.Item>

        <Form.Item name="placement" label="Where should it show?" rules={[{ required: true }]}>
          <Radio.Group style={{ width: "100%" }}>
            <Flex vertical gap={8}>
              {PLACEMENTS.map((value) => (
                <div key={value} className={`placement-option${placement === value ? " active" : ""}`} onClick={() => form.setFieldValue("placement", value)}>
                  <Radio value={value}>
                    <Typography.Text strong>{BANNER_PLACEMENT_LABELS[value]}</Typography.Text>
                  </Radio>
                  <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginInlineStart: 24 }}>
                    {BANNER_PLACEMENT_HINTS[value]}
                  </Typography.Text>
                </div>
              ))}
            </Flex>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="link_url"
          label="Link (optional)"
          extra="Where people go when they click, e.g. your agency page or a listing."
          rules={[{ type: "url", message: "Enter a full address starting with https://" }, { max: 255 }]}
        >
          <Input prefix={<LinkOutlined />} placeholder="https://" />
        </Form.Item>

        <Form.Item
          name="image"
          label="Banner image"
          valuePropName="fileList"
          getValueFromEvent={(event: { fileList: UploadFile[] }) => event.fileList.slice(-1)}
          extra={`JPG, PNG or WebP up to ${MAX_IMAGE_MB} MB. ${placement ? BANNER_PLACEMENT_HINTS[placement].split(". ").pop() : ""} Keep text large and short so it reads on phones.`}
          rules={[
            { required: true, message: "Choose an image" },
            {
              validator: (_, files?: UploadFile[]) =>
                files?.[0]?.size && files[0].size > MAX_IMAGE_MB * 1024 * 1024 ? Promise.reject(new Error(`The image is larger than ${MAX_IMAGE_MB} MB`)) : Promise.resolve(),
            },
          ]}
        >
          <Upload.Dragger accept="image/jpeg,image/png,image/webp" maxCount={1} listType="picture" beforeUpload={() => false}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drop your banner image here</p>
          </Upload.Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function BannersPage() {
  const { data: me } = useMe();

  if (me?.account_type === "agent") {
    return (
      <>
        <PageHeader title="Banner Ads" />
        <Card>
          <Result icon={<NotificationOutlined />} title="Your agency manages banner ads" subTitle={`Ask ${me.agency?.name ?? "your agency"} if you would like to advertise with a banner.`} />
        </Card>
      </>
    );
  }

  return <BannersContent />;
}

function BannersContent() {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const quotas = useQuotas();
  const [requesting, setRequesting] = useState(false);

  const banners = useQuery({
    queryKey: ["banners"],
    queryFn: () => api<Collection<Banner>>("portal/banners").then((response) => response.data),
  });

  const withdraw = useMutation({
    mutationFn: (banner: Banner) => api(`portal/banners/${banner.id}`, { method: "DELETE" }),
    onSuccess: (_, banner) => {
      message.success(banner.status === "pending" ? "Request withdrawn" : "Banner deleted");
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  // Pending requests already have a credit set aside for them, as the API counts it.
  const pendingCount = (banners.data ?? []).filter((banner) => banner.status === "pending").length;
  const remaining = remainingFor(quotas.data, "BANNER_ADS");
  const available = remaining === null ? null : Math.max(0, remaining - pendingCount);

  function goBuy() {
    modal.confirm({
      title: "No Banner Ads credits available",
      content:
        pendingCount > 0
          ? `Your credits are set aside for ${pendingCount} request${pendingCount === 1 ? "" : "s"} under review. Buy more Banner Ads credits to request another banner.`
          : "Your plan has no Banner Ads credits. Upgrade or buy an add-on to advertise with a banner.",
      okText: "View plans",
      cancelText: "Close",
      onOk: () => router.push("/plan"),
    });
  }

  const columns: ColumnsType<Banner> = [
    {
      title: "Banner",
      render: (_, banner) => (
        <Flex align="center" gap={12}>
          <Avatar shape="square" size={56} src={banner.image_url ?? undefined} icon={<PictureOutlined />} style={{ width: 96, borderRadius: 8, flex: "none" }} alt={banner.title} />
          <div style={{ minWidth: 0 }}>
            <Typography.Text strong ellipsis style={{ display: "block", maxWidth: 260 }}>
              {banner.title}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {BANNER_PLACEMENT_LABELS[banner.placement] ?? banner.placement}
            </Typography.Text>
            {banner.link_url && (
              <div>
                <Typography.Link href={banner.link_url} target="_blank" rel="noopener noreferrer" ellipsis style={{ fontSize: 12, maxWidth: 260 }}>
                  <LinkOutlined /> {banner.link_url}
                </Typography.Link>
              </div>
            )}
          </div>
        </Flex>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: BannerStatus, banner) => (
        <>
          <Tag color={BANNER_STATUS_COLORS[status]}>{BANNER_STATUS_LABELS[status] ?? status}</Tag>
          {status === "rejected" && banner.rejection_reason && (
            <Typography.Paragraph type="danger" style={{ margin: "4px 0 0", fontSize: 12, maxWidth: 240 }}>
              {banner.rejection_reason}
            </Typography.Paragraph>
          )}
        </>
      ),
    },
    {
      title: "Runs",
      render: (_, banner) =>
        banner.starts_at || banner.ends_at ? (
          <span style={{ whiteSpace: "nowrap" }}>
            {formatDate(banner.starts_at)} – {formatDate(banner.ends_at)}
          </span>
        ) : (
          <Typography.Text type="secondary">{banner.status === "pending" ? "Starts when approved" : "—"}</Typography.Text>
        ),
    },
    { title: "Impressions", dataIndex: "impressions", align: "right", render: (value: number) => (value ?? 0).toLocaleString("en-PK") },
    { title: "Clicks", dataIndex: "clicks", align: "right", render: (value: number) => (value ?? 0).toLocaleString("en-PK") },
    {
      title: <Tooltip title="Click-through rate: clicks ÷ impressions">CTR</Tooltip>,
      align: "right",
      render: (_, banner) => (banner.impressions > 0 ? `${((banner.clicks / banner.impressions) * 100).toFixed(1)}%` : "—"),
    },
    {
      title: "Requested",
      dataIndex: "created_at",
      render: (value: string) => formatDate(value),
    },
    {
      title: "",
      align: "right",
      render: (_, banner) =>
        banner.status === "pending" || banner.status === "rejected" ? (
          <Popconfirm
            title={banner.status === "pending" ? "Withdraw this request?" : "Delete this rejected banner?"}
            description="No credit is used."
            okText={banner.status === "pending" ? "Withdraw" : "Delete"}
            okButtonProps={{ danger: true }}
            onConfirm={() => withdraw.mutateAsync(banner)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} loading={withdraw.isPending && withdraw.variables?.id === banner.id}>
              {banner.status === "pending" ? "Withdraw" : "Delete"}
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Banner Ads"
        subtitle="Advertise your agency or listings with image banners across the website"
        extra={
          <Flex gap={8} align="center" wrap>
            <Tag icon={<ThunderboltOutlined />} color={available === 0 ? "red" : "blue"} style={{ padding: "4px 10px", fontSize: 13, margin: 0 }}>
              {quotas.isLoading || banners.isLoading ? "Checking credits…" : available === null ? "Unlimited banner credits" : `${available} banner credit${available === 1 ? "" : "s"} available`}
            </Tag>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => (available === 0 ? goBuy() : setRequesting(true))}>
              Request a banner
            </Button>
          </Flex>
        }
      />

      <Card>
        <Table
          rowKey="id"
          loading={banners.isLoading}
          dataSource={banners.data}
          columns={columns}
          pagination={false}
          scroll={{ x: "max-content" }}
          locale={{
            emptyText: (
              <Empty image={<NotificationOutlined style={{ fontSize: 44, color: "var(--app-muted)" }} />} description="No banners yet">
                <Typography.Text type="secondary">Request a banner to put your agency in front of every buyer on the website.</Typography.Text>
              </Empty>
            ),
          }}
        />
        {banners.isError && <Alert type="error" showIcon style={{ marginTop: 16 }} title="Could not load your banners" description={errorMessage(banners.error)} />}
      </Card>

      {requesting && <RequestBannerModal onClose={() => setRequesting(false)} onQuotaExceeded={goBuy} />}
    </>
  );
}
