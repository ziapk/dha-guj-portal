"use client";

import { LockOutlined, MailOutlined, PhoneOutlined, ShopOutlined, UserOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Result, Skeleton, Typography } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { formatDate } from "@/lib/labels";
import type { InvitationDetails } from "@/types/api";

type AcceptValues = { name: string; phone?: string; password: string; password_confirmation: string };

class InvitationError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function loadInvitation(token: string): Promise<InvitationDetails> {
  const response = await fetch(`/api/auth/accept-invite?token=${encodeURIComponent(token)}`, { headers: { Accept: "application/json" } });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new InvitationError(response.status, payload.message ?? "This invitation could not be loaded.");
  }

  return payload.data as InvitationDetails;
}

function InvalidInvitation({ message }: { message?: string }) {
  return (
    <Result
      status="warning"
      style={{ padding: "8px 0" }}
      title="This invitation is no longer valid"
      subTitle={
        <>
          {message ?? "The link may have expired, been cancelled or already been used."}
          <br />
          Ask the agency to send you a new invitation.
        </>
      }
      extra={
        <Link href="/login">
          <Button>I already have an account</Button>
        </Link>
      }
    />
  );
}

function AcceptInviteForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useSearchParams().get("token") ?? "";
  const [form] = Form.useForm<AcceptValues>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ title: string; description?: string } | null>(null);

  const invitation = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => loadInvitation(token),
    enabled: token !== "",
    retry: (count, failure) => !(failure instanceof InvitationError && failure.status < 500) && count < 2,
  });

  if (!token) {
    return <InvalidInvitation message="This invitation link is incomplete. Open it again from the email or WhatsApp message." />;
  }

  if (invitation.isLoading) {
    return <Skeleton active />;
  }

  if (invitation.isError || !invitation.data) {
    const failure = invitation.error;

    if (failure instanceof InvitationError && failure.status === 404) {
      return <InvalidInvitation message={failure.message} />;
    }

    return (
      <Result
        status="error"
        style={{ padding: "8px 0" }}
        title="Could not load the invitation"
        subTitle={failure instanceof InvitationError && failure.status === 429 ? "Too many attempts. Please wait a minute and try again." : "Please check your connection and try again."}
        extra={<Button onClick={() => invitation.refetch()}>Try again</Button>}
      />
    );
  }

  const details = invitation.data;

  async function onFinish(values: AcceptValues) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, name: values.name.trim(), phone: values.phone?.trim() || null, token }),
      });

      if (response.ok) {
        queryClient.clear();
        router.replace("/");
        router.refresh();

        return;
      }

      const payload = await response.json().catch(() => ({}));
      const { email: emailErrors, ...fieldErrors }: Record<string, string[]> = payload.errors ?? {};

      if (response.status === 403 && payload.code === "QUOTA_EXCEEDED") {
        setError({
          title: `${details.agency_name} has no free agent seat right now`,
          description: "Ask the agency to upgrade their plan or deactivate an agent, then open this link again. Your invitation stays valid until it expires.",
        });
      } else if (response.status === 404) {
        setError({ title: payload.message ?? "This invitation is no longer valid.", description: "Ask the agency to send you a new invitation." });
      } else if (Object.keys(fieldErrors).length > 0) {
        form.setFields(Object.entries(fieldErrors).map(([name, errors]) => ({ name: name as keyof AcceptValues, errors })));
      } else {
        setError({ title: emailErrors?.[0] ?? (response.status === 429 ? "Too many attempts. Please wait a minute and try again." : (payload.message ?? "Could not create your account.")) });
      }
    } catch {
      setError({ title: "Cannot reach the server. Please try again in a moment." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Alert
        type="info"
        showIcon
        icon={<ShopOutlined />}
        style={{ marginBottom: 20 }}
        title={`${details.agency_name} invited you to join as an agent`}
        description={`You will list properties and answer leads on the agency's plan. This invitation expires on ${formatDate(details.expires_at)}.`}
      />

      {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} title={error.title} description={error.description} />}

      <Form form={form} layout="vertical" size="large" requiredMark={false} initialValues={{ name: details.name }} onFinish={onFinish}>
        <Form.Item label="Email" extra="You will log in with this email.">
          <Input prefix={<MailOutlined />} value={details.email} readOnly autoComplete="username" />
        </Form.Item>
        <Form.Item name="name" label="Your name" rules={[{ required: true, whitespace: true, message: "Enter your name" }, { max: 255 }]}>
          <Input prefix={<UserOutlined />} autoComplete="name" />
        </Form.Item>
        <Form.Item name="phone" label="Phone (optional)" rules={[{ max: 20 }]}>
          <Input prefix={<PhoneOutlined />} placeholder="03001234567" autoComplete="tel" />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true, message: "Choose a password" }, { min: 8, message: "At least 8 characters" }]}>
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="password_confirmation"
          label="Confirm password"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Type the password again" },
            ({ getFieldValue }) => ({
              validator: (_, value) => (!value || value === getFieldValue("password") ? Promise.resolve() : Promise.reject(new Error("Passwords do not match"))),
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={submitting} style={{ marginTop: 8 }}>
          Join {details.agency_name}
        </Button>
      </Form>

      <Typography.Paragraph type="secondary" style={{ marginTop: 16, textAlign: "center" }}>
        Already have an account? <Link href="/login">Log in</Link>
      </Typography.Paragraph>
    </>
  );
}

export default function AcceptInvitePage() {
  return (
    <AuthLayout title="Join your agency" subtitle="Create your agent account to start listing properties.">
      <Suspense>
        <AcceptInviteForm />
      </Suspense>
    </AuthLayout>
  );
}
