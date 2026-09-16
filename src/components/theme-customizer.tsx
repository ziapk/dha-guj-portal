"use client";

import { CheckOutlined, DesktopOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button, Drawer, Flex, Segmented, Switch, Typography } from "antd";
import type { ReactNode } from "react";
import { ACCENTS, type AccentKey, type ThemeMode } from "@/theme/presets";
import { useThemeSettings } from "@/theme/theme-provider";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <Typography.Text strong style={{ display: "block", marginBottom: 12 }}>
        {title}
      </Typography.Text>
      {children}
    </div>
  );
}

export function ThemeCustomizer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, update, reset } = useThemeSettings();

  return (
    <Drawer
      title="Customize theme"
      open={open}
      onClose={onClose}
      size={340}
      extra={
        <Button type="text" onClick={reset}>
          Reset
        </Button>
      }
    >
      <Section title="Appearance">
        <Segmented
          block
          value={settings.mode}
          onChange={(mode) => update({ mode: mode as ThemeMode })}
          options={[
            { value: "light", label: "Light", icon: <SunOutlined /> },
            { value: "dark", label: "Dark", icon: <MoonOutlined /> },
            { value: "system", label: "System", icon: <DesktopOutlined /> },
          ]}
        />
      </Section>

      <Section title="Accent colour">
        <div className="swatch-grid">
          {(Object.keys(ACCENTS) as AccentKey[]).map((key) => {
            const accent = ACCENTS[key];
            const selected = settings.accent === key;

            return (
              <div key={key}>
                <button
                  type="button"
                  aria-label={`${accent.name} accent`}
                  aria-pressed={selected}
                  className={`swatch${selected ? " selected" : ""}`}
                  style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.secondary})` }}
                  onClick={() => update({ accent: key })}
                >
                  {selected && <CheckOutlined />}
                </button>
                <span className="swatch-name">{accent.name}</span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Density">
        <Flex justify="space-between" align="center" gap={12}>
          <div>
            <div>Compact mode</div>
            <Typography.Text type="secondary">Smaller controls and tighter tables</Typography.Text>
          </div>
          <Switch checked={settings.compact} onChange={(compact) => update({ compact })} />
        </Flex>
      </Section>

      <Typography.Text type="secondary">Your choice is saved in this browser.</Typography.Text>
    </Drawer>
  );
}
