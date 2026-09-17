"use client";

import { EyeOutlined, MessageOutlined, SendOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Flex, Form, Result, Skeleton, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { DeveloperOnly } from "@/components/developer-only";
import { PageHeader } from "@/components/page-header";
import { ProjectActions } from "@/components/project-actions";
import { ProjectForm, formValuesToPayload, projectToFormValues, type ProjectFormValues } from "@/components/project-form";
import { ProjectMediaManager } from "@/components/project-media-manager";
import { PROJECT_CREDIT_CODE, projectCredits, useProjectActions } from "@/hooks/use-project-actions";
import { remainingFor, useQuotas } from "@/hooks/use-quotas";
import { ApiError, api } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import { CONSTRUCTION_STATUS_COLORS, CONSTRUCTION_STATUS_LABELS, PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS, formatDate, formatProjectPrice } from "@/lib/labels";
import type { Project, Resource } from "@/types/api";

function StatusBanner({ project, onResubmit }: { project: Project; onResubmit: () => void }) {
  const { goBuy, confirmRepost, submit } = useProjectActions();
  const quotas = useQuotas();
  const creditsLeft = remainingFor(quotas.data, PROJECT_CREDIT_CODE);
  const submitting = submit.isPending && submit.variables?.id === project.id;

  switch (project.status) {
    case "draft":
      return (
        <Alert
          type="info"
          showIcon
          title="Draft — add unit types, photos and brochures, then submit for review."
          description={`Submitting uses 1 Project Listings credit${creditsLeft === null ? "" : ` (you have ${projectCredits(creditsLeft)} left)`}. Drafts are free.`}
        />
      );
    case "pending":
      return (
        <Alert
          type="warning"
          showIcon
          title={`Under review since ${formatDate(project.submitted_at, true)}`}
          description="Editing is locked while our team reviews the project, so what they approve is what goes live. You can edit it again once an admin approves it, rejects it or asks for changes."
        />
      );
    case "rejected":
      return <Alert type="error" showIcon title="Rejected by our team" description={`${project.rejection_reason ?? "No reason given."} Fix the project and submit again — your credit was refunded.`} />;
    case "changes_requested":
      return (
        <Alert
          type="warning"
          showIcon
          title="Our team asked for changes before this project can go live"
          description={
            <>
              <div className="admin-note">
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                  Note from our team
                </Typography.Text>
                <Typography.Paragraph style={{ margin: 0, whiteSpace: "pre-line" }}>{project.rejection_reason ?? "No details given. Contact us if you are unsure what to change."}</Typography.Paragraph>
              </div>
              <Typography.Paragraph style={{ margin: "12px 0" }}>
                Edit the project below, then resubmit it. Resubmitting is free — no Project Listings credit is used.
              </Typography.Paragraph>
              <Button type="primary" icon={<SendOutlined />} loading={submitting} onClick={onResubmit}>
                Resubmit for review
              </Button>
            </>
          }
        />
      );
    case "published":
      return (
        <Alert
          type="success"
          showIcon
          title={project.expires_at ? `Live until ${formatDate(project.expires_at)}` : "Live"}
          description={
            <Space size="large" wrap>
              <span>
                <EyeOutlined /> {project.views_count} views
              </span>
              <span>
                <MessageOutlined /> {project.leads_count ?? 0} leads
              </span>
            </Space>
          }
        />
      );
    case "expired":
      return (
        <Alert
          type="warning"
          showIcon
          title={`Expired${project.expires_at ? ` on ${formatDate(project.expires_at)}` : ""}`}
          description={
            <>
              <Typography.Paragraph style={{ margin: "0 0 12px" }}>
                Re-post it to put it back on the website. It goes through review again, and re-posting uses 1 Project Listings credit
                {creditsLeft === null ? "." : ` (you have ${creditsLeft} left).`}
              </Typography.Paragraph>
              <Button type="primary" icon={<SendOutlined />} loading={submitting} onClick={() => (creditsLeft === 0 ? goBuy() : confirmRepost(project, creditsLeft))}>
                {creditsLeft === 0 ? "Buy Project Listings credits" : `Re-post${creditsLeft === null ? "" : ` (${creditsLeft} left)`}`}
              </Button>
            </>
          }
        />
      );
  }
}

function ProjectDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ProjectFormValues>();

  const project = useQuery({
    queryKey: ["project", id],
    queryFn: () => api<Resource<Project>>(`portal/projects/${id}`).then((response) => response.data),
  });

  useEffect(() => {
    if (project.data) {
      form.setFieldsValue(projectToFormValues(project.data));
    }
  }, [project.data, form]);

  const save = useMutation({
    // PUT with the full form, so the units list always replaces what is stored.
    mutationFn: (values: ProjectFormValues) => api<Resource<Project>>(`portal/projects/${id}`, { method: "PUT", body: formValuesToPayload(values) }),
    onSuccess: (response) => {
      message.success("Changes saved");
      queryClient.setQueryData(["project", id], response.data);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "PROJECT_STATE") {
        // It went under review in the meantime; reload so the page shows it locked.
        queryClient.invalidateQueries({ queryKey: ["project", id] });
      }

      if (!applyFormErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  const { confirmResubmit } = useProjectActions();

  /** Save unsaved edits first so the admin reviews the latest version; throws when the form is invalid or saving fails. */
  async function saveBeforeSubmit() {
    if (!form.isFieldsTouched()) {
      return;
    }

    const values = await form.validateFields();
    await save.mutateAsync(values);
  }

  async function resubmit() {
    if (!project.data) {
      return;
    }

    try {
      await saveBeforeSubmit();
    } catch {
      return;
    }

    confirmResubmit(project.data);
  }

  if (project.isError) {
    return <Result status="404" title="Project not found" extra={<Link href="/projects">Back to my projects</Link>} />;
  }

  if (!project.data) {
    return <Skeleton active />;
  }

  const current = project.data;
  const locked = current.status === "pending";

  return (
    <>
      <PageHeader
        title={
          <Flex align="center" gap={10} wrap>
            <span>{current.name}</span>
            <Tag color={PROJECT_STATUS_COLORS[current.status]}>{PROJECT_STATUS_LABELS[current.status]}</Tag>
            <Tag color={CONSTRUCTION_STATUS_COLORS[current.construction_status]}>{CONSTRUCTION_STATUS_LABELS[current.construction_status]}</Tag>
          </Flex>
        }
        subtitle={`${current.city?.name ?? ""}${current.society ? ` · ${current.society.name}` : ""} · ${formatProjectPrice(current.price_from, current.price_to)}`}
        extra={
          <Space wrap>
            {(current.leads_count ?? 0) > 0 && (
              <Link href={`/leads?status=all&project_id=${current.id}`}>
                <Button icon={<MessageOutlined />}>
                  {current.leads_count} lead{current.leads_count === 1 ? "" : "s"}
                </Button>
              </Link>
            )}
            <ProjectActions project={current} onDeleted={() => router.push("/projects")} beforeSubmit={saveBeforeSubmit} />
            {!locked && (
              <Button type="primary" ghost loading={save.isPending} onClick={() => form.submit()}>
                Save changes
              </Button>
            )}
          </Space>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <StatusBanner project={current} onResubmit={() => void resubmit()} />
      </div>

      <ProjectMediaManager project={current} disabled={locked} />

      <Typography.Title level={4} style={{ margin: "24px 0 12px" }}>
        Project details
      </Typography.Title>
      <ProjectForm form={form} disabled={locked} onFinish={(values) => save.mutate(values)} />
    </>
  );
}

export default function ProjectDetailPage() {
  return (
    <DeveloperOnly>
      <ProjectDetailContent />
    </DeveloperOnly>
  );
}
