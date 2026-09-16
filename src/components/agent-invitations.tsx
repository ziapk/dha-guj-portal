"use client";

import { CheckOutlined, CopyOutlined, MailOutlined, UserOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Empty, Flex, Form, Input, Modal, Popconfirm, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import { formatDate } from "@/lib/labels";
import type { AgentInvitation, Collection, Resource } from "@/types/api";

type InviteValues = { name: string; email: string };

/** The invitation link with copy and WhatsApp share buttons. */
function ShareLink({ invitation, agencyName }: { invitation: AgentInvitation & { url: string }; agencyName: string | undefined }) {
  const { message } = App.useApp();
  const [copied, setCopied] = useState(false);

  const text = `Hi ${invitation.name}, ${agencyName ?? "our agency"} has invited you to join as an agent on DHA GUJ. Create your account here: ${invitation.url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(invitation.url);
      setCopied(true);
      message.success("Link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error("Could not copy automatically. Select the link and copy it.");
    }
  }

  return (
    <>
      <Alert
        type="success"
        showIcon
        style={{ marginBottom: 16 }}
        title={`Invitation emailed to ${invitation.email}`}
        description={`You can also send the link yourself. It works once and expires on ${formatDate(invitation.expires_at)}.`}
      />
      <Flex gap={8}>
        <Input value={invitation.url} readOnly onFocus={(event) => event.target.select()} aria-label="Invitation link" />
        <Button icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={() => void copy()}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </Flex>
      <Button
        block
        icon={<WhatsAppOutlined />}
        style={{ marginTop: 12, background: "#25d366", borderColor: "#25d366", color: "#fff" }}
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Share on WhatsApp
      </Button>
    </>
  );
}

function InviteModal({ initial, agencyName, seatsFull, onClose }: { initial?: InviteValues; agencyName: string | undefined; seatsFull: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<InviteValues>();
  const [sent, setSent] = useState<(AgentInvitation & { url: string }) | null>(null);

  const invite = useMutation({
    mutationFn: (values: InviteValues) => api<Resource<AgentInvitation & { url: string }>>("portal/agent-invitations", { method: "POST", body: values }),
    onSuccess: (response) => {
      setSent(response.data);
      queryClient.invalidateQueries({ queryKey: ["agent-invitations"] });
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
      title={sent ? "Share the invitation" : "Invite an agent by email"}
      onCancel={onClose}
      footer={
        sent ? (
          <Button type="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <Flex justify="flex-end" gap={8}>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" icon={<MailOutlined />} loading={invite.isPending} onClick={() => form.submit()}>
              Send invitation
            </Button>
          </Flex>
        )
      }
    >
      {sent ? (
        <ShareLink invitation={sent} agencyName={agencyName} />
      ) : (
        <>
          <Typography.Paragraph type="secondary">
            They get an email with a link to create their own login. A seat is only used when they accept.
          </Typography.Paragraph>
          {seatsFull && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              title="All agent seats are in use"
              description="You can still invite, but they can only join once a seat is free."
            />
          )}
          <Form form={form} layout="vertical" requiredMark={false} initialValues={initial} onFinish={(values) => invite.mutate({ name: values.name.trim(), email: values.email.trim() })}>
            <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: "Enter their name" }, { max: 100 }]}>
              <Input prefix={<UserOutlined />} autoComplete="off" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Enter their email" },
                { type: "email", message: "Enter a valid email address" },
              ]}
            >
              <Input prefix={<MailOutlined />} autoComplete="off" />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
}

/** Pending agent invitations, with invite, send-again and cancel. */
export function AgentInvitations({ agencyName, seatsFull }: { agencyName: string | undefined; seatsFull: boolean }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [inviting, setInviting] = useState<InviteValues | "new" | null>(null);

  const invitations = useQuery({
    queryKey: ["agent-invitations"],
    queryFn: () => api<Collection<AgentInvitation>>("portal/agent-invitations").then((response) => response.data),
  });

  const cancel = useMutation({
    mutationFn: (invitation: AgentInvitation) => api(`portal/agent-invitations/${invitation.id}`, { method: "DELETE" }),
    onSuccess: (_, invitation) => {
      message.success(`Invitation for ${invitation.email} cancelled`);
      queryClient.invalidateQueries({ queryKey: ["agent-invitations"] });
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  const columns: ColumnsType<AgentInvitation> = [
    {
      title: "Invited",
      render: (_, invitation) => (
        <>
          <Typography.Text strong>{invitation.name}</Typography.Text>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {invitation.email}
            </Typography.Text>
          </div>
        </>
      ),
    },
    { title: "Sent", dataIndex: "created_at", render: (value: string) => formatDate(value) },
    {
      title: "Expires",
      dataIndex: "expires_at",
      render: (value: string, invitation) => (invitation.is_expired ? <Tag color="default">Expired</Tag> : formatDate(value)),
    },
    {
      title: "",
      align: "right",
      render: (_, invitation) => (
        <Flex gap={8} justify="flex-end">
          <Button size="small" onClick={() => setInviting({ name: invitation.name, email: invitation.email })}>
            {invitation.is_expired ? "Invite again" : "Send again"}
          </Button>
          <Popconfirm
            title="Cancel this invitation?"
            description="The link stops working straight away."
            okText="Cancel invitation"
            cancelText="Keep"
            okButtonProps={{ danger: true }}
            onConfirm={() => cancel.mutateAsync(invitation)}
          >
            <Button size="small" danger loading={cancel.isPending && cancel.variables?.id === invitation.id}>
              Cancel
            </Button>
          </Popconfirm>
        </Flex>
      ),
    },
  ];

  return (
    <Card
      title="Pending invitations"
      style={{ marginTop: 16 }}
      extra={
        <Button icon={<MailOutlined />} onClick={() => setInviting("new")}>
          Invite by email
        </Button>
      }
    >
      <Table
        rowKey="id"
        loading={invitations.isLoading}
        dataSource={invitations.data}
        columns={columns}
        pagination={false}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No pending invitations. Invite agents by email and they set up their own login." /> }}
      />
      <Typography.Paragraph type="secondary" style={{ margin: "12px 0 0", fontSize: 12 }}>
        &quot;Send again&quot; emails a fresh link and cancels the old one.
      </Typography.Paragraph>

      {inviting && (
        <InviteModal initial={inviting === "new" ? undefined : inviting} agencyName={agencyName} seatsFull={seatsFull} onClose={() => setInviting(null)} />
      )}
    </Card>
  );
}
