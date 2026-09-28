"use client";

import { DollarOutlined, FileTextOutlined, PictureOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Space } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ListingForm, formValuesToPayload, type ListingFormValues } from "@/components/listing-form";
import { ListingMediaPicker, type PendingMedia } from "@/components/listing-media-picker";
import { api, apiUpload } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import type { Property, PropertyMedia, Resource } from "@/types/api";

/** Uploads the photos and video links picked before the draft existed; returns how many failed. */
async function uploadPendingMedia(propertyId: number, media: PendingMedia): Promise<number> {
  let failed = 0;

  for (const photo of media.photos) {
    const formData = new FormData();
    formData.append("type", "image");
    formData.append("file", photo.originFileObj as Blob);

    try {
      await apiUpload<Resource<PropertyMedia>>(`portal/properties/${propertyId}/media`, formData);
    } catch {
      failed++;
    }
  }

  for (const url of media.videos) {
    try {
      await api(`portal/properties/${propertyId}/media`, { method: "POST", body: { type: "video", url } });
    } catch {
      failed++;
    }
  }

  return failed;
}

export default function NewListingPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ListingFormValues>();
  const [media, setMedia] = useState<PendingMedia>({ photos: [], videos: [] });

  const createListing = useMutation({
    mutationFn: async (values: ListingFormValues) => {
      const response = await api<Resource<Property>>("portal/properties", { method: "POST", body: formValuesToPayload(values) });
      const failed = await uploadPendingMedia(response.data.id, media);

      return { property: response.data, failed };
    },
    onSuccess: ({ property, failed }) => {
      if (failed > 0) {
        message.warning(`Draft saved, but ${failed} photo(s)/video(s) could not be uploaded. Add them again below.`);
      } else {
        message.success("Draft saved. Review it, then submit it for review.");
      }

      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["listings-total"] });
      router.push(`/listings/${property.id}`);
    },
    onError: (error) => {
      if (!applyFormErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  return (
    <div className="listing-create">
      <div className="lf-hero">
        <div>
          <h2>Reach thousands of buyers in DHA Gujranwala</h2>
          <p>In a few simple steps. Drafts are free — a listing credit is only used when you submit for review.</p>
          <div className="lf-hero-steps">
            <span>
              <FileTextOutlined /> Listing information
            </span>
            <span>
              <DollarOutlined /> Property price
            </span>
            <span>
              <PictureOutlined /> Good property images
            </span>
          </div>
        </div>
      </div>

      <ListingForm
        form={form}
        disabled={createListing.isPending}
        onFinish={(values) => createListing.mutate(values)}
        media={<ListingMediaPicker value={media} onChange={setMedia} disabled={createListing.isPending} />}
      />

      <div className="lf-footer">
        <Space>
          <Link href="/listings">
            <Button size="large">Cancel</Button>
          </Link>
          <Button type="primary" size="large" loading={createListing.isPending} onClick={() => form.submit()}>
            {createListing.isPending && media.photos.length > 0 ? "Saving & uploading…" : "Save draft"}
          </Button>
        </Space>
      </div>
    </div>
  );
}
