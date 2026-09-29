"use client";

import { ExportOutlined, SafetyCertificateFilled, ShopOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Avatar, Button, Card, Col, Flex, Form, Image, Input, InputNumber, Row, Select, Skeleton, Tag, Typography, Upload } from "antd";
import Link from "next/link";
import { useState } from "react";
import { AgencyVerification } from "@/components/agency-verification";
import { PageHeader } from "@/components/page-header";
import { api, apiUpload } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import { PROFILE_STATUS_COLORS, PROFILE_STATUS_LABELS } from "@/lib/labels";
import type { AgencyProfile, City, Collection, Resource } from "@/types/api";

type AgencyResponse = Resource<AgencyProfile> & { is_listed: boolean; public_url: string | null };

type AgencyValues = {
  name: string;
  city_id: number | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  about: string | null;
  established_year: number | null;
  service_areas: string | null;
  facebook: string | null;
  instagram: string | null;
  youtube: string | null;
  tiktok: string | null;
  linkedin: string | null;
};

const SOCIAL_FIELDS = [
  { name: "facebook", label: "Facebook" },
  { name: "instagram", label: "Instagram" },
  { name: "youtube", label: "YouTube" },
  { name: "tiktok", label: "TikTok" },
  { name: "linkedin", label: "LinkedIn" },
] as const;

/** Upload one agency image (logo or cover) and put the updated profile in the cache. */
function ImageUpload({ field, label, disabled, accept = "image/png,image/jpeg,image/webp" }: { field: "logo" | "cover"; label: string; disabled: boolean; accept?: string }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  return (
    <Upload
      accept={accept}
      showUploadList={false}
      disabled={disabled || uploading}
      customRequest={({ file, onSuccess, onError }) => {
        const formData = new FormData();
        formData.append(field, file as Blob);
        setUploading(true);

        apiUpload<Resource<AgencyProfile>>(`portal/agency/${field}`, formData)
          .then((result) => {
            queryClient.setQueryData<AgencyResponse>(["agency"], (old) => (old ? { ...old, data: result.data } : old));
            message.success(field === "logo" ? "Logo updated" : "Cover photo updated");
            onSuccess?.(result);
          })
          .catch((error: Error) => {
            message.error(errorMessage(error));
            onError?.(error);
          })
          .finally(() => setUploading(false));
      }}
    >
      <Button icon={<UploadOutlined />} loading={uploading} disabled={disabled}>
        {label}
      </Button>
    </Upload>
  );
}

function AgencyForm({ response }: { response: AgencyResponse }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<AgencyValues>();
  const profile = response.data;

  const cities = useQuery({
    queryKey: ["master", "cities"],
    queryFn: () => api<Collection<City>>("public/cities").then((result) => result.data),
  });

  const save = useMutation({
    mutationFn: (values: AgencyValues) => api<AgencyResponse>("portal/agency", { method: "PATCH", body: values }),
    onSuccess: (result) => {
      queryClient.setQueryData(["agency"], result);
      message.success(profile.id ? "Agency page saved" : "Agency page created");
    },
    onError: (error) => {
      if (!applyFormErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={16}>
        <Card title="Agency details">
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={{
              name: profile.name,
              city_id: profile.city?.id ?? null,
              phone: profile.phone,
              whatsapp: profile.whatsapp,
              email: profile.email,
              website: profile.website,
              address: profile.address,
              about: profile.about,
              established_year: profile.established_year,
              service_areas: profile.service_areas,
              facebook: profile.facebook,
              instagram: profile.instagram,
              youtube: profile.youtube,
              tiktok: profile.tiktok,
              linkedin: profile.linkedin,
            }}
            onFinish={(values) => save.mutate(values)}
          >
            <Row gutter={12}>
              <Col xs={24} md={14}>
                <Form.Item name="name" label="Agency name" rules={[{ required: true }, { max: 150 }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item name="city_id" label="City">
                  <Select
                    allowClear
                    showSearch={{ optionFilterProp: "label" }}
                    loading={cities.isLoading}
                    placeholder="Select a city"
                    options={(cities.data ?? []).map((city) => ({ value: city.id, label: city.name }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="phone" label="Phone">
                  <Input placeholder="03001234567" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="whatsapp" label="WhatsApp" extra="Leave empty to use the phone number">
                  <Input placeholder="03001234567" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="email" label="Email" rules={[{ type: "email" }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="website" label="Website" rules={[{ type: "url", message: "Enter a full address, e.g. https://example.com" }]}>
                  <Input placeholder="https://" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="address" label="Office address">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="established_year" label="In business since" extra="Shown as years of experience">
                  <InputNumber min={1947} max={new Date().getFullYear()} placeholder="2016" style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item name="service_areas" label="Service areas" rules={[{ max: 255 }]}>
                  <Input placeholder="All sectors of DHA Gujranwala" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="about" label="About the agency" rules={[{ max: 5000 }]}>
                  <Input.TextArea rows={6} showCount maxLength={5000} placeholder="What you specialise in, areas you cover, years in business…" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Typography.Title level={5} style={{ marginTop: 0 }}>
                  Social media
                </Typography.Title>
              </Col>
              {SOCIAL_FIELDS.map((social) => (
                <Col xs={24} md={12} key={social.name}>
                  <Form.Item name={social.name} label={social.label} rules={[{ type: "url", message: "Enter a full link, e.g. https://…" }]}>
                    <Input placeholder="https://" />
                  </Form.Item>
                </Col>
              ))}
            </Row>
            <Button type="primary" htmlType="submit" loading={save.isPending}>
              {profile.id ? "Save changes" : "Create agency page"}
            </Button>
          </Form>
        </Card>
      </Col>

      <Col xs={24} lg={8}>
        <Flex vertical gap={16}>
          <Card title="Logo">
            <Flex align="center" gap={16}>
              <Avatar shape="square" size={80} src={profile.logo_url ?? undefined} icon={<ShopOutlined />} />
              <ImageUpload field="logo" label={profile.logo_url ? "Replace logo" : "Upload logo"} disabled={!profile.id} />
            </Flex>
            <Typography.Paragraph type="secondary" style={{ margin: "12px 0 0", fontSize: 12 }}>
              {profile.id ? "Square PNG, JPG or WebP, up to 2 MB." : "Save your agency details first."}
            </Typography.Paragraph>
          </Card>

          <Card title="Cover photo">
            {profile.cover_url && (
              <Image src={profile.cover_url} alt="Agency cover" width="100%" style={{ aspectRatio: "3 / 1", objectFit: "cover", borderRadius: 8, marginBottom: 12 }} />
            )}
            <ImageUpload field="cover" label={profile.cover_url ? "Replace cover photo" : "Upload cover photo"} disabled={!profile.id} />
            <Typography.Paragraph type="secondary" style={{ margin: "12px 0 0", fontSize: 12 }}>
              {profile.id ? "Wide photo behind your page header, e.g. 1600×600. JPG, PNG or WebP, up to 4 MB." : "Save your agency details first."}
            </Typography.Paragraph>
          </Card>

          <Card title="Public page" extra={profile.id && <Tag color={PROFILE_STATUS_COLORS[profile.status]}>{PROFILE_STATUS_LABELS[profile.status]}</Tag>}>
            {!profile.id ? (
              <Alert type="info" showIcon title="Not created yet" description="Save your details to create your agency page." />
            ) : response.is_listed ? (
              <Flex vertical gap={12}>
                <Alert type="success" showIcon title="Your agency page is live" description="Buyers can find your agency, your agents and all your live listings." />
                {response.public_url && (
                  <Button block icon={<ExportOutlined />} href={response.public_url} target="_blank" rel="noopener noreferrer">
                    View public page
                  </Button>
                )}
              </Flex>
            ) : profile.status !== "approved" ? (
              <Alert
                type={profile.status === "pending" ? "info" : "warning"}
                showIcon
                title={profile.status === "pending" ? "Waiting for admin approval" : `${PROFILE_STATUS_LABELS[profile.status]} — not on the website`}
                description={
                  profile.rejection_reason ??
                  (profile.status === "pending"
                    ? "An admin checks every new agency page before it appears on the website. You will see it here once it is approved."
                    : "Contact support if you think this is a mistake.")
                }
              />
            ) : (
              <Alert
                type="warning"
                showIcon
                title="Hidden from the website"
                description={
                  <>
                    Your current plan does not include an agency page. <Link href="/plan">See plans</Link>
                  </>
                }
              />
            )}

            <div style={{ marginTop: 16 }}>
              {profile.is_verified ? (
                <Tag color="green" icon={<SafetyCertificateFilled />}>
                  Verified agency
                </Tag>
              ) : (
                <Typography.Text type="secondary">Not verified yet. Upload your documents below and request verification.</Typography.Text>
              )}
            </div>
          </Card>
        </Flex>
      </Col>
    </Row>
  );
}

export default function AgencyPage() {
  const agency = useQuery({
    queryKey: ["agency"],
    queryFn: () => api<AgencyResponse>("portal/agency"),
  });

  return (
    <>
      <PageHeader title="Agency Page" subtitle="Your agency's public profile, shown with all your agents' listings" />
      {agency.isLoading || !agency.data ? (
        <Skeleton active />
      ) : (
        <>
          <AgencyForm key={agency.data.data.id ?? "new"} response={agency.data} />
          <AgencyVerification hasProfile={agency.data.data.id !== null} />
        </>
      )}
    </>
  );
}
