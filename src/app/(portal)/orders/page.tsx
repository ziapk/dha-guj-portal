"use client";

import { CrownOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Empty, Flex, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InvoicePdfButton } from "@/components/invoice-pdf-button";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api-client";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, formatDate, formatPrice } from "@/lib/labels";
import type { Order, OrderStatus, Paginated } from "@/types/api";

export default function BillingPage() {
  const router = useRouter();

  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => api<Paginated<Order>>("portal/orders"),
  });

  const columns: ColumnsType<Order> = [
    { title: "Order", dataIndex: "order_no", render: (value: string, order) => <Link href={`/orders/${order.id}`}>{value}</Link> },
    { title: "Plan", dataIndex: "offer_name" },
    { title: "Total", dataIndex: "total", align: "right", render: (value: string) => formatPrice(value) },
    { title: "Ordered", dataIndex: "created_at", render: (value: string) => formatDate(value) },
    { title: "Status", dataIndex: "status", render: (value: OrderStatus) => <Tag color={ORDER_STATUS_COLORS[value]}>{ORDER_STATUS_LABELS[value]}</Tag> },
    {
      title: "Invoice",
      dataIndex: "invoice_no",
      render: (value: string | null, order) =>
        value ? (
          <Flex align="center" gap={8}>
            <Link href={`/invoice/${order.id}`} target="_blank">
              {value}
            </Link>
            <InvoicePdfButton order={order} size="small" type="text" label="PDF" aria-label={`Download invoice ${value} as PDF`} />
          </Flex>
        ) : (
          "—"
        ),
    },
    {
      title: "",
      align: "right",
      render: (_, order) =>
        order.status === "pending_payment" ? (
          <Button type="primary" size="small" onClick={() => router.push(`/orders/${order.id}`)}>
            Pay now
          </Button>
        ) : (
          <Button size="small" onClick={() => router.push(`/orders/${order.id}`)}>
            View
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="Your plan orders and bank transfer receipts"
        extra={
          <Link href="/plan">
            <Button type="primary" icon={<CrownOutlined />}>
              Upgrade plan
            </Button>
          </Link>
        }
      />
      <Card>
        <Table
          rowKey="id"
          loading={orders.isLoading}
          dataSource={orders.data?.data}
          columns={columns}
          scroll={{ x: "max-content" }}
          pagination={{ hideOnSinglePage: true, pageSize: orders.data?.meta.per_page ?? 15, total: orders.data?.meta.total }}
          locale={{
            emptyText: (
              <Empty description="No orders yet">
                <Typography.Text type="secondary">Pick a plan on the Plan & Quota page to get started.</Typography.Text>
              </Empty>
            ),
          }}
        />
      </Card>
    </>
  );
}
