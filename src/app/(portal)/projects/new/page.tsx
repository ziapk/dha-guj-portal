"use client";

import { DollarOutlined, FileTextOutlined, PictureOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Space } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeveloperOnly } from "@/components/developer-only";
import { ListingMediaPicker, type PendingMedia } from "@/components/listing-media-picker";
import { PortfolioProjectForm, portfolioValuesToPayload, type PortfolioFormValues } from "@/components/portfolio-project-form";
import { api, apiUpload } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import type { Project, ProjectMedia, Resource } from "@/types/api";

/** Uploads the photos and video links picked before the draft existed; returns how many failed. */
async function uploadPendingMedia(projectId: number, media: PendingMedia): Promise<number> {
  let failed = 0;

  for (const photo of media.photos) {
    const formData = new FormData();
    formData.append("type", "image");
    formData.append("file", photo.originFileObj as Blob);

    try {
      await apiUpload<Resource<ProjectMedia>>(`portal/projects/${projectId}/media`, formData);
    } catch {
      failed++;
    }
  }

  for (const url of media.videos) {
    try {
      await api(`portal/projects/${projectId}/media`, { method: "POST", body: { type: "video", url } });
    } catch {
      failed++;
    }
  }

  return failed;
}

/** Developer accounts add portfolio projects only: a short showcase on their company page. */
function NewProjectContent() {
  const router = useRouter();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<PortfolioFormValues>();
  const [media, setMedia] = useState<PendingMedia>({ photos: [], videos: [] });

  const createProject = useMutation({
    mutationFn: async (values: PortfolioFormValues) => {
      const response = await api<Resource<Project>>("portal/projects", { method: "POST", body: portfolioValuesToPayload(values) });
      const failed = await uploadPendingMedia(response.data.id, media);

      return { project: response.data, failed };
    },
    onSuccess: ({ project, failed }) => {
      if (failed > 0) {
        message.warning(`Draft saved, but ${failed} photo(s)/video(s) could not be uploaded. Add them again below.`);
      } else {
        message.success("Draft saved. Review it, then submit it for review.");
      }

      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/projects/${project.id}`);
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
          <h2>Showcase your projects in DHA Gujranwala</h2>
          <p>Add a project to the portfolio on your company page. Drafts are free — a Project Listings credit is only used when you submit for review.</p>
          <div className="lf-hero-steps">
            <span>
              <FileTextOutlined /> Project information
            </span>
            <span>
              <DollarOutlined /> Units & price range
            </span>
            <span>
              <PictureOutlined /> Good project photos
            </span>
          </div>
        </div>
      </div>

      <PortfolioProjectForm
        form={form}
        disabled={createProject.isPending}
        onFinish={(values) => createProject.mutate(values)}
        media={<ListingMediaPicker subject="project" value={media} onChange={setMedia} disabled={createProject.isPending} />}
      />

      <div className="lf-footer">
        <Space>
          <Link href="/projects">
            <Button size="large">Cancel</Button>
          </Link>
          <Button type="primary" size="large" loading={createProject.isPending} onClick={() => form.submit()}>
            {createProject.isPending && media.photos.length > 0 ? "Saving & uploading…" : "Save draft"}
          </Button>
        </Space>
      </div>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <DeveloperOnly>
      <NewProjectContent />
    </DeveloperOnly>
  );
}
