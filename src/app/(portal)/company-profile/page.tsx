"use client";

import { ExportOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Result, Skeleton, Space, Tag } from "antd";
import { useEffect } from "react";
import { DeveloperOnly } from "@/components/developer-only";
import { DeveloperForm, EMPTY_DEVELOPER, developerToFormValues, formValuesToPayload, type DeveloperFormValues } from "@/components/developer-form";
import { PageHeader } from "@/components/page-header";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import { DEVELOPER_TYPE_LABELS } from "@/lib/labels";
import type { Developer, Resource } from "@/types/api";

const QUERY_KEY = ["developer-profile"];

/** The developer's own company page on the website (/developer/{slug}): every section, edited here. */
function CompanyProfile() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [form] = Form.useForm<DeveloperFormValues>();

  const developer = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api<{ data: Developer | null }>("portal/developer-profile").then((response) => response.data),
  });

  useEffect(() => {
    if (developer.data) {
      form.setFieldsValue(developerToFormValues(developer.data));
    } else if (developer.isSuccess) {
      // Before the first save, start from the account name.
      form.setFieldsValue({
        ...EMPTY_DEVELOPER,
        name: me?.name ?? "",
      } as DeveloperFormValues);
    }
  }, [developer.data, developer.isSuccess, form, me?.name]);

  /** Keep the cached record in step after a save or an image upload. */
  const onSaved = (saved: Developer) => {
    queryClient.setQueryData(QUERY_KEY, saved);
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const save = useMutation({
    mutationFn: (values: DeveloperFormValues) =>
      api<Resource<Developer>>("portal/developer-profile", {
        method: "PUT",
        body: formValuesToPayload(values),
      }),
    onSuccess: (response) => {
      message.success(developer.data ? "Company page saved" : "Company page created. It goes live once the team switches it on.");
      onSaved(response.data);
    },
    onError: (error) => {
      if (!applyFormErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  if (developer.isError) {
    return <Result status="error" title="Could not load your company page" subTitle={errorMessage(developer.error)} />;
  }

  const saved = developer.data ?? null;

  return (
    <>
      <PageHeader
        title="Company Profile"
        subtitle="Everything on your company page on the website: overview, story, team, gallery, contact and more"
        extra={
          <Space wrap>
            {saved && <Tag color="blue">{DEVELOPER_TYPE_LABELS[saved.company_type]}</Tag>}
            {saved && <Tag color={saved.is_active ? "green" : "orange"}>{saved.is_active ? "Live" : "Awaiting review"}</Tag>}
            {saved?.is_verified && <Tag color="green">Verified</Tag>}
            {saved?.is_active && (
              <Button icon={<ExportOutlined />} href={saved.public_url} target="_blank" rel="noopener noreferrer">
                View page
              </Button>
            )}
            <Button type="primary" loading={save.isPending} disabled={developer.isLoading} onClick={() => form.submit()}>
              {saved ? "Save" : "Create company page"}
            </Button>
          </Space>
        }
      />

      {developer.isLoading ? <Skeleton active paragraph={{ rows: 12 }} /> : <DeveloperForm form={form} developer={saved} onFinish={(values) => save.mutate(values)} onSaved={onSaved} />}
    </>
  );
}

export default function CompanyProfilePage() {
  return (
    <DeveloperOnly>
      <CompanyProfile />
    </DeveloperOnly>
  );
}
