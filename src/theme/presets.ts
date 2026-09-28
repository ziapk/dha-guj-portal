import { theme, type ThemeConfig } from "antd";

export type ThemeMode = "light" | "dark" | "system";
export type AccentKey = "brand" | "emerald" | "violet" | "rose" | "amber";
export type ThemeSettings = { mode: ThemeMode; accent: AccentKey; compact: boolean };

export const DEFAULT_SETTINGS: ThemeSettings = { mode: "system", accent: "brand", compact: false };

/**
 * DHA Gujranwala Properties brand blue (from the logo). White text on it is 4.8:1 (WCAG AA);
 * the same values are CSS variables in app/globals.css and are shared with the Portal and Web.
 */
export const BRAND = { primary: "#1a73e8", deep: "#0b57d0", tint: "#e8f0fe", tintStrong: "#d2e3fc", darkLink: "#8ab4f8" };

/** Accent presets: primary drives Ant Design; secondary completes the brand gradient. */
export const ACCENTS: Record<AccentKey, { name: string; primary: string; secondary: string }> = {
  brand: { name: "DHA Blue", primary: BRAND.primary, secondary: BRAND.deep },
  emerald: { name: "Emerald", primary: "#059669", secondary: "#0d9488" },
  violet: { name: "Violet", primary: "#7c3aed", secondary: "#db2777" },
  rose: { name: "Rose", primary: "#e11d48", secondary: "#f97316" },
  amber: { name: "Amber", primary: "#d97706", secondary: "#dc2626" },
};

export const FONT_BODY = "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const PALETTE = {
  light: {
    layout: "#f4f7fc",
    container: "#ffffff",
    elevated: "#ffffff",
    border: "#e4eaf3",
    text: "#10213f",
    muted: "#5b6b84",
    sidebar: "#ffffff",
    sidebarText: "#253858",
    sidebarGroup: "#8593a8",
    sidebarHover: "#f1f5fd",
    tableHeader: "#f6f9fe",
    tableHeaderText: "#5b6b84",
    rowHover: "#f3f7fe",
  },
  dark: {
    layout: "#0b1220",
    container: "#121b2c",
    elevated: "#18233a",
    border: "#23304a",
    text: "#e7ecf5",
    muted: "#94a3b8",
    sidebar: "#0e1627",
    sidebarText: "rgba(226, 232, 240, 0.78)",
    sidebarGroup: "rgba(148, 163, 184, 0.7)",
    sidebarHover: "rgba(255, 255, 255, 0.06)",
    tableHeader: "#152037",
    tableHeaderText: "#94a3b8",
    rowHover: "#16233b",
  },
};

export function buildTheme(mode: "light" | "dark", { accent, compact }: ThemeSettings): ThemeConfig {
  const colors = PALETTE[mode];
  const { primary } = ACCENTS[accent];
  const menuItem = {
    itemColor: colors.sidebarText,
    itemHoverColor: mode === "dark" ? "#ffffff" : primary,
    itemHoverBg: colors.sidebarHover,
    itemSelectedBg: primary,
    itemSelectedColor: "#ffffff",
    groupTitleColor: colors.sidebarGroup,
  };

  return {
    algorithm: [mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm, ...(compact ? [theme.compactAlgorithm] : [])],
    token: {
      colorPrimary: primary,
      colorInfo: primary,
      colorLink: mode === "dark" && accent === "brand" ? BRAND.darkLink : primary,
      colorSuccess: "#12a150",
      colorWarning: "#f59e0b",
      colorError: "#e5484d",
      colorBgLayout: colors.layout,
      colorBgContainer: colors.container,
      colorBgElevated: colors.elevated,
      colorBorderSecondary: colors.border,
      colorText: colors.text,
      colorTextSecondary: colors.muted,
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
      Button: { primaryShadow: `0 6px 14px -8px ${primary}`, fontWeight: 500 },
      Menu: {
        ...menuItem,
        itemBg: colors.sidebar,
        subMenuItemBg: colors.sidebar,
        darkItemBg: colors.sidebar,
        darkSubMenuItemBg: colors.sidebar,
        darkPopupBg: colors.elevated,
        darkItemColor: menuItem.itemColor,
        darkItemHoverColor: menuItem.itemHoverColor,
        darkItemHoverBg: menuItem.itemHoverBg,
        darkItemSelectedBg: primary,
        darkItemSelectedColor: "#ffffff",
        darkGroupTitleColor: menuItem.groupTitleColor,
        activeBarBorderWidth: 0,
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
