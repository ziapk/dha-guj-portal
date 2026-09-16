"use client";

import { ArrowLeftOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Result, Typography } from "antd";
import Link from "next/link";
import { useState } from "react";
import { AuthLayout } from "@/components/auth-layout";

type ForgotValues = { email: string };

/** Shown whatever happens to the email, so the page never reveals which emails have accounts. */
const GENERIC_SUCCESS = "If an account uses this email, we have sent it a password reset link.";

export default function ForgotPasswordPage() {
  const [form] = Form.useForm<ForgotValues>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onFinish(values: ForgotValues) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email.trim() }),
      });

      if (response.ok) {
        setSentTo(values.email.trim());

        return;
      }

      const payload = await response.json().catch(() => ({}));
      const fieldErrors: Record<string, string[]> = payload.errors ?? {};

      if (fieldErrors.email) {
        form.setFields([{ name: "email", errors: fieldErrors.email }]);
      } else if (response.status === 429) {
        setError("Too many attempts. Please wait a minute and try again.");
      } else {
        setError(payload.message ?? "Could not send the reset link. Please try again.");
      }
    } catch {
      setError("Cannot reach the server. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <AuthLayout title="Check your email" subtitle="Follow the link in the email to choose a new password.">
        <Result
          status="success"
          style={{ padding: "8px 0" }}
          title={GENERIC_SUCCESS}
          subTitle={`We checked ${sentTo}. The link works for a limited time. Not there? Look in your spam folder.`}
          extra={[
            <Link key="login" href="/login">
              <Button type="primary">Back to log in</Button>
            </Link>,
            <Button key="again" onClick={() => setSentTo(null)}>
              Use another email
            </Button>,
          ]}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter the email on your account and we will send you a link to reset it.">
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <Form form={form} layout="vertical" size="large" onFinish={onFinish} requiredMark={false}>
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Enter your email" },
            { type: "email", message: "Enter a valid email address" },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="you@example.com" autoComplete="email" autoFocus />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={submitting} style={{ marginTop: 8 }}>
          Send reset link
        </Button>
      </Form>

      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        Signed up with a phone number only? Contact us and we will help you get back in.
      </Typography.Paragraph>

      <Typography.Paragraph style={{ marginTop: 16, textAlign: "center" }}>
        <Link href="/login">
          <ArrowLeftOutlined /> Back to log in
        </Link>
      </Typography.Paragraph>
    </AuthLayout>
  );
}
