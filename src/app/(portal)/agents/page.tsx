"use client";

import { EditOutlined, LockOutlined, MailOutlined, PhoneOutlined, PlusOutlined, SlidersOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Avatar, Button, Card, Col, Empty, Flex, Form, Input, Modal, Popconfirm, Progress, Row, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useState } from "react";
import { AgentAllocationsDrawer } from "@/components/agent-allocations-drawer";
import { AgentInvitations } from "@/components/agent-invitations";
import { PageHeader } from "@/components/page-header";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import { formatDate } from "@/lib/labels";
import type { AccountStatus, AgentSeats, AgentsResponse, Resource, User } from "@/types/api";

type AgentValues = { name: string; email?: string | null; phone?: string | null; password?: string; password_confirmation?: string };

function AgentModal({ agent, onClose }: { agent: User | "new"; onClose: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<AgentValues>();
  const isNew = agent === "new";

  const save = useMutation({
    mutationFn: (values: AgentValues) =>
      isNew
        ? api<Resource<User>>("portal/agents", { method: "POST", body: values })
        : api<Resource<User>>(`portal/agents/${agent.id}`, { method: "PATCH", body: values }),
    onSuccess: (result) => {
      message.success(isNew ? `${result.data.name} can now log in to Property Admin` : "Agent updated");
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      onClose();
    },
    onError: (error) => {
      if (!applyFormErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  return (
    <Modal
      open
      title={isNew ? "Add an agent" : `Edit ${agent.name}`}
      okText={isNew ? "Add agent" : "Save"}
      confirmLoading={save.isPending}
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={isNew ? {} : { name: agent.name, email: agent.email, phone: agent.phone }}
        onFinish={(values) => save.mutate(values)}
      >
        <Form.Item name="name" label="Full name" rules={[{ required: true }]}>
          <Input prefix={<UserOutlined />} autoComplete="off" />
        </Form.Item>
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="email"
              label="Email"
              dependencies={["phone"]}
              rules={[
                { type: "email" },
                ({ getFieldValue }) => ({
                  validator: (_, value) => (value || getFieldValue("phone") ? Promise.resolve() : Promise.reject(new Error("Enter an email or a phone number"))),
                }),
              ]}
            >
              <Input prefix={<MailOutlined />} autoComplete="off" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="phone" label="Phone" dependencies={["email"]}>
              <Input prefix={<PhoneOutlined />} placeholder="03001234567" autoComplete="off" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="password"
              label={isNew ? "Password" : "New password"}
              extra={isNew ? undefined : "Leave empty to keep the current password"}
              rules={[{ required: isNew }, { min: 8, message: "At least 8 characters" }]}
            >
              <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="password_confirmation"
              label="Confirm password"
              dependencies={["password"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, value) => ((value ?? "") === (getFieldValue("password") ?? "") ? Promise.resolve() : Promise.reject(new Error("Passwords do not match"))),
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

function SeatsCard({ seats }: { seats: AgentSeats }) {
  if (seats.limit === 0) {
    return (
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        title="Your plan has no agent seats"
        description={
          <>
            Upgrade to an agency plan that includes agent accounts. <Link href="/plan">See plans</Link>
          </>
        }
      />
    );
  }

  const percent = seats.limit === null ? 0 : Math.min(100, Math.round((seats.used / seats.limit) * 100));

  return (
    <Card style={{ marginBottom: 16 }}>
      <Flex justify="space-between" align="center" gap={16} wrap>
        <div>
          <Typography.Text type="secondary">Agent seats</Typography.Text>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {seats.limit === null ? `${seats.used} active · unlimited` : `${seats.used} of ${seats.limit} in use`}
          </Typography.Title>
        </div>
        {seats.limit !== null && <Progress percent={percent} status={percent >= 100 ? "exception" : "normal"} style={{ flex: "1 1 240px", maxWidth: 360, margin: 0 }} />}
      </Flex>
      <Typography.Paragraph type="secondary" style={{ margin: "8px 0 0" }}>
        Agents list on your plan&apos;s shared credits. Deactivated agents do not use a seat.
      </Typography.Paragraph>
    </Card>
  );
}

export default function AgentsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [limitsFor, setLimitsFor] = useState<User | null>(null);
  const { data: me } = useMe();

  const agents = useQuery({
    queryKey: ["agents"],
    queryFn: () => api<AgentsResponse>("portal/agents"),
  });

  const setStatus = useMutation({
    mutationFn: ({ agent, status }: { agent: User; status: AccountStatus }) => api<Resource<User>>(`portal/agents/${agent.id}`, { method: "PATCH", body: { status } }),
    onSuccess: (_, { agent, status }) => {
      message.success(status === "active" ? `${agent.name} can log in again` : `${agent.name} is deactivated and signed out`);
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  const seats = agents.data?.seats;
  const isFull = !seats || (seats.limit !== null && seats.used >= seats.limit);

  const columns: ColumnsType<User> = [
    {
      title: "Agent",
      render: (_, agent) => (
        <Flex align="center" gap={10}>
          <Avatar className="avatar-accent">{agent.name.slice(0, 1).toUpperCase()}</Avatar>
          <div>
            <Typography.Text strong>{agent.name}</Typography.Text>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {[agent.email, agent.phone].filter(Boolean).join(" · ")}
              </Typography.Text>
            </div>
          </div>
        </Flex>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: AccountStatus) => <Tag color={status === "active" ? "green" : "default"}>{status === "active" ? "Active" : "Deactivated"}</Tag>,
    },
    {
      title: "Listings",
      dataIndex: "listings_count",
      align: "right",
      render: (count: number, agent) => (count > 0 ? <Link href={`/listings?user_id=${agent.id}`}>{count}</Link> : 0),
    },
    { title: "Leads", dataIndex: "leads_count", align: "right" },
    { title: "Added", dataIndex: "created_at", render: (value: string) => formatDate(value) },
    {
      title: "",
      align: "right",
      render: (_, agent) => (
        <Flex gap={8} justify="flex-end">
          <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(agent)}>
            Edit
          </Button>
          <Button size="small" icon={<SlidersOutlined />} onClick={() => setLimitsFor(agent)}>
            Credit limits
          </Button>
          {agent.status === "active" ? (
            <Popconfirm
              title={`Deactivate ${agent.name}?`}
              description="They are signed out straight away. Their listings stay live and you can manage them."
              okText="Deactivate"
              okButtonProps={{ danger: true }}
              onConfirm={() => setStatus.mutate({ agent, status: "suspended" })}
            >
              <Button size="small" danger loading={setStatus.isPending && setStatus.variables?.agent.id === agent.id}>
                Deactivate
              </Button>
            </Popconfirm>
          ) : (
            <Tooltip title={isFull ? "All seats are in use" : undefined}>
              <Button
                size="small"
                disabled={isFull}
                loading={setStatus.isPending && setStatus.variables?.agent.id === agent.id}
                onClick={() => setStatus.mutate({ agent, status: "active" })}
              >
                Reactivate
              </Button>
            </Tooltip>
          )}
        </Flex>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Agents"
        subtitle="Agents log in with their own details and list on your agency's plan"
        extra={
          <Tooltip title={isFull && seats ? "All agent seats are in use — upgrade or deactivate an agent" : undefined}>
            <Button type="primary" icon={<PlusOutlined />} disabled={isFull} onClick={() => setEditing("new")}>
              Add agent
            </Button>
          </Tooltip>
        }
      />

      {seats && <SeatsCard seats={seats} />}

      <Card>
        <Table
          rowKey="id"
          loading={agents.isLoading}
          dataSource={agents.data?.data}
          columns={columns}
          pagination={false}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: <Empty description="No agents yet. Add your team so they can post listings and answer leads." /> }}
        />
      </Card>

      <AgentInvitations agencyName={me?.name} seatsFull={Boolean(seats && seats.limit !== null && seats.used >= seats.limit)} />

      {editing && <AgentModal agent={editing} onClose={() => setEditing(null)} />}
      <AgentAllocationsDrawer agent={limitsFor} onClose={() => setLimitsFor(null)} />
    </>
  );
}
