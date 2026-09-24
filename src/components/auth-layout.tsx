"use client";

import { CheckCircleFilled, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { useThemeSettings } from "@/theme/theme-provider";

const FEATURES = [
  "List houses, plots and shops for sale or rent",
  "Feature and refresh your ads to reach more buyers",
  "See your plan, credits and listing status at a glance",
];

/** Split-screen layout shared by the login and registration pages. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { resolvedMode, toggleMode } = useThemeSettings();

  return (
    <div className="login-shell">
      <section className="login-brand">
        <div className="brand" style={{ padding: 0 }}>
          <BrandMark style={{ boxShadow: "none" }} />
          <span>
            <div className="brand-name">DHA GUJ</div>
            <div className="brand-sub" style={{ color: "rgba(255,255,255,0.75)" }}>
              Property Portal
            </div>
          </span>
        </div>

        <div>
          <h1>Sell and rent property faster, from one simple dashboard.</h1>
          {FEATURES.map((feature) => (
            <div key={feature} className="login-feature">
              <CheckCircleFilled /> {feature}
            </div>
          ))}
        </div>

        <Typography.Text style={{ color: "rgba(255,255,255,0.7)" }}>© {new Date().getFullYear()} DHA GUJ Real Estate Services</Typography.Text>
      </section>

      <section className="login-form-wrap">
        <Button
          className="login-theme-toggle"
          type="text"
          aria-label="Toggle dark mode"
          icon={resolvedMode === "dark" ? <SunOutlined /> : <MoonOutlined />}
          onClick={toggleMode}
        />

        <div style={{ width: "100%", maxWidth: 420 }}>
          <div className="login-mobile-brand">
            <BrandMark />
            <Typography.Text strong style={{ fontSize: 16 }}>
              DHA GUJ Property Portal
            </Typography.Text>
          </div>

          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            {title}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 28 }}>
            {subtitle}
          </Typography.Paragraph>

          {children}
        </div>
      </section>
    </div>
  );
}
