"use client";

import { ArrowLeftOutlined, PrinterOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Result, Skeleton } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { InvoicePdfButton } from "@/components/invoice-pdf-button";
import { api } from "@/lib/api-client";
import { formatDate, formatPrice } from "@/lib/labels";
import type { OrderWithBank } from "@/types/api";

/** A printable invoice for a paid order, with the official PDF from the API as a download. */
export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();

  const order = useQuery({
    queryKey: ["order", id],
    queryFn: () => api<OrderWithBank>(`portal/orders/${id}`),
  });

  if (order.isError) {
    return <Result status="404" title="Invoice not found" extra={<Link href="/orders">Back to billing</Link>} />;
  }

  if (!order.data) {
    return (
      <div className="invoice-page">
        <Skeleton active style={{ maxWidth: 820, margin: "0 auto" }} />
      </div>
    );
  }

  const { data, seller } = order.data;

  if (!data.invoice_no) {
    return (
      <Result
        status="info"
        title="No invoice yet"
        subTitle="Invoices are issued as soon as your payment is confirmed."
        extra={<Link href={`/orders/${id}`}>Back to order</Link>}
      />
    );
  }

  const approvedPayment = data.payments?.find((payment) => payment.status === "approved");
  const discount = Number(data.discount_amount);

  return (
    <div className="invoice-page">
      <div className="invoice-toolbar no-print">
        <Link href={`/orders/${id}`}>
          <Button icon={<ArrowLeftOutlined />}>Back to order</Button>
        </Link>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            Print
          </Button>
          <InvoicePdfButton order={data} type="primary" />
        </div>
      </div>

      <article className="invoice">
        <header className="invoice-header">
          <div>
            <div className="invoice-brand">
              <span className="brand-logo">⌂</span>
              <strong>{seller?.seller_name}</strong>
            </div>
            <p>
              {seller?.seller_address}
              <br />
              {seller?.seller_email}
              {seller?.seller_phone && <> · {seller.seller_phone}</>}
              {seller?.tax_number && (
                <>
                  <br />
                  NTN: {seller.tax_number}
                </>
              )}
            </p>
          </div>
          <div className="invoice-meta">
            <h1>Invoice</h1>
            <dl>
              <dt>Invoice no.</dt>
              <dd>{data.invoice_no}</dd>
              <dt>Order no.</dt>
              <dd>{data.order_no}</dd>
              <dt>Issued</dt>
              <dd>{formatDate(data.paid_at)}</dd>
              <dt>Status</dt>
              <dd>
                <span className="invoice-paid">PAID</span>
              </dd>
            </dl>
          </div>
        </header>

        <section className="invoice-parties">
          <div>
            <h3>Billed to</h3>
            <p>
              <strong>{data.user?.name}</strong>
              {data.user?.email && (
                <>
                  <br />
                  {data.user.email}
                </>
              )}
              {data.user?.phone && (
                <>
                  <br />
                  {data.user.phone}
                </>
              )}
            </p>
          </div>
          <div>
            <h3>Payment</h3>
            <p>
              Bank transfer
              {approvedPayment && (
                <>
                  <br />
                  Reference: {approvedPayment.reference}
                </>
              )}
            </p>
          </div>
        </section>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {data.offer_name} plan
                {data.offer?.duration_days ? ` — ${data.offer.duration_days} days` : ""}
              </td>
              <td>{formatPrice(data.list_price ?? data.subtotal)}</td>
            </tr>
            {discount > 0 && (
              <tr>
                <td>Discount{data.coupon_code ? ` (${data.coupon_code})` : ""}</td>
                <td>− {formatPrice(data.discount_amount)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td>Subtotal</td>
              <td>{formatPrice(data.subtotal)}</td>
            </tr>
            <tr>
              <td>Tax ({Number(data.tax_percent)}%)</td>
              <td>{formatPrice(data.tax_amount)}</td>
            </tr>
            <tr className="invoice-total">
              <td>Total paid</td>
              <td>{formatPrice(data.total)}</td>
            </tr>
          </tfoot>
        </table>

        <footer className="invoice-footer">Thank you for your business. This invoice was generated electronically and is valid without a signature.</footer>
      </article>
    </div>
  );
}
