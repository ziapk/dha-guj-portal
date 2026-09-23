import {
  AreaChartOutlined,
  ApartmentOutlined,
  CreditCardOutlined,
  CrownOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  FundOutlined,
  HomeOutlined,
  IdcardOutlined,
  MessageOutlined,
  NotificationOutlined,
  PlusCircleOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
import type { AccountType } from "@/types/api";

export type NavItem = { href: string; label: string; icon: ReactNode; keywords?: string; accountTypes?: AccountType[] };

export type NavGroup = { title: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: <DashboardOutlined />, keywords: "home stats" },
      { href: "/analytics", label: "Analytics", icon: <AreaChartOutlined />, keywords: "views clicks chart reports statistics performance daily" },
    ],
  },
  {
    title: "Listings",
    items: [
      { href: "/listings", label: "My Listings", icon: <HomeOutlined />, keywords: "properties ads" },
      { href: "/listings/new", label: "Add Listing", icon: <PlusCircleOutlined />, keywords: "post create sell rent new" },
    ],
  },
  {
    title: "Projects",
    items: [
      { href: "/projects", label: "Projects", icon: <ApartmentOutlined />, keywords: "developer builder housing scheme units payment plan", accountTypes: ["developer"] },
      { href: "/projects/new", label: "Add Project", icon: <PlusCircleOutlined />, keywords: "post create developer builder housing scheme new", accountTypes: ["developer"] },
    ],
  },
  {
    title: "Buyers",
    items: [
      { href: "/leads", label: "Leads", icon: <MessageOutlined />, keywords: "inquiries messages buyers tenants assign export csv" },
      { href: "/buyer-requirements", label: "Buyer Requirements", icon: <FileSearchOutlined />, keywords: "wanted buyers looking demand unlock contact lead access" },
    ],
  },
  {
    title: "Promote",
    items: [
      {
        href: "/banners",
        label: "Banner Ads",
        icon: <NotificationOutlined />,
        keywords: "advertise advertising banner promotion marketing",
        accountTypes: ["individual", "agency", "developer"],
      },
    ],
  },
  {
    title: "Agency",
    items: [
      { href: "/agency", label: "Agency Page", icon: <ShopOutlined />, keywords: "profile logo public page verified verification documents approval", accountTypes: ["agency"] },
      { href: "/agent-profile", label: "My Agent Page", icon: <IdcardOutlined />, keywords: "profile photo bio expertise social public page approval", accountTypes: ["agent"] },
      { href: "/agents", label: "Agents", icon: <TeamOutlined />, keywords: "team staff seats accounts invite invitation credit limits", accountTypes: ["agency"] },
      { href: "/team-performance", label: "Team Performance", icon: <FundOutlined />, keywords: "agents compare leaderboard report deals", accountTypes: ["agency"] },
    ],
  },
  {
    title: "Plan",
    items: [
      { href: "/plan", label: "Plan & Quota", icon: <CrownOutlined />, keywords: "subscription credits upgrade offers" },
      { href: "/orders", label: "Billing", icon: <CreditCardOutlined />, keywords: "orders payments receipts bank transfer", accountTypes: ["individual", "agency", "developer"] },
    ],
  },
  {
    title: "Account",
    items: [{ href: "/profile", label: "My Profile", icon: <UserOutlined />, keywords: "account name email phone password settings" }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** Menu groups for an account type. Items meant for certain account types stay hidden until the account has loaded. */
export function navGroupsFor(accountType: AccountType | undefined): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.accountTypes || (accountType !== undefined && item.accountTypes.includes(accountType))),
  })).filter((group) => group.items.length > 0);
}

/** The most specific nav item for a pathname: /listings/new → Add Listing, /listings/12 → My Listings. */
export function findNavItem(pathname: string): NavItem | undefined {
  return [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => (item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`)));
}
