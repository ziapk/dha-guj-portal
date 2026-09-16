import { theme, type ThemeConfig } from "antd";

export type ThemeMode = "light" | "dark" | "system";
export type AccentKey = "indigo" | "emerald" | "ocean" | "violet" | "rose" | "amber";
export type ThemeSettings = { mode: ThemeMode; accent: AccentKey; compact: boolean };

export const DEFAULT_SETTINGS: ThemeSettings = { mode: "system", accent: "indigo", compact: false };

/** Accent presets: primary drives Ant Design; secondary completes the brand gradient. */
export const ACCENTS: Record<AccentKey, { name: string; primary: string; secondary: string }> = {
  indigo: { name: "Indigo", primary: "#4f46e5", secondary: "#7c3aed" },
  emerald: { name: "Emerald", primary: "#059669", secondary: "#0d9488" },
  ocean: { name: "Ocean", primary: "#0284c7", secondary: "#4f46e5" },
  violet: { name: "Violet", primary: "#7c3aed", secondary: "#db2777" },
  rose: { name: "Rose", primary: "#e11d48", secondary: "#f97316" },
  amber: { name: "Amber", primary: "#d97706", secondary: "#dc2626" },
};

export const FONT_BODY = "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const PALETTE = {
  light: { layout: "#f5f7fb", container: "#ffffff", elevated: "#ffffff", border: "#eef0f5", sidebar: "#0f172a", tableHeader: "#f8fafc", tableHeaderText: "#64748b", rowHover: "#f5f7ff" },
  dark: { layout: "#0b0f19", container: "#121826", elevated: "#182033", border: "#1f2a3d", sidebar: "#0a0f1c", tableHeader: "#151d2e", tableHeaderText: "#94a3b8", rowHover: "#172036" },
};

export function buildTheme(mode: "light" | "dark", { accent, compact }: ThemeSettings): ThemeConfig {
  const colors = PALETTE[mode];
  const { primary } = ACCENTS[accent];

  return {
    algorithm: [mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm, ...(compact ? [theme.compactAlgorithm] : [])],
    token: {
      colorPrimary: primary,
      colorInfo: primary,
      colorSuccess: "#10b981",
      colorWarning: "#f59e0b",
      colorError: "#ef4444",
      colorBgLayout: colors.layout,
      colorBgContainer: colors.container,
      colorBgElevated: colors.elevated,
      colorBorderSecondary: colors.border,
      fontFamily: FONT_BODY,
      fontSize: 14,
      borderRadius: 10,
      borderRadiusLG: 14,
      borderRadiusSM: 6,
      controlHeight: compact ? 32 : 38,
      motionDurationMid: "0.2s",
    },
    components: {
      Layout: { bodyBg: colors.layout, headerBg: "transparent", siderBg: colors.sidebar, headerHeight: 64, headerPadding: "0 24px" },
      Menu: {
        darkItemBg: colors.sidebar,
        darkSubMenuItemBg: colors.sidebar,
        darkPopupBg: "#111a2e",
        darkItemColor: "rgba(226, 232, 240, 0.72)",
        darkItemHoverColor: "#ffffff",
        darkItemHoverBg: "rgba(255, 255, 255, 0.06)",
        darkItemSelectedBg: primary,
        darkItemSelectedColor: "#ffffff",
        darkGroupTitleColor: "rgba(148, 163, 184, 0.65)",
        itemBorderRadius: 10,
        itemMarginInline: 12,
        itemHeight: 42,
        iconSize: 16,
        collapsedIconSize: 18,
      },
      Card: { headerBg: "transparent", headerHeight: 56 },
      Table: {
        headerBg: colors.tableHeader,
        headerColor: colors.tableHeaderText,
        rowHoverBg: colors.rowHover,
        headerBorderRadius: 10,
        cellPaddingBlock: compact ? 8 : 14,
      },
    },
  };
}
