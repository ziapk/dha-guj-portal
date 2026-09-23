"use client";

import { ExportOutlined, UploadOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Avatar, Button, Card, Col, Flex, Form, Input, InputNumber, Row, Select, Skeleton, Tag, Typography, Upload } from "antd";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { api, apiUpload } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import { PROFILE_STATUS_COLORS, PROFILE_STATUS_LABELS } from "@/lib/labels";
import type { AgentProfile, City, Collection, Resource } from "@/types/api";

type AgentProfileResponse = Resource<AgentProfile> & { is_listed: boolean; public_url: string | null };

type AgentProfileValues = {
  name: string;
  designation: string | null;
  short_bio: string | null;
  bio: string | null;
  experience_years: number | null;
  specialisation: string | null;
  areas_of_expertise: string[];
  languages: string | null;
  city_id: number | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  x: string | null;
  youtube: string | null;
  tiktok: string | null;
  website: string | null;
};

/** Starting points for the expertise picker; agents can type their own as well. */
const EXPERTISE_SUGGESTIONS = [
  "DHA Gujranwala",
  "Residential Properties",
  "Commercial Properties",
  "Plot Files",
  "Investment Advisory",
  "Property Selling",
  "Property Buying",
  "Rentals",
  "Overseas Clients",
];

const SOCIAL_FIELDS: { name: keyof AgentProfileValues; label: string; placeholder: string }[] = [
  { name: "facebook", label: "Facebook", placeholder: "https://facebook.com/username" },
  { name: "instagram", label: "Instagram", placeholder: "https://instagram.com/username" },
  { name: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/username" },
  { name: "x", label: "X", placeholder: "https://x.com/username" },
  { name: "youtube", label: "YouTube", placeholder: "https://youtube.com/@channel" },
  { name: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@username" },
  { name: "website", label: "Website", placeholder: "https://yourwebsite.com" },
];

function StatusCard({ response }: { response: AgentProfileResponse }) {
  const profile = response.data;

  if (!profile.id) {
    return <Alert type="info" showIcon title="Not created yet" description="Save your details to create your agent page. An admin reviews it before it goes live." />;
  }

  if (response.is_listed) {
    return (
      <Flex vertical gap={12}>
        <Alert type="success" showIcon title="Your agent page is live" description="Buyers can find you and contact you directly." />
        {response.public_url && (
          <Button block icon={<ExportOutlined />} href={response.public_url} target="_blank" rel="noopener noreferrer">
            View public page
          </Button>
        )}
      </Flex>
    );
  }

  return (
    <Alert
      type={profile.status === "pending" ? "info" : "warning"}
      showIcon
      title={profile.status === "pending" ? "Waiting for admin approval" : `${PROFILE_STATUS_LABELS[profile.status]} — not on the website`}
      description={
        profile.rejection_reason ??
        (profile.status === "pending"
          ? "An admin checks every new agent page before it appears on the website. You will see it here once it is approved."
          : "Contact support if you think this is a mistake.")
      }
    />
  );
}

function AgentProfileForm({ response }: { response: AgentProfileResponse }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<AgentProfileValues>();
  const [uploading, setUploading] = useState(false);
  const profile = response.data;

  const cities = useQuery({
    queryKey: ["master", "cities"],
    queryFn: () => api<Collection<City>>("public/cities").then((result) => result.data),
  });

  const save = useMutation({
    mutationFn: (values: AgentProfileValues) => api<AgentProfileResponse>("portal/agent-profile", { method: "PATCH", body: values }),
    onSuccess: (result) => {
      queryClient.setQueryData(["agent-profile"], result);
      message.success(profile.id ? "Profile saved" : "Profile created — an admin will review it");
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
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{
            name: profile.name,
            designation: profile.designation,
            short_bio: profile.short_bio,
            bio: profile.bio ?? null,
            experience_years: profile.experience_years,
            specialisation: profile.specialisation,
            areas_of_expertise: profile.areas_of_expertise ?? [],
            languages: profile.languages,
            city_id: profile.city?.id ?? null,
            phone: profile.phone,
            whatsapp: profile.whatsapp,
            email: profile.email,
            facebook: profile.facebook,
            instagram: profile.instagram,
            linkedin: profile.linkedin,
            x: profile.x,
            youtube: profile.youtube,
            tiktok: profile.tiktok,
            website: profile.website,
          }}
          onFinish={(values) => save.mutate(values)}
        >
          <Card title="Basic information" style={{ marginBottom: 16 }}>
            <Row gutter={12}>
              <Col xs={24} md={14}>
                <Form.Item name="name" label="Full name" rules={[{ required: true }, { max: 150 }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item name="designation" label="Designation / role" rules={[{ max: 150 }]}>
                  <Input placeholder="e.g. Senior Property Consultant" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="short_bio" label="Short bio" extra="One or two lines shown on your card in the agent directory." rules={[{ max: 500 }]}>
                  <Input.TextArea rows={2} showCount maxLength={500} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="bio" label="Full bio" extra="Leave a blank line between paragraphs." rules={[{ max: 50000 }]}>
                  <Input.TextArea rows={7} placeholder="Your experience, the areas you cover, how you work with clients…" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="Professional information" style={{ marginBottom: 16 }}>
            <Row gutter={12}>
              <Col xs={24} md={8}>
                <Form.Item name="experience_years" label="Experience (years)">
                  <InputNumber min={0} max={80} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item name="specialisation" label="Specialisation" rules={[{ max: 255 }]}>
                  <Input placeholder="e.g. DHA Gujranwala Real Estate" />
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item name="areas_of_expertise" label="Areas of expertise" extra="Pick from the list or type your own, up to 15.">
                  <Select
                    mode="tags"
                    allowClear
                    maxCount={15}
                    placeholder="Select or type an area"
                    options={EXPERTISE_SUGGESTIONS.map((area) => ({ value: area, label: area }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="languages" label="Languages" rules={[{ max: 255 }]}>
                  <Input placeholder="Urdu, English, Punjabi" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title="Contact" style={{ marginBottom: 16 }}>
            <Row gutter={12}>
              <Col xs={24} md={8}>
                <Form.Item name="phone" label="Phone">
                  <Input placeholder="03001234567" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="whatsapp" label="WhatsApp" extra="Leave empty to use the phone number">
                  <Input placeholder="03001234567" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="email" label="Email" rules={[{ type: "email" }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
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
            </Row>
          </Card>

          <Card title="Social profiles" style={{ marginBottom: 16 }}>
            <Row gutter={12}>
              {SOCIAL_FIELDS.map((field) => (
                <Col xs={24} md={12} key={field.name}>
                  <Form.Item name={field.name} label={field.label} rules={[{ type: "url", message: "Enter a full address, e.g. https://example.com" }]}>
                    <Input placeholder={field.placeholder} />
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </Card>

          <Button type="primary" htmlType="submit" loading={save.isPending}>
            {profile.id ? "Save changes" : "Create my agent page"}
          </Button>
        </Form>
      </Col>

      <Col xs={24} lg={8}>
        <Flex vertical gap={16}>
          <Card title="Profile photo">
            <Flex align="center" gap={16}>
              <Avatar size={80} src={profile.photo_url ?? undefined} icon={<UserOutlined />} />
              <Upload
                accept="image/png,image/jpeg,image/webp"
                showUploadList={false}
                disabled={!profile.id || uploading}
                customRequest={({ file, onSuccess, onError }) => {
                  const formData = new FormData();
                  formData.append("image", file as Blob);
                  setUploading(true);

                  apiUpload<Resource<AgentProfile>>("portal/agent-profile/photo", formData)
                    .then((result) => {
                      queryClient.setQueryData<AgentProfileResponse>(["agent-profile"], (old) => (old ? { ...old, data: result.data } : old));
                      message.success("Photo updated");
                      onSuccess?.(result);
                    })
                    .catch((error: Error) => {
                      message.error(errorMessage(error));
                      onError?.(error);
                    })
                    .finally(() => setUploading(false));
                }}
              >
                <Button icon={<UploadOutlined />} loading={uploading} disabled={!profile.id}>
                  {profile.photo_url ? "Replace photo" : "Upload photo"}
                </Button>
              </Upload>
            </Flex>
            <Typography.Paragraph type="secondary" style={{ margin: "12px 0 0", fontSize: 12 }}>
              {profile.id ? "A square head-and-shoulders photo works best." : "Save your details first."}
            </Typography.Paragraph>
          </Card>

          <Card
            title="Public page"
            extra={profile.id && <Tag color={PROFILE_STATUS_COLORS[profile.status]}>{PROFILE_STATUS_LABELS[profile.status]}</Tag>}
          >
            <StatusCard response={response} />
          </Card>
        </Flex>
      </Col>
    </Row>
  );
}

export default function AgentProfilePage() {
  const profile = useQuery({
    queryKey: ["agent-profile"],
    queryFn: () => api<AgentProfileResponse>("portal/agent-profile"),
  });

  return (
    <>
      <PageHeader title="My Agent Page" subtitle="Your public profile on the website, shown in the agent directory" />
      {profile.isLoading || !profile.data ? <Skeleton active /> : <AgentProfileForm key={profile.data.data.id ?? "new"} response={profile.data} />}
    </>
  );
}
