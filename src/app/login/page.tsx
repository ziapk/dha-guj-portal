"use client";

import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input, Typography } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";

type LoginValues = { login: string; password: string };

/** Success notice after arriving from the reset password page (/login?reset=1). */
function ResetNotice() {
  const searchParams = useSearchParams();

  if (searchParams.get("reset") !== "1") {
    return null;
  }

  return <Alert type="success" showIcon style={{ marginBottom: 16 }} title="Your password has been reset." description="Log in with your new password." />;
}

export default function LoginPage() {
  const router = useRouter();
  const [form] = Form.useForm<LoginValues>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFinish(values: LoginValues) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        router.replace("/");
        router.refresh();

        return;
      }

      const payload = await response.json().catch(() => ({}));
      const fieldErrors: Record<string, string[]> = payload.errors ?? {};

      if (Object.keys(fieldErrors).length > 0) {
        form.setFields(Object.entries(fieldErrors).map(([name, errors]) => ({ name: name as keyof LoginValues, errors })));
      } else {
        setError(payload.message ?? "Login failed. Please try again.");
      }
    } catch {
      setError("Cannot reach the server. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to manage your property listings.">
      <Suspense>
        <ResetNotice />
      </Suspense>
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <Form form={form} layout="vertical" size="large" onFinish={onFinish} requiredMark={false}>
        <Form.Item name="login" label="Email or phone number" rules={[{ required: true, message: "Enter your email or phone number" }]}>
          <Input prefix={<UserOutlined />} placeholder="you@example.com or 03001234567" autoComplete="username" autoFocus />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
          <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="current-password" />
        </Form.Item>
        <div style={{ textAlign: "right", marginBottom: 16 }}>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <Button type="primary" htmlType="submit" block loading={submitting} style={{ marginTop: 8 }}>
          Log in
        </Button>
      </Form>

      <Typography.Paragraph type="secondary" style={{ marginTop: 24, textAlign: "center" }}>
        New here? <Link href="/register">Create a free account</Link>
      </Typography.Paragraph>
    </AuthLayout>
  );
}
