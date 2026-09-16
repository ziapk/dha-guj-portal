"use client";

import { LockOutlined, MailOutlined, PhoneOutlined, ReloadOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Col, Descriptions, Form, Input, Result, Row, Skeleton, Tag, Typography } from "antd";
import { PageHeader } from "@/components/page-header";
import { useImpersonation } from "@/hooks/use-me";
import { api } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import { ACCOUNT_STATUS_COLORS, ACCOUNT_TYPE_LABELS, formatDate } from "@/lib/labels";
import type { MeResponse, MessageResponse, Resource, User } from "@/types/api";

type ProfileValues = { name: string; email: string | null; phone: string | null };

type PasswordValues = { current_password: string; password: string; password_confirmation: string };

function ProfileForm({ user }: { user: User }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ProfileValues>();

  const save = useMutation({
    mutationFn: (values: ProfileValues) =>
      api<Resource<User>>("portal/profile", {
        method: "PUT",
        // Always send both contact fields: the API needs at least one of them to remain.
        body: { name: values.name.trim(), email: values.email?.trim() || null, phone: values.phone?.trim() || null },
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(["profile"], response.data);
      // The header and sidebar read the name from ["me"].
      queryClient.setQueryData<MeResponse>(["me"], (current) => (current ? { ...current, data: { ...current.data, ...response.data } } : current));
      queryClient.invalidateQueries({ queryKey: ["me"] });
      form.setFieldsValue({ name: response.data.name, email: response.data.email, phone: response.data.phone });
      message.success("Profile saved");
    },
    onError: (error) => {
      if (!applyFormErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  return (
    <Card title="Your details" style={{ height: "100%" }}>
      <Form<ProfileValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ name: user.name, email: user.email, phone: user.phone }}
        onFinish={(values) => save.mutate(values)}
      >
        <Form.Item name="name" label={user.account_type === "agency" ? "Agency name" : "Full name"} rules={[{ required: true, whitespace: true, message: "Enter your name" }, { max: 255 }]}>
          <Input prefix={<UserOutlined />} autoComplete="name" />
        </Form.Item>
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="email"
              label="Email"
              dependencies={["phone"]}
              extra="Used to log in and to reset your password."
              rules={[
                { type: "email", message: "Enter a valid email address" },
                { max: 255 },
                ({ getFieldValue }) => ({
                  validator: (_, value) =>
                    value || getFieldValue("phone") ? Promise.resolve() : Promise.reject(new Error("Keep an email or a phone number")),
                }),
              ]}
            >
              <Input prefix={<MailOutlined />} autoComplete="email" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="phone"
              label="Phone"
              dependencies={["email"]}
              rules={[
                { max: 20 },
                ({ getFieldValue }) => ({
                  validator: (_, value) =>
                    value || getFieldValue("email") ? Promise.resolve() : Promise.reject(new Error("Keep an email or a phone number")),
                }),
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="03001234567" autoComplete="tel" />
            </Form.Item>
          </Col>
        </Row>
        <Button type="primary" htmlType="submit" loading={save.isPending}>
          Save profile
        </Button>
      </Form>
    </Card>
  );
}

/** Shown instead of the password form while an admin is logged in as this user; the API refuses the change anyway. */
function PasswordLocked({ adminName }: { adminName: string | null }) {
  return (
    <Card title="Change password" style={{ height: "100%" }}>
      <Alert
        type="warning"
        showIcon
        icon={<LockOutlined />}
        title="Not available in an admin session"
        description={`${adminName ? `Admin ${adminName} is` : "An admin is"} logged in as this account. Only the account owner can change the password, after logging in themselves.`}
      />
    </Card>
  );
}

function PasswordForm() {
  const { message } = App.useApp();
  const [form] = Form.useForm<PasswordValues>();

  const change = useMutation({
    mutationFn: (values: PasswordValues) => api<MessageResponse>("portal/profile/password", { method: "PUT", body: values }),
    onSuccess: (response) => {
      form.resetFields();
      message.success(response?.message ?? "Your password has been changed.");
    },
    onError: (error) => {
      if (!applyFormErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  return (
    <Card title="Change password" style={{ height: "100%" }}>
      <Typography.Paragraph type="secondary">You stay logged in here. Every other device is signed out.</Typography.Paragraph>
      <Form<PasswordValues> form={form} layout="vertical" requiredMark={false} onFinish={(values) => change.mutate(values)}>
        <Form.Item name="current_password" label="Current password" rules={[{ required: true, message: "Enter your current password" }]}>
          <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="password"
          label="New password"
          dependencies={["current_password"]}
          rules={[
            { required: true, message: "Enter a new password" },
            { min: 8, message: "At least 8 characters" },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || value !== getFieldValue("current_password") ? Promise.resolve() : Promise.reject(new Error("Choose a password different from your current one")),
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="password_confirmation"
          label="Confirm new password"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Type the new password again" },
            ({ getFieldValue }) => ({
              validator: (_, value) => (!value || value === getFieldValue("password") ? Promise.resolve() : Promise.reject(new Error("Passwords do not match"))),
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={change.isPending}>
          Change password
        </Button>
      </Form>
    </Card>
  );
}

export default function ProfilePage() {
  const { data: impersonation } = useImpersonation();
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: () => api<Resource<User>>("portal/profile").then((response) => response.data),
  });

  const user = profile.data;

  return (
    <>
      <PageHeader title="My Profile" subtitle="Your login details and password" />

      {profile.isLoading ? (
        <Card>
          <Skeleton active />
        </Card>
      ) : profile.isError || !user ? (
        <Result
          status="error"
          title="Could not load your profile"
          subTitle={errorMessage(profile.error)}
          extra={
            <Button icon={<ReloadOutlined />} onClick={() => profile.refetch()}>
              Try again
            </Button>
          }
        />
      ) : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Descriptions
              column={{ xs: 1, sm: 2, lg: 4 }}
              items={[
                { key: "type", label: "Account type", children: ACCOUNT_TYPE_LABELS[user.account_type] },
                { key: "status", label: "Status", children: <Tag color={ACCOUNT_STATUS_COLORS[user.status]}>{user.status === "active" ? "Active" : "Suspended"}</Tag> },
                ...(user.agency ? [{ key: "agency", label: "Agency", children: user.agency.name }] : []),
                { key: "since", label: "Member since", children: formatDate(user.created_at) },
              ]}
            />
          </Card>
          {!user.email && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              title="Add an email address"
              description="Without an email we cannot send you a password reset link if you forget your password."
            />
          )}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <ProfileForm key={user.id} user={user} />
            </Col>
            <Col xs={24} lg={10}>
              {impersonation ? <PasswordLocked adminName={impersonation.admin_name} /> : <PasswordForm />}
            </Col>
          </Row>
        </>
      )}
    </>
  );
}
