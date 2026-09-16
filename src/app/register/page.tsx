"use client";

import { BankOutlined, LockOutlined, MailOutlined, PhoneOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Col, Form, Input, Row, Segmented, Typography } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "@/components/auth-layout";

type RegisterValues = {
  account_type: "individual" | "agency";
  name: string;
  email?: string;
  phone?: string;
  password: string;
  password_confirmation: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [form] = Form.useForm<RegisterValues>();
  const accountType = Form.useWatch("account_type", form) ?? "individual";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFinish(values: RegisterValues) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
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
        form.setFields(Object.entries(fieldErrors).map(([name, errors]) => ({ name: name as keyof RegisterValues, errors })));
      } else {
        setError(payload.message ?? "Registration failed. Please try again.");
      }
    } catch {
      setError("Cannot reach the server. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start listing in minutes. Your free plan is activated right away.">
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <Form form={form} layout="vertical" size="large" onFinish={onFinish} requiredMark={false} initialValues={{ account_type: "individual" }}>
        <Form.Item name="account_type" label="I am">
          <Segmented
            block
            options={[
              { value: "individual", label: "Property owner", icon: <UserOutlined /> },
              { value: "agency", label: "Real estate agency", icon: <BankOutlined /> },
            ]}
          />
        </Form.Item>
        <Form.Item name="name" label={accountType === "agency" ? "Agency name" : "Full name"} rules={[{ required: true }]}>
          <Input prefix={accountType === "agency" ? <BankOutlined /> : <UserOutlined />} autoComplete="name" />
        </Form.Item>
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="email"
              label="Email"
              dependencies={["phone"]}
              rules={[
                { type: "email" },
                ({ getFieldValue }) => ({
                  validator: (_, value) =>
                    value || getFieldValue("phone") ? Promise.resolve() : Promise.reject(new Error("Enter an email or a phone number")),
                }),
              ]}
            >
              <Input prefix={<MailOutlined />} autoComplete="email" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="phone" label="Phone" dependencies={["email"]}>
              <Input prefix={<PhoneOutlined />} placeholder="03001234567" autoComplete="tel" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name="password" label="Password" rules={[{ required: true }, { min: 8, message: "At least 8 characters" }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="password_confirmation"
              label="Confirm password"
              dependencies={["password"]}
              rules={[
                { required: true },
                ({ getFieldValue }) => ({
                  validator: (_, value) =>
                    !value || value === getFieldValue("password") ? Promise.resolve() : Promise.reject(new Error("Passwords do not match")),
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
            </Form.Item>
          </Col>
        </Row>
        <Button type="primary" htmlType="submit" block loading={submitting} style={{ marginTop: 8 }}>
          Create account
        </Button>
      </Form>

      <Typography.Paragraph type="secondary" style={{ marginTop: 24, textAlign: "center" }}>
        Already have an account? <Link href="/login">Log in</Link>
      </Typography.Paragraph>
    </AuthLayout>
  );
}
