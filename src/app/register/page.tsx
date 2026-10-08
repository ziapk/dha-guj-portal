"use client";

import {
  ApartmentOutlined,
  ArrowRightOutlined,
  BankOutlined,
  CheckCircleFilled,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Button, Checkbox, Col, Form, Input, Row, Typography } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { PUBLIC_WEB_URL } from "@/lib/constants";

type AccountType = "individual" | "agency" | "developer";

type RegisterValues = {
  account_type: AccountType;
  name: string;
  contact_name?: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  terms: boolean;
};

// Users only give their own name. Dealers give their name + agency, developers their name + company:
// the business name is stored in `name` and the person's name in `contact_name`.
const ACCOUNT_TYPES: {
  value: AccountType;
  title: string;
  text: string;
  icon: ReactNode;
  personLabel: string;
  company?: { label: string; icon: ReactNode; placeholder: string };
}[] = [
  {
    value: "individual",
    title: "User",
    text: "Buy, Sell or Rent Properties",
    icon: <UserOutlined />,
    personLabel: "Full Name",
  },
  {
    value: "agency",
    title: "Dealer",
    text: "List Properties & Manage Leads",
    icon: <BankOutlined />,
    personLabel: "Dealer Name",
    company: { label: "Agency Name", icon: <BankOutlined />, placeholder: "Enter agency name" },
  },
  {
    value: "developer",
    title: "Developer",
    text: "Showcase Your Projects",
    icon: <ApartmentOutlined />,
    personLabel: "Full Name",
    company: { label: "Developer Company Name", icon: <ApartmentOutlined />, placeholder: "Enter developer company name" },
  },
];

/** "3001234567", "03001234567" or "+92 300 1234567" → "03001234567"; null when it is not a Pakistani mobile number. */
function normalizeMobile(value: string): string | null {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("92")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return /^3\d{9}$/.test(digits) ? `0${digits}` : null;
}

function PakistanFlag() {
  return (
    <svg width="20" height="14" viewBox="0 0 30 20" aria-hidden="true" style={{ borderRadius: 2 }}>
      <rect width="30" height="20" fill="#01411c" />
      <rect width="7.5" height="20" fill="#fff" />
      <circle cx="19.5" cy="10" r="5.2" fill="#fff" />
      <circle cx="20.9" cy="8.8" r="4.4" fill="#01411c" />
      <path fill="#fff" d="m22.6 6.2.55 1.3 1.4.1-1.07.9.34 1.37-1.22-.74-1.2.74.34-1.37-1.08-.9 1.4-.1z" />
    </svg>
  );
}

function AccountTypePicker({ value, onChange }: { value?: AccountType; onChange?: (value: AccountType) => void }) {
  return (
    <div className="account-type-grid" role="radiogroup" aria-label="Account type">
      {ACCOUNT_TYPES.map((type) => (
        <button key={type.value} type="button" role="radio" aria-checked={value === type.value} className="account-type-card" onClick={() => onChange?.(type.value)}>
          {value === type.value && (
            <span className="account-type-check">
              <CheckCircleFilled />
            </span>
          )}
          <span className="account-type-icon">{type.icon}</span>
          <strong>{type.title}</strong>
          <small>{type.text}</small>
        </button>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [form] = Form.useForm<RegisterValues>();
  const accountType = Form.useWatch("account_type", form) ?? "individual";
  const selected = ACCOUNT_TYPES.find((type) => type.value === accountType) ?? ACCOUNT_TYPES[0];
  const previousType = useRef<AccountType>("individual");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFinish(values: RegisterValues) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, phone: normalizeMobile(values.phone) }),
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
    <AuthLayout
      wide
      title="Create Your Account"
      subtitle="Join DHA GRW Properties and be part of our real estate community."
      topAction={
        <>
          <Typography.Text type="secondary" className="login-topbar-hint">
            Already have an account?
          </Typography.Text>
          <Link href="/login">
            <Button color="primary" variant="filled" icon={<ArrowRightOutlined />} iconPlacement="end">
              Login
            </Button>
          </Link>
        </>
      }
    >
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <Form
        form={form}
        layout="vertical"
        size="large"
        onFinish={onFinish}
        initialValues={{ account_type: "individual" }}
        onValuesChange={(changed: Partial<RegisterValues>) => {
          // A person's name lives in `name` for users but in `contact_name` for dealers and developers.
          if (!changed.account_type) {
            return;
          }

          const { name, contact_name } = form.getFieldsValue(["name", "contact_name"]);

          if (changed.account_type === "individual" && contact_name) {
            form.setFieldsValue({ name: contact_name, contact_name: undefined });
          } else if (changed.account_type !== "individual" && !contact_name && name && previousType.current === "individual") {
            form.setFieldsValue({ contact_name: name, name: undefined });
          }

          previousType.current = changed.account_type;
        }}
        requiredMark={(label, { required }) => (
          <>
            {label}
            {required && <span className="form-required">*</span>}
          </>
        )}
      >
        <Form.Item name="account_type" noStyle>
          <AccountTypePicker />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={selected.company ? 12 : 24}>
            <Form.Item
              name={selected.company ? "contact_name" : "name"}
              label={selected.personLabel}
              rules={[{ required: true, message: `Enter the ${selected.personLabel.toLowerCase()}` }]}
            >
              <Input prefix={<UserOutlined />} placeholder={`Enter ${selected.company ? selected.personLabel.toLowerCase() : "your full name"}`} autoComplete="name" />
            </Form.Item>
          </Col>
          {selected.company && (
            <Col xs={24} sm={12}>
              <Form.Item name="name" label={selected.company.label} rules={[{ required: true, message: `Enter the ${selected.company.label.toLowerCase()}` }]}>
                <Input prefix={selected.company.icon} placeholder={selected.company.placeholder} autoComplete="organization" />
              </Form.Item>
            </Col>
          )}
        </Row>
        <Form.Item
          name="email"
          label="Email Address"
          rules={[
            { required: true, message: "Enter your email address" },
            { type: "email", message: "Enter a valid email address" },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="Enter your email address" autoComplete="email" />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Mobile Number"
          rules={[
            { required: true, message: "Enter your mobile number" },
            {
              validator: (_, value) =>
                !value || normalizeMobile(value) ? Promise.resolve() : Promise.reject(new Error("Enter a valid mobile number, e.g. 300 1234567")),
            },
          ]}
        >
          <Input
            prefix={
              <>
                <PhoneOutlined />
                <span className="phone-country">
                  <PakistanFlag /> +92
                </span>
              </>
            }
            placeholder="300 1234567"
            inputMode="tel"
            autoComplete="tel-national"
          />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true, message: "Create a password" }, { min: 8, message: "At least 8 characters" }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Create a strong password" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="password_confirmation"
          label="Confirm Password"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Confirm your password" },
            ({ getFieldValue }) => ({
              validator: (_, value) => (!value || value === getFieldValue("password") ? Promise.resolve() : Promise.reject(new Error("Passwords do not match"))),
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Confirm your password" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="terms"
          valuePropName="checked"
          rules={[{ validator: (_, value) => (value ? Promise.resolve() : Promise.reject(new Error("Please accept the terms to continue"))) }]}
        >
          <Checkbox>
            I agree to the{" "}
            <a href={`${PUBLIC_WEB_URL}/terms-and-conditions`} target="_blank" rel="noreferrer">
              Terms &amp; Conditions
            </a>{" "}
            and{" "}
            <a href={`${PUBLIC_WEB_URL}/privacy-policy`} target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
          </Checkbox>
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={submitting} icon={<ArrowRightOutlined />} iconPlacement="end" style={{ height: 52, fontSize: 17 }}>
          Create {selected.title} Account
        </Button>
      </Form>
    </AuthLayout>
  );
}
