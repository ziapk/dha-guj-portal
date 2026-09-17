"use client";

import { DownloadOutlined, MailOutlined, PhoneOutlined, UserSwitchOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Drawer, Empty, Flex, Form, Input, Select, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { isFeatureMissing } from "@/components/upgrade-prompt";
import { useMe } from "@/hooks/use-me";
import { api, apiDownload } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";
import { whatsappNumber } from "@/lib/phone";
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, formatDate, toOptions } from "@/lib/labels";
import type { AgentsResponse, Lead, LeadStatus, Paginated, Resource } from "@/types/api";

dayjs.extend(relativeTime);

/** What the buyer asked about: a listing's title or a project's name (a lead has one or the other). */
const leadSubject = (lead: Lead) => lead.property?.title ?? lead.project?.name ?? null;

const TABS: { key: LeadStatus | "all"; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "interested", label: "Interested" },
  { key: "closed", label: "Deal closed" },
  { key: "lost", label: "Lost" },
  { key: "all", label: "All" },
];

/** Select value for "nobody"; the API expects null. */
const UNASSIGNED = "none";

type AssigneeValue = number | typeof UNASSIGNED;

type FollowUpValues = { status: LeadStatus; notes: string | null; assignee?: AssigneeValue };

type TeamOption = { value: number; label: string };

function LeadDrawer({ lead, team, onClose }: { lead: Lead | null; /** Agency only: people a lead can be assigned to. */ team: TeamOption[] | null; onClose: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FollowUpValues>();
  const currentAssignee: AssigneeValue = lead?.assigned_to?.id ?? UNASSIGNED;

  const save = useMutation({
    mutationFn: ({ assignee, ...values }: FollowUpValues) =>
      api<Resource<Lead>>(`portal/leads/${lead?.id}`, {
        method: "PATCH",
        // Only the agency may assign, and only send it when it changed so the assignee is not emailed twice.
        body: team && assignee !== undefined && assignee !== currentAssignee ? { ...values, assigned_user_id: assignee === UNASSIGNED ? null : assignee } : values,
      }),
    onSuccess: () => {
      message.success("Lead updated");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-total"] });
      onClose();
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  return (
    <Drawer open={lead !== null} onClose={onClose} size={460} title={lead?.name} destroyOnHidden extra={lead && <Tag color={LEAD_STATUS_COLORS[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Tag>}>
      {lead && (
        <>
          <Typography.Text type="secondary">
            Received {dayjs(lead.created_at).fromNow()} · {formatDate(lead.created_at, true)}
          </Typography.Text>

          <Flex gap={8} wrap style={{ margin: "16px 0" }}>
            <Button type="primary" icon={<PhoneOutlined />} href={`tel:${lead.phone}`}>
              Call {lead.phone}
            </Button>
            <Button
              icon={<WhatsAppOutlined />}
              style={{ background: "#25d366", borderColor: "#25d366", color: "#fff" }}
              href={`https://wa.me/${whatsappNumber(lead.phone)}?text=${encodeURIComponent(`Hi ${lead.name}, thanks for your inquiry about "${leadSubject(lead) ?? "my listing"}".`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </Button>
            {lead.email && (
              <Button icon={<MailOutlined />} href={`mailto:${lead.email}?subject=${encodeURIComponent(`About ${leadSubject(lead) ?? "your inquiry"}`)}`}>
                Email
              </Button>
            )}
          </Flex>

          <Card size="small" style={{ marginBottom: 16 }}>
            <Typography.Paragraph style={{ whiteSpace: "pre-line", margin: 0 }}>{lead.message}</Typography.Paragraph>
          </Card>

          {lead.property && (
            <Typography.Paragraph>
              About: <Link href={`/listings/${lead.property.id}`}>{lead.property.title}</Link>
            </Typography.Paragraph>
          )}
          {lead.project && (
            <Typography.Paragraph>
              About project: <Link href={`/projects/${lead.project.id}`}>{lead.project.name}</Link>
            </Typography.Paragraph>
          )}

          {!team && lead.assigned_to && (
            <Typography.Paragraph>
              <UserSwitchOutlined /> Assigned to <Typography.Text strong>{lead.assigned_to.name}</Typography.Text>
              {lead.assigned_at && <Typography.Text type="secondary"> · {formatDate(lead.assigned_at)}</Typography.Text>}
            </Typography.Paragraph>
          )}

          <Form form={form} layout="vertical" initialValues={{ status: lead.status, notes: lead.notes, assignee: currentAssignee }} onFinish={(values) => save.mutate(values)}>
            {team && (
              <Form.Item
                name="assignee"
                label="Assigned to"
                extra={lead.assigned_at ? `Assigned ${formatDate(lead.assigned_at, true)}. The agent gets an email when you assign a lead.` : "The agent gets an email and can follow up on this lead."}
              >
                <Select<AssigneeValue>
                  showSearch={{ optionFilterProp: "label" }}
                  options={[
                    { value: UNASSIGNED, label: "Unassigned" },
                    ...team,
                    // Keep a deactivated agent visible while the lead is still assigned to them.
                    ...(lead.assigned_to && !team.some((member) => member.value === lead.assigned_to?.id) ? [{ value: lead.assigned_to.id, label: `${lead.assigned_to.name} (inactive)` }] : []),
                  ]}
                />
              </Form.Item>
            )}
            <Form.Item name="status" label="Follow-up status">
              <Select options={toOptions(LEAD_STATUS_LABELS)} />
            </Form.Item>
            <Form.Item name="notes" label="Private notes">
              <Input.TextArea rows={4} maxLength={2000} placeholder="e.g. Called on Monday, visiting on Saturday." />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={save.isPending}>
              Save
            </Button>
          </Form>
        </>
      )}
    </Drawer>
  );
}

function LeadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = (searchParams.get("status") ?? "new") as LeadStatus | "all";
  const propertyId = searchParams.get("property_id") ?? undefined;
  const projectId = searchParams.get("project_id") ?? undefined;
  const assigneeId = searchParams.get("assigned_user_id") ?? undefined;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [exporting, setExporting] = useState(false);
  const { message, modal } = App.useApp();
  const { data: me } = useMe();
  const isAgency = me?.account_type === "agency";

  const filters = { status: status === "all" ? undefined : status, property_id: propertyId, project_id: projectId, assigned_user_id: assigneeId, search };

  const leads = useQuery({
    queryKey: ["leads", { ...filters, page }],
    queryFn: () => api<Paginated<Lead>>("portal/leads", { query: { ...filters, page } }),
  });

  const agents = useQuery({
    queryKey: ["agents"],
    queryFn: () => api<AgentsResponse>("portal/agents"),
    enabled: isAgency,
  });

  const team: TeamOption[] | null =
    isAgency && me
      ? [
          { value: me.id, label: `${me.name} (agency)` },
          ...(agents.data?.data ?? []).filter((agent) => agent.status === "active").map((agent) => ({ value: agent.id, label: agent.name })),
        ]
      : null;

  async function exportCsv() {
    setExporting(true);

    try {
      await apiDownload("portal/leads/export", { query: filters, fileName: `leads-${dayjs().format("YYYY-MM-DD")}.csv` });
    } catch (error) {
      if (isFeatureMissing(error)) {
        modal.confirm({
          title: "Lead export is not in your plan",
          content:
            me?.account_type === "agent"
              ? "Your agency's plan does not include downloading leads as CSV. Ask your agency to upgrade."
              : "Upgrade to a plan with Lead Export to download your leads as a spreadsheet (CSV).",
          okText: "View plans",
          cancelText: "Close",
          onOk: () => router.push("/plan"),
        });
      } else {
        message.error(errorMessage(error));
      }
    } finally {
      setExporting(false);
    }
  }

  function go(nextStatus: string, nextPropertyId?: string, nextAssigneeId: string | undefined = assigneeId, nextProjectId?: string) {
    const params = new URLSearchParams();

    if (nextStatus !== "new") {
      params.set("status", nextStatus);
    }

    if (nextPropertyId) {
      params.set("property_id", nextPropertyId);
    }

    if (nextProjectId) {
      params.set("project_id", nextProjectId);
    }

    if (nextAssigneeId) {
      params.set("assigned_user_id", nextAssigneeId);
    }

    setPage(1);
    router.replace(params.toString() ? `/leads?${params.toString()}` : "/leads");
  }

  const columns: ColumnsType<Lead> = [
    {
      title: "Received",
      dataIndex: "created_at",
      render: (value: string) => (
        <>
          <div>{dayjs(value).fromNow()}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatDate(value)}
          </Typography.Text>
        </>
      ),
    },
    {
      title: "Buyer",
      render: (_, lead) => (
        <>
          <Typography.Text strong>{lead.name}</Typography.Text>
          <div>
            <Typography.Text type="secondary">{lead.phone}</Typography.Text>
          </div>
        </>
      ),
    },
    {
      title: me?.account_type === "developer" ? "Listing / project" : "Listing",
      render: (_, lead) =>
        lead.project ? (
          <Flex align="center" gap={6}>
            <Tag color="geekblue" style={{ marginInlineEnd: 0 }}>
              Project
            </Tag>
            <Typography.Text ellipsis style={{ maxWidth: 200 }}>
              {lead.project.name}
            </Typography.Text>
          </Flex>
        ) : (
          <Typography.Text ellipsis style={{ maxWidth: 240 }}>
            {lead.property?.title ?? "—"}
          </Typography.Text>
        ),
    },
    ...(isAgency
      ? [
          { title: "Listing by", render: (_: unknown, lead: Lead) => lead.owner?.name ?? "—" },
          {
            title: "Assigned to",
            render: (_: unknown, lead: Lead) => (lead.assigned_to ? lead.assigned_to.name : <Typography.Text type="secondary">Unassigned</Typography.Text>),
          },
        ]
      : [
          {
            title: "Assigned",
            render: (_: unknown, lead: Lead) => (lead.assigned_to?.id === me?.id && lead.owner?.id !== me?.id ? <Tag color="purple">Assigned to you</Tag> : null),
          },
        ]),
    { title: "Message", dataIndex: "message", render: (value: string) => <Typography.Text ellipsis style={{ maxWidth: 280 }}>{value}</Typography.Text> },
    { title: "Status", dataIndex: "status", render: (value: LeadStatus) => <Tag color={LEAD_STATUS_COLORS[value]}>{LEAD_STATUS_LABELS[value]}</Tag> },
  ];

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={
          me?.account_type === "agent"
            ? "Buyers who messaged you about your listings, and leads your agency assigned to you"
            : me?.account_type === "developer"
              ? "Buyers who messaged you about your projects and listings"
              : "Buyers and tenants who messaged you about your listings"
        }
        extra={
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={() => void exportCsv()}>
            Export CSV
          </Button>
        }
      />

      <Card>
        <Flex justify="space-between" align="center" gap={12} wrap>
          <Tabs activeKey={status} items={TABS.map((tab) => ({ key: tab.key, label: tab.label }))} onChange={(key) => go(key, propertyId, assigneeId, projectId)} style={{ flex: 1, minWidth: 0 }} />
          {team && (
            <Select<number>
              allowClear
              placeholder="Any assignee"
              aria-label="Filter by assignee"
              style={{ minWidth: 200 }}
              value={assigneeId ? Number(assigneeId) : undefined}
              options={team}
              onChange={(value) => go(status, propertyId, value ? String(value) : undefined, projectId)}
            />
          )}
          <Input.Search
            placeholder="Name, phone or email"
            allowClear
            style={{ maxWidth: 260 }}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
        </Flex>

        {propertyId && (
          <Tag closable onClose={() => go(status)} style={{ marginBottom: 12 }}>
            Showing leads for listing #{propertyId}
          </Tag>
        )}

        {projectId && (
          <Tag closable onClose={() => go(status, undefined, assigneeId)} style={{ marginBottom: 12 }}>
            Showing leads for project #{projectId}
          </Tag>
        )}

        <Table
          rowKey="id"
          loading={leads.isLoading}
          dataSource={leads.data?.data}
          columns={columns}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: <Empty description={status === "new" ? "No new leads — you are all caught up" : "No leads here"} /> }}
          onRow={(lead) => ({ onClick: () => setSelected(lead), style: { cursor: "pointer" } })}
          pagination={{ current: page, pageSize: leads.data?.meta.per_page ?? 20, total: leads.data?.meta.total, onChange: setPage, hideOnSinglePage: true }}
        />
      </Card>

      <LeadDrawer lead={selected} team={team} onClose={() => setSelected(null)} />
    </>
  );
}

export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsContent />
    </Suspense>
  );
}
