"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Form, Space } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeveloperOnly } from "@/components/developer-only";
import { PageHeader } from "@/components/page-header";
import { ProjectForm, formValuesToPayload, type ProjectFormValues } from "@/components/project-form";
import { api } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import type { Project, Resource } from "@/types/api";

function NewProjectContent() {
  const router = useRouter();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ProjectFormValues>();

  const createProject = useMutation({
    mutationFn: (values: ProjectFormValues) => api<Resource<Project>>("portal/projects", { method: "POST", body: formValuesToPayload(values) }),
    onSuccess: (response) => {
      message.success("Draft saved. Now add photos and brochures, then submit it for review.");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/projects/${response.data.id}`);
    },
    onError: (error) => {
      if (!applyFormErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  return (
    <>
      <PageHeader
        title="Add a project"
        subtitle="Saving creates a draft. Drafts are free — a Project Listings credit is only used when you submit for review."
        extra={
          <Space>
            <Link href="/projects">
              <Button>Cancel</Button>
            </Link>
            <Button type="primary" loading={createProject.isPending} onClick={() => form.submit()}>
              Save draft & add photos
            </Button>
          </Space>
        }
      />
      <Alert type="info" showIcon style={{ marginBottom: 16 }} title="Photos, videos and PDF brochures can be added once the draft is saved." />
      <ProjectForm form={form} onFinish={(values) => createProject.mutate(values)} />
    </>
  );
}

export default function NewProjectPage() {
  return (
    <DeveloperOnly>
      <NewProjectContent />
    </DeveloperOnly>
  );
}
