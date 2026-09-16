"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Checkbox, Drawer, Flex, Form, InputNumber, Progress, Skeleton, Switch, Typography } from "antd";
import { useEffect } from "react";
import { api } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import type { AgentAllocation, AllocationCode, Collection, User } from "@/types/api";

type AllocationValues = { items: { code: AllocationCode; unlimited: boolean; limit: number | null }[]; reset_used: boolean };

const HINTS: Record<AllocationCode, string> = {
  LISTING: "Listings this agent may submit",
  FEATURED: "Times this agent may feature a listing",
  HOT: "Times this agent may make a listing hot",
  REFRESH: "Times this agent may refresh a listing to the top",
};

function toValues(allocations: AgentAllocation[]): AllocationValues {
  return {
    items: allocations.map((item) => ({ code: item.code, unlimited: item.limit === null, limit: item.limit })),
    reset_used: false,
  };
}

function UsageLine({ allocation, limit, unlimited }: { allocation: AgentAllocation; limit: number | null; unlimited: boolean }) {
  if (unlimited || limit === null) {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Used {allocation.used} · no cap, shares the agency&apos;s whole balance
      </Typography.Text>
    );
  }

  const remaining = Math.max(0, limit - allocation.used);
  const percent = limit === 0 ? 100 : Math.min(100, Math.round((allocation.used / limit) * 100));

  return (
    <>
      <Typography.Text type={remaining === 0 ? "danger" : "secondary"} style={{ fontSize: 12 }}>
        Used {allocation.used} of {limit} · {remaining} remaining
      </Typography.Text>
      <Progress percent={percent} size="small" showInfo={false} status={remaining === 0 ? "exception" : "normal"} style={{ margin: 0 }} />
    </>
  );
}

/** Per-agent caps on the agency's shared LISTING / FEATURED / HOT / REFRESH credits. */
export function AgentAllocationsDrawer({ agent, onClose }: { agent: User | null; onClose: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<AllocationValues>();
  const items = Form.useWatch("items", form);

  const allocations = useQuery({
    queryKey: ["agent-allocations", agent?.id],
    queryFn: () => api<Collection<AgentAllocation>>(`portal/agents/${agent?.id}/allocations`).then((response) => response.data),
    enabled: agent !== null,
  });

  useEffect(() => {
    if (allocations.data) {
      form.setFieldsValue(toValues(allocations.data));
    }
  }, [allocations.data, form]);

  const save = useMutation({
    mutationFn: (values: AllocationValues) =>
      api<Collection<AgentAllocation>>(`portal/agents/${agent?.id}/allocations`, {
        method: "PUT",
        body: {
          items: values.items.map((item) => ({ code: item.code, limit: item.unlimited ? null : (item.limit ?? 0) })),
          reset_used: values.reset_used,
        },
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(["agent-allocations", agent?.id], response.data);
      form.setFieldsValue(toValues(response.data));
      message.success(`Credit limits saved for ${agent?.name}`);
    },
    onError: (error) => {
      if (!applyFormErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  return (
    <Drawer
      open={agent !== null}
      onClose={onClose}
      size={460}
      title={agent ? `Credit limits · ${agent.name}` : "Credit limits"}
      destroyOnHidden
      footer={
        <Flex justify="flex-end" gap={8}>
          <Button onClick={onClose}>Close</Button>
          <Button type="primary" loading={save.isPending} disabled={!allocations.data} onClick={() => form.submit()}>
            Save limits
          </Button>
        </Flex>
      }
    >
      <Typography.Paragraph type="secondary">
        Agents use your agency&apos;s credits. Set a limit to stop one agent using more than their share; leave it unlimited to let them use the whole balance.
      </Typography.Paragraph>

      {allocations.isLoading ? (
        <Skeleton active />
      ) : allocations.isError || !allocations.data ? (
        <Alert type="error" showIcon title="Could not load the limits" description={errorMessage(allocations.error)} />
      ) : (
        <Form form={form} layout="vertical" requiredMark={false} initialValues={toValues(allocations.data)} onFinish={(values) => save.mutate(values)}>
          <Form.List name="items">
            {(fields) =>
              fields.map((field, index) => {
                const allocation = allocations.data[index];
                const current = items?.[index];

                if (!allocation) {
                  return null;
                }

                return (
                  <div key={field.key} className="allocation-row">
                    <Form.Item name={[field.name, "code"]} hidden>
                      <input />
                    </Form.Item>
                    <Flex justify="space-between" align="center" gap={12} wrap>
                      <div>
                        <Typography.Text strong>{allocation.name}</Typography.Text>
                        <div>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {HINTS[allocation.code] ?? ""}
                          </Typography.Text>
                        </div>
                      </div>
                      <Flex align="center" gap={8}>
                        <Form.Item name={[field.name, "unlimited"]} valuePropName="checked" noStyle>
                          <Switch checkedChildren="Unlimited" unCheckedChildren="Limited" aria-label={`${allocation.name}: unlimited`} />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "limit"]}
                          noStyle
                          rules={[{ required: !current?.unlimited, message: "Enter a limit" }]}
                        >
                          <InputNumber min={0} max={100000} precision={0} placeholder="Limit" disabled={current?.unlimited ?? true} style={{ width: 96 }} aria-label={`${allocation.name} limit`} />
                        </Form.Item>
                      </Flex>
                    </Flex>
                    <div style={{ marginTop: 8 }}>
                      <UsageLine allocation={allocation} limit={current?.unlimited ? null : (current?.limit ?? null)} unlimited={current?.unlimited ?? allocation.limit === null} />
                    </div>
                  </div>
                );
              })
            }
          </Form.List>

          <Form.Item name="reset_used" valuePropName="checked" style={{ marginTop: 16 }} extra="For example at the start of a month. Credits already used from the agency balance are not given back.">
            <Checkbox>Reset used counts to zero when saving</Checkbox>
          </Form.Item>
        </Form>
      )}
    </Drawer>
  );
}
