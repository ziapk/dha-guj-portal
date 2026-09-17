"use client";

import {
  BgColorsOutlined,
  HomeFilled,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  PlusOutlined,
  SearchOutlined,
  SunOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, Badge, Breadcrumb, Button, Drawer, Dropdown, Grid, Layout, Menu, Tooltip } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CommandPalette, type PaletteEntry } from "@/components/command-palette";
import { findNavItem, navGroupsFor } from "@/components/nav";
import { ThemeCustomizer } from "@/components/theme-customizer";
import { useImpersonation, useMe } from "@/hooks/use-me";
import { api } from "@/lib/api-client";
import { ACCOUNT_TYPE_LABELS } from "@/lib/labels";
import { useThemeSettings } from "@/theme/theme-provider";
import type { Impersonation, Lead, Paginated } from "@/types/api";

function initials(name: string | undefined): string {
  return (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link href="/" className={`brand${collapsed ? " collapsed" : ""}`}>
      <span className="brand-logo">
        <HomeFilled />
      </span>
      {!collapsed && (
        <span>
          <div className="brand-name">DHA GUJ</div>
          <div className="brand-sub">Property Portal</div>
        </span>
      )}
    </Link>
  );
}

/** A loud strip on every page while an admin is logged in as this user, with a way out. */
function ImpersonationBanner({ impersonation, userName, onEnd }: { impersonation: Impersonation; userName: string | undefined; onEnd: () => void }) {
  const [ending, setEnding] = useState(false);
  const endsAt = dayjs(impersonation.expires_at);

  // The token stops working at expiry; end the session cleanly instead of waiting for a failed request.
  useEffect(() => {
    const timer = window.setTimeout(onEnd, Math.max(0, Math.min(dayjs(impersonation.expires_at).diff(dayjs()), 2_147_000_000)));

    return () => window.clearTimeout(timer);
  }, [impersonation.expires_at, onEnd]);

  return (
    <div className="impersonation-banner" role="alert">
      <UserSwitchOutlined aria-hidden />
      <span className="impersonation-text">
        Admin <strong>{impersonation.admin_name ?? "(unknown)"}</strong> is logged in as <strong>{userName ?? "this user"}</strong> — session ends at{" "}
        <strong>{endsAt.format(endsAt.isSame(dayjs(), "day") ? "HH:mm" : "DD MMM, HH:mm")}</strong>
      </span>
      <Button
        size="small"
        className="impersonation-end"
        icon={<LogoutOutlined />}
        loading={ending}
        onClick={() => {
          setEnding(true);
          onEnd();
        }}
      >
        End session
      </Button>
    </div>
  );
}

export function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const { data: me } = useMe();
  const { data: impersonation } = useImpersonation();
  const { resolvedMode, toggleMode } = useThemeSettings();

  const isMobile = screens.lg === false;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    queryClient.clear();
    router.replace("/login");
    router.refresh();
  }, [queryClient, router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const newLeads = useQuery({
    queryKey: ["leads-total", "new"],
    queryFn: () => api<Paginated<Lead>>("portal/leads", { query: { status: "new", per_page: 1 } }).then((page) => page.meta.total),
    refetchInterval: 60_000,
  });

  const current = findNavItem(pathname);
  const accountLabel = me ? (me.agency ? `Agent · ${me.agency.name}` : ACCOUNT_TYPE_LABELS[me.account_type]) : "Account";
  const isDeveloper = me?.account_type === "developer";
  const visibleGroups = useMemo(() => navGroupsFor(me?.account_type), [me?.account_type]);

  const menuItems = visibleGroups.map((group) => ({
    type: "group" as const,
    key: group.title,
    label: group.title,
    children: group.items.map((item) => ({
      key: item.href,
      icon: item.icon,
      label: (
        <Link href={item.href}>
          {item.label}
          {item.href === "/leads" && (newLeads.data ?? 0) > 0 && <Badge count={newLeads.data} size="small" style={{ marginInlineStart: 8, boxShadow: "none" }} />}
        </Link>
      ),
    })),
  }));

  const paletteEntries = useMemo<PaletteEntry[]>(
    () => [
      ...visibleGroups.flatMap((group) => group.items).map((item) => ({
        key: item.href,
        label: item.label,
        group: "Go to",
        icon: item.icon,
        keywords: item.keywords,
        run: () => router.push(item.href),
      })),
      {
        key: "toggle-mode",
        label: resolvedMode === "dark" ? "Switch to light mode" : "Switch to dark mode",
        group: "Action",
        icon: resolvedMode === "dark" ? <SunOutlined /> : <MoonOutlined />,
        keywords: "theme appearance",
        run: toggleMode,
      },
      { key: "customize", label: "Customize theme colours", group: "Action", icon: <BgColorsOutlined />, keywords: "accent palette", run: () => setCustomizerOpen(true) },
      { key: "logout", label: "Log out", group: "Action", icon: <LogoutOutlined />, keywords: "sign out", run: logout },
    ],
    [visibleGroups, router, resolvedMode, toggleMode, logout],
  );

  const breadcrumbItems = [
    { title: <Link href="/">Home</Link> },
    ...(current && current.href !== "/" ? [{ title: <Link href={current.href}>{current.label}</Link> }] : []),
    ...(current && current.href !== "/" && pathname !== current.href ? [{ title: `#${pathname.split("/").pop()}` }] : []),
  ];

  const sidebar = (compact: boolean) => (
    <div className="sidebar-content">
      <Brand collapsed={compact} />
      <Menu
        className="sidebar-menu"
        theme="dark"
        mode="inline"
        selectedKeys={current ? [current.href] : []}
        items={menuItems}
        onClick={() => setMobileMenuOpen(false)}
      />
      {!compact && me && (
        <div className="sidebar-user">
          <Avatar className="avatar-accent">{initials(me.name)}</Avatar>
          <div style={{ minWidth: 0 }}>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{me.name}</div>
            <small>{accountLabel}</small>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!isMobile && (
        <Layout.Sider className="app-sider" width={248} collapsedWidth={80} collapsed={collapsed} trigger={null}>
          {sidebar(collapsed)}
        </Layout.Sider>
      )}

      <Drawer
        open={isMobile && mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        placement="left"
        size={264}
        closable={false}
        styles={{ body: { padding: 0, background: resolvedMode === "dark" ? "#0a0f1c" : "#0f172a" } }}
      >
        {sidebar(false)}
      </Drawer>

      <Layout>
        <div className="app-topbar">
        {impersonation && <ImpersonationBanner impersonation={impersonation} userName={me?.name} onEnd={logout} />}
        <Layout.Header className="app-header">
          <Button
            type="text"
            aria-label={isMobile ? "Open menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
            icon={isMobile ? <MenuOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => (isMobile ? setMobileMenuOpen(true) : setCollapsed(!collapsed))}
          />

          <div className="header-spacer">{screens.md && <Breadcrumb items={breadcrumbItems} />}</div>

          {screens.md ? (
            <button type="button" className="search-trigger" onClick={() => setPaletteOpen(true)}>
              <SearchOutlined />
              <span className="search-label">Search…</span>
              <kbd>⌘K</kbd>
            </button>
          ) : (
            <Button type="text" aria-label="Search" icon={<SearchOutlined />} onClick={() => setPaletteOpen(true)} />
          )}

          {screens.sm && (
            <Link href={isDeveloper ? "/projects/new" : "/listings/new"}>
              <Button type="primary" icon={<PlusOutlined />}>
                {screens.md ? (isDeveloper ? "Add project" : "Add listing") : null}
              </Button>
            </Link>
          )}

          <Tooltip title={resolvedMode === "dark" ? "Light mode" : "Dark mode"}>
            <Button
              type="text"
              aria-label="Toggle dark mode"
              icon={resolvedMode === "dark" ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleMode}
            />
          </Tooltip>

          <Tooltip title="Customize theme">
            <Button type="text" aria-label="Customize theme" icon={<BgColorsOutlined />} onClick={() => setCustomizerOpen(true)} />
          </Tooltip>

          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "profile", icon: <UserOutlined />, label: <Link href="/profile">My profile</Link> },
                { key: "plan", icon: <HomeFilled />, label: <Link href="/plan">Plan & quota</Link> },
                { key: "theme", icon: <BgColorsOutlined />, label: "Customize theme", onClick: () => setCustomizerOpen(true) },
                { type: "divider" },
                { key: "logout", icon: <LogoutOutlined />, label: "Log out", danger: true, onClick: logout },
              ],
            }}
          >
            <div className="user-trigger" role="button" tabIndex={0} aria-label="Account menu">
              <Avatar className="avatar-accent">{initials(me?.name)}</Avatar>
              {screens.md && (
                <div>
                  <div style={{ lineHeight: 1.2 }}>{me?.name ?? "…"}</div>
                  <small>{accountLabel}</small>
                </div>
              )}
            </div>
          </Dropdown>
        </Layout.Header>
        </div>

        <Layout.Content className="app-content">
          <div key={pathname} className="page-container page-enter">
            {children}
          </div>
        </Layout.Content>
      </Layout>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} entries={paletteEntries} />
      <ThemeCustomizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
    </Layout>
  );
}
