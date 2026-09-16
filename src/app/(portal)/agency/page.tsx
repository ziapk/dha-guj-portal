"use client";

import { ExportOutlined, SafetyCertificateFilled, ShopOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Avatar, Button, Card, Col, Flex, Form, Input, Row, Select, Skeleton, Tag, Typography, Upload } from "antd";
import Link from "next/link";
import { useState } from "react";
import { AgencyVerification } from "@/components/agency-verification";
import { PageHeader } from "@/components/page-header";
import { api, apiUpload } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
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
};

function AgencyForm({ response }: { response: AgencyResponse }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<AgencyValues>();
  const [uploading, setUploading] = useState(false);
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
              <Col xs={24}>
                <Form.Item name="about" label="About the agency" rules={[{ max: 5000 }]}>
                  <Input.TextArea rows={6} showCount maxLength={5000} placeholder="What you specialise in, areas you cover, years in business…" />
                </Form.Item>
              </Col>
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
              <Upload
                accept="image/png,image/jpeg,image/webp"
                showUploadList={false}
                disabled={!profile.id || uploading}
                customRequest={({ file, onSuccess, onError }) => {
                  const formData = new FormData();
                  formData.append("logo", file as Blob);
                  setUploading(true);

                  apiUpload<Resource<AgencyProfile>>("portal/agency/logo", formData)
                    .then((result) => {
                      queryClient.setQueryData<AgencyResponse>(["agency"], (old) => (old ? { ...old, data: result.data } : old));
                      message.success("Logo updated");
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
                  {profile.logo_url ? "Replace logo" : "Upload logo"}
                </Button>
              </Upload>
            </Flex>
            <Typography.Paragraph type="secondary" style={{ margin: "12px 0 0", fontSize: 12 }}>
              {profile.id ? "Square PNG, JPG or WebP, up to 2 MB." : "Save your agency details first."}
            </Typography.Paragraph>
          </Card>

          <Card title="Public page">
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
