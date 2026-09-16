"use client";

import { ArrowLeftOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Result, Typography } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";

type ResetValues = { email: string; password: string; password_confirmation: string };

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const emailFromLink = searchParams.get("email") ?? "";
  const [form] = Form.useForm<ResetValues>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <Result
        status="warning"
        style={{ padding: "8px 0" }}
        title="This reset link is incomplete"
        subTitle="Open the link from the email again, or ask for a new one."
        extra={
          <Link href="/forgot-password">
            <Button type="primary">Send a new link</Button>
          </Link>
        }
      />
    );
  }

  async function onFinish(values: ResetValues) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, email: values.email.trim(), token }),
      });

      if (response.ok) {
        router.replace("/login?reset=1");
        router.refresh();

        return;
      }

      const payload = await response.json().catch(() => ({}));
      const fieldErrors: Record<string, string[]> = payload.errors ?? {};
      const { email: emailErrors, token: tokenErrors, ...rest } = fieldErrors;

      if (Object.keys(rest).length > 0) {
        form.setFields(Object.entries(rest).map(([name, errors]) => ({ name: name as keyof ResetValues, errors })));
      }

      // An invalid or expired token is reported against the email; show it where the user can act on it.
      const linkError = [...(emailErrors ?? []), ...(tokenErrors ?? [])][0];

      if (linkError) {
        setError(linkError);
      } else if (Object.keys(rest).length === 0) {
        setError(response.status === 429 ? "Too many attempts. Please wait a minute and try again." : (payload.message ?? "Could not reset your password. Please try again."));
      }
    } catch {
      setError("Cannot reach the server. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {error && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          title={error}
          description={
            <>
              Reset links expire after a while and work only once. <Link href="/forgot-password">Send a new link</Link>
            </>
          }
        />
      )}

      <Form form={form} layout="vertical" size="large" onFinish={onFinish} requiredMark={false} initialValues={{ email: emailFromLink }}>
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Enter your email" },
            { type: "email", message: "Enter a valid email address" },
          ]}
        >
          <Input prefix={<MailOutlined />} autoComplete="username" readOnly={Boolean(emailFromLink)} />
        </Form.Item>
        <Form.Item name="password" label="New password" rules={[{ required: true, message: "Enter a new password" }, { min: 8, message: "At least 8 characters" }]}>
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" autoFocus />
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
        <Button type="primary" htmlType="submit" block loading={submitting} style={{ marginTop: 8 }}>
          Set new password
        </Button>
      </Form>

      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        For your security, you will be logged out on every device and can log in again with the new password.
      </Typography.Paragraph>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Choose a new password" subtitle="Use at least 8 characters that you do not use anywhere else.">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>

      <Typography.Paragraph style={{ marginTop: 16, textAlign: "center" }}>
        <Link href="/login">
          <ArrowLeftOutlined /> Back to log in
        </Link>
      </Typography.Paragraph>
    </AuthLayout>
  );
}
