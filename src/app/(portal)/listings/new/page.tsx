"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Form, Space } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListingForm, formValuesToPayload, type ListingFormValues } from "@/components/listing-form";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import type { Property, Resource } from "@/types/api";

export default function NewListingPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ListingFormValues>();

  const createListing = useMutation({
    mutationFn: (values: ListingFormValues) =>
      api<Resource<Property>>("portal/properties", { method: "POST", body: formValuesToPayload(values) }),
    onSuccess: (response) => {
      message.success("Draft saved. Now add photos, then submit it for review.");
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["listings-total"] });
      router.push(`/listings/${response.data.id}`);
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
        title="Add a listing"
        subtitle="Saving creates a draft. Drafts are free — a listing credit is only used when you submit for review."
        extra={
          <Space>
            <Link href="/listings">
              <Button>Cancel</Button>
            </Link>
            <Button type="primary" loading={createListing.isPending} onClick={() => form.submit()}>
              Save draft & add photos
            </Button>
          </Space>
        }
      />
      <Alert type="info" showIcon style={{ marginBottom: 16 }} title="Tip: listings with at least 5 clear photos get far more calls." />
      <ListingForm form={form} onFinish={(values) => createListing.mutate(values)} />
    </>
  );
}
