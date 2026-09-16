"use client";

import { BankOutlined, ClockCircleOutlined, InboxOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Result,
  Row,
  Skeleton,
  Steps,
  Table,
  Tag,
  Typography,
  Upload,
  type UploadFile,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { InvoicePdfButton } from "@/components/invoice-pdf-button";
import { PageHeader } from "@/components/page-header";
import { api, apiUpload } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS, formatDate, formatPrice } from "@/lib/labels";
import type { OrderWithBank, Payment, PaymentStatus, Resource } from "@/types/api";

type ReceiptValues = { reference: string; amount?: number | null; paid_on?: Dayjs | null; receipt?: UploadFile[] };

/** Apply or remove a coupon while the order is still unpaid. */
function CouponBox({ orderId, couponCode }: { orderId: number; couponCode: string | null }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const onSuccess = (response: OrderWithBank, text: string) => {
    queryClient.setQueryData(["order", String(orderId)], (current: OrderWithBank | undefined) => ({ ...current, ...response, seller: current?.seller }));
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    message.success(text);
  };

  const apply = useMutation({
    mutationFn: (code: string) => api<OrderWithBank>(`portal/orders/${orderId}/coupon`, { method: "POST", body: { code } }),
    onSuccess: (response) => onSuccess(response, `Coupon ${response.data.coupon_code} applied`),
    onError: (error) => message.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: () => api<OrderWithBank>(`portal/orders/${orderId}/coupon`, { method: "DELETE" }),
    onSuccess: (response) => onSuccess(response, "Coupon removed"),
    onError: (error) => message.error(errorMessage(error)),
  });

  return (
    <div style={{ marginTop: 16 }}>
      {couponCode ? (
        <Typography.Text>
          <Tag color="green">{couponCode}</Tag>
          <Button type="link" size="small" loading={remove.isPending} onClick={() => remove.mutate()}>
            Remove coupon
          </Button>
        </Typography.Text>
      ) : (
        <Input.Search
          placeholder="Have a coupon code?"
          enterButton="Apply"
          allowClear
          loading={apply.isPending}
          onSearch={(value) => value.trim() && apply.mutate(value.trim())}
        />
      )}
    </div>
  );
}

const STEP_BY_STATUS = { pending_payment: 1, awaiting_approval: 2, paid: 3, cancelled: 1, refunded: 3 } as const;

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ReceiptValues>();

  const order = useQuery({
    queryKey: ["order", id],
    queryFn: () => api<OrderWithBank>(`portal/orders/${id}`),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["order", id] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const upload = useMutation({
    mutationFn: (values: ReceiptValues) => {
      const formData = new FormData();
      formData.append("reference", values.reference);

      if (values.amount) {
        formData.append("amount", String(values.amount));
      }

      if (values.paid_on) {
        formData.append("paid_on", values.paid_on.format("YYYY-MM-DD"));
      }

      const file = values.receipt?.[0]?.originFileObj;

      if (file) {
        formData.append("receipt", file);
      }

      return apiUpload<Resource<Payment>>(`portal/orders/${id}/payments`, formData);
    },
    onSuccess: () => {
      message.success("Receipt uploaded. We will confirm your payment soon.");
      form.resetFields();
      refresh();
    },
    onError: (error) => applyFormErrors(form, error) || message.error(errorMessage(error)),
  });

  const cancel = useMutation({
    mutationFn: () => api(`portal/orders/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      message.success("Order cancelled");
      refresh();
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  if (order.isError) {
    return <Result status="404" title="Order not found" extra={<Link href="/orders">Back to billing</Link>} />;
  }

  if (!order.data) {
    return <Skeleton active />;
  }

  const { data, bank_transfer: bank } = order.data;
  const lastRejected = data.payments?.find((payment) => payment.status === "rejected");
  const isOpen = data.status === "pending_payment" || data.status === "awaiting_approval";

  const paymentColumns: ColumnsType<Payment> = [
    { title: "Reference", dataIndex: "reference" },
    { title: "Amount", dataIndex: "amount", align: "right", render: (value: string) => formatPrice(value) },
    { title: "Uploaded", dataIndex: "created_at", render: (value: string) => formatDate(value, true) },
    {
      title: "Status",
      render: (_, payment) => (
        <>
          <Tag color={PAYMENT_STATUS_COLORS[payment.status as PaymentStatus]}>{PAYMENT_STATUS_LABELS[payment.status]}</Tag>
          {payment.rejection_reason && (
            <Typography.Text type="danger" style={{ display: "block", fontSize: 13 }}>
              {payment.rejection_reason}
            </Typography.Text>
          )}
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={`Order ${data.order_no}`}
        subtitle={data.offer_name}
        extra={
          data.status === "pending_payment" && (
            <Button
              danger
              onClick={() =>
                modal.confirm({
                  title: "Cancel this order?",
                  content: "You can start a new order at any time.",
                  okText: "Cancel order",
                  okButtonProps: { danger: true },
                  cancelText: "Keep it",
                  onOk: () => cancel.mutateAsync(),
                })
              }
            >
              Cancel order
            </Button>
          )
        }
      />

      {data.status !== "cancelled" && (
        <Card style={{ marginBottom: 16 }}>
          <Steps
            current={STEP_BY_STATUS[data.status]}
            status={data.status === "paid" ? "finish" : "process"}
            responsive
            items={[{ title: "Order created" }, { title: "Pay by bank transfer" }, { title: "We confirm payment" }, { title: "Plan active" }]}
          />
        </Card>
      )}

      {data.status === "paid" && (
        <Card style={{ marginBottom: 16 }}>
          <Result
            status="success"
            title="Payment confirmed"
            subTitle={`Your ${data.offer_name} plan is active since ${formatDate(data.paid_at, true)}.`}
            extra={[
              <Link key="plan" href="/plan">
                <Button type="primary">View my plan</Button>
              </Link>,
              data.invoice_no && (
                <Link key="invoice" href={`/invoice/${data.id}`} target="_blank">
                  <Button>View invoice {data.invoice_no}</Button>
                </Link>
              ),
              data.invoice_no && <InvoicePdfButton key="invoice-pdf" order={data} />,
            ]}
          />
        </Card>
      )}

      {data.status === "refunded" && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="This order was refunded"
          description="The plan bought with it has been cancelled. The original invoice stays available for your records."
          action={<InvoicePdfButton order={data} size="small" />}
        />
      )}

      {data.status === "awaiting_approval" && (
        <Card style={{ marginBottom: 16 }}>
          <Result icon={<ClockCircleOutlined />} title="Receipt received" subTitle="Our team is checking your transfer. You will get an email as soon as it is confirmed." />
        </Card>
      )}

      {data.status === "cancelled" && <Alert type="info" showIcon style={{ marginBottom: 16 }} title={`This order was cancelled on ${formatDate(data.cancelled_at, true)}.`} />}

      <Row gutter={16}>
        <Col xs={24} lg={isOpen ? 12 : 24}>
          <Card title="Order summary" style={{ marginBottom: 16 }}>
            <Descriptions
              column={1}
              size="small"
              items={[
                { key: "plan", label: "Plan", children: data.offer_name },
                { key: "list", label: "Plan price", children: formatPrice(data.list_price ?? data.subtotal) },
                ...(Number(data.discount_amount) > 0
                  ? [{ key: "discount", label: `Discount${data.coupon_code ? ` (${data.coupon_code})` : ""}`, children: <Typography.Text type="success">− {formatPrice(data.discount_amount)}</Typography.Text> }]
                  : []),
                { key: "subtotal", label: "Subtotal", children: formatPrice(data.subtotal) },
                { key: "tax", label: `Tax (${Number(data.tax_percent)}%)`, children: formatPrice(data.tax_amount) },
                { key: "total", label: "Total to pay", children: <Typography.Text strong style={{ fontSize: 18 }}>{formatPrice(data.total)}</Typography.Text> },
                { key: "status", label: "Status", children: <Tag color={ORDER_STATUS_COLORS[data.status]}>{ORDER_STATUS_LABELS[data.status]}</Tag> },
                { key: "created", label: "Ordered", children: formatDate(data.created_at, true) },
              ]}
            />
            {data.status === "pending_payment" && <CouponBox orderId={data.id} couponCode={data.coupon_code} />}
          </Card>
        </Col>

        {isOpen && (
          <Col xs={24} lg={12}>
            <Card title={<><BankOutlined /> Bank transfer details</>} style={{ marginBottom: 16 }}>
              <Descriptions
                column={1}
                size="small"
                items={[
                  { key: "bank", label: "Bank", children: bank.bank_name },
                  { key: "title", label: "Account title", children: <Typography.Text copyable>{bank.account_title}</Typography.Text> },
                  { key: "number", label: "Account number", children: <Typography.Text copyable>{bank.account_number}</Typography.Text> },
                  { key: "iban", label: "IBAN", children: <Typography.Text copyable>{bank.iban}</Typography.Text> },
                  { key: "amount", label: "Amount", children: <Typography.Text copyable={{ text: data.total }} strong>{formatPrice(data.total)}</Typography.Text> },
                  { key: "reference", label: "Reference", children: <Typography.Text copyable strong>{data.order_no}</Typography.Text> },
                ]}
              />
              <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                {bank.instructions}
              </Typography.Paragraph>
            </Card>
          </Col>
        )}
      </Row>

      {data.status === "pending_payment" && (
        <Card title={<><UploadOutlined /> Upload your payment receipt</>} style={{ marginBottom: 16 }}>
          {lastRejected && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              title="Your last receipt was not accepted"
              description={`${lastRejected.rejection_reason ?? ""} Please upload a new receipt.`}
            />
          )}
          <Form form={form} layout="vertical" requiredMark="optional" onFinish={(values) => upload.mutate(values)} initialValues={{ amount: Number(data.total), paid_on: dayjs() }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="reference" label="Bank transaction ID" rules={[{ required: true, message: "Enter the transaction ID from your bank" }]}>
                  <Input placeholder="e.g. TRX1234567890" />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item name="amount" label="Amount paid (Rs)">
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={12} md={8}>
                <Form.Item name="paid_on" label="Paid on">
                  <DatePicker style={{ width: "100%" }} disabledDate={(date) => date.isAfter(dayjs(), "day")} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="receipt"
              label="Receipt (photo or PDF)"
              valuePropName="fileList"
              getValueFromEvent={(event: { fileList?: UploadFile[] } | UploadFile[]) => (Array.isArray(event) ? event : event?.fileList)}
              rules={[{ required: true, message: "Attach your receipt" }]}
            >
              <Upload.Dragger beforeUpload={() => false} maxCount={1} accept="image/jpeg,image/png,image/webp,application/pdf">
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Click or drag your receipt here</p>
                <p className="ant-upload-hint">JPG, PNG, WebP or PDF, up to 5 MB</p>
              </Upload.Dragger>
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" loading={upload.isPending}>
              Submit receipt
            </Button>
          </Form>
        </Card>
      )}

      {(data.payments ?? []).length > 0 && (
        <Card title="Receipts">
          <Table rowKey="id" size="small" pagination={false} dataSource={data.payments} columns={paymentColumns} scroll={{ x: "max-content" }} />
        </Card>
      )}
    </>
  );
}
