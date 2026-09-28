"use client";

import { BarChartOutlined, HomeFilled, MoonOutlined, SunOutlined, TeamOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import Image from "next/image";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { useThemeSettings } from "@/theme/theme-provider";

const FEATURES = [
  { icon: <HomeFilled />, title: "Latest Listings", text: "Buy, Sell or Rent Properties" },
  { icon: <TeamOutlined />, title: "Verified Network", text: "Connect with Dealers & Developers" },
  { icon: <BarChartOutlined />, title: "Grow Your Investment", text: "Get Latest Updates & Insights" },
];

/** A soft city skyline along the bottom of the brand panel. */
function Skyline() {
  return (
    <svg className="login-skyline" viewBox="0 0 800 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path
        fill="rgba(255,255,255,0.10)"
        d="M0 220V140h40v-30h50v50h30V90h70v60h40v-40h60v70h30V70h90v90h40v-60h70v50h40V100h80v70h40v-40h60v90z"
      />
      <path
        fill="rgba(6,40,110,0.35)"
        d="M0 220v-50h60v-20h50v40h40v-60h80v70h50v-30h60v50h40v-80h100v80h50v-40h70v40h50v-60h80v50h70v40z"
      />
    </svg>
  );
}

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Shown top right, next to the theme toggle, e.g. "Already have an account? Login". */
  topAction?: ReactNode;
  /** Wider form column, for forms with side-by-side fields. */
  wide?: boolean;
};

/** Split-screen layout shared by the login and registration pages. */
export function AuthLayout({ title, subtitle, children, topAction, wide }: AuthLayoutProps) {
  const { resolvedMode, toggleMode } = useThemeSettings();

  return (
    <div className="login-shell">
      <section className="login-brand">
        <Image className="login-brand-logo" src="/brand/logo-wide.png" alt="DHA Gujranwala Properties" width={515} height={160} priority />

        <div>
          <div className="login-eyebrow">Join our platform</div>
          <h1>
            List, Manage &amp; Grow Your Real Estate <span>Business</span>
          </h1>
          <p className="login-lead">Create your account and get access to powerful features to buy, sell and manage properties in DHA Gujranwala.</p>

          <div className="login-feature-grid">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="login-feature-tile">
                <span className="login-feature-icon">{feature.icon}</span>
                <strong>{feature.title}</strong>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <Typography.Text style={{ color: "rgba(255,255,255,0.7)" }}>© {new Date().getFullYear()} DHA GUJ Real Estate Services</Typography.Text>
        <Skyline />
      </section>

      <section className="login-form-wrap">
        <div className="login-topbar">
          {topAction}
          <Button type="text" aria-label="Toggle dark mode" icon={resolvedMode === "dark" ? <SunOutlined /> : <MoonOutlined />} onClick={toggleMode} />
        </div>

        <div style={{ width: "100%", maxWidth: wide ? 600 : 420 }}>
          <div className="login-mobile-brand">
            <BrandMark />
            <Typography.Text strong style={{ fontSize: 16 }}>
              DHA GUJ Property Portal
            </Typography.Text>
          </div>

          <h2 className="login-title">{title}</h2>
          <Typography.Paragraph type="secondary" style={{ fontSize: 16, marginBottom: 28 }}>
            {subtitle}
          </Typography.Paragraph>

          {children}
        </div>
      </section>
    </div>
  );
}
