"use client";

import { DeleteOutlined, FilePdfOutlined, PictureOutlined, PlusOutlined, StarFilled, UploadOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Empty, Flex, Image, Input, Popconfirm, Tag, Typography, Upload } from "antd";
import { useState } from "react";
import { api, apiUpload } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";
import type { Project, ProjectMedia, ProjectMediaType, Resource } from "@/types/api";

/** Per-project limits enforced by the API. */
export const PROJECT_MEDIA_LIMITS: Record<ProjectMediaType, number> = { image: 40, video: 5, brochure: 5 };

const thumbnail = (media: ProjectMedia) => media.thumbnail_url || media.url;
const medium = (media: ProjectMedia) => media.medium_url || media.url;

/** Upload, preview and remove a project's photos, video links and PDF brochures. */
export function ProjectMediaManager({ project, disabled }: { project: Project; disabled: boolean }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState<Record<"image" | "brochure", number>>({ image: 0, brochure: 0 });

  const media = project.media ?? [];
  const photos = media.filter((item) => item.type === "image");
  const videos = media.filter((item) => item.type === "video");
  const brochures = media.filter((item) => item.type === "brochure");
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["project", String(project.id)] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const addVideo = useMutation({
    mutationFn: (url: string) => api<Resource<ProjectMedia>>(`portal/projects/${project.id}/media`, { method: "POST", body: { type: "video", url } }),
    onSuccess: () => {
      message.success("Video added");
      setVideoUrl("");
      refresh();
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (item: ProjectMedia) => api(`portal/projects/${project.id}/media/${item.id}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError: (error) => message.error(errorMessage(error)),
  });

  function upload(type: "image" | "brochure", file: Blob, onSuccess?: (response: unknown) => void, onError?: (error: Error) => void) {
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);
    setUploading((counts) => ({ ...counts, [type]: counts[type] + 1 }));

    apiUpload<Resource<ProjectMedia>>(`portal/projects/${project.id}/media`, formData)
      .then((response) => {
        onSuccess?.(response);
        refresh();
      })
      .catch((error: Error) => {
        message.error(errorMessage(error));
        onError?.(error);
      })
      .finally(() => setUploading((counts) => ({ ...counts, [type]: counts[type] - 1 })));
  }

  return (
    <Card
      title={
        <Flex align="center" gap={8}>
          <PictureOutlined /> Photos, videos & brochures
        </Flex>
      }
      extra={
        <Typography.Text type="secondary">
          {photos.length} / {PROJECT_MEDIA_LIMITS.image} photos
        </Typography.Text>
      }
      style={{ marginBottom: 16 }}
    >
      <Image.PreviewGroup>
        <div className="media-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="media-tile">
              <Image src={thumbnail(photo)} preview={{ src: medium(photo) }} alt="Project photo" />
              {photo.is_cover && (
                <Tag className="media-cover-badge" color="gold" icon={<StarFilled />}>
                  Cover
                </Tag>
              )}
              {!disabled && (
                <div className="media-tile-actions">
                  <Popconfirm title="Remove this photo?" onConfirm={() => remove.mutate(photo)}>
                    <Button size="small" danger icon={<DeleteOutlined />} aria-label="Remove photo" />
                  </Popconfirm>
                </div>
              )}
            </div>
          ))}

          {!disabled && photos.length < PROJECT_MEDIA_LIMITS.image && (
            <Upload
              accept="image/jpeg,image/png,image/webp"
              multiple
              showUploadList={false}
              customRequest={({ file, onSuccess, onError }) => upload("image", file as Blob, onSuccess, onError)}
            >
              <button type="button" className="upload-tile">
                <PlusOutlined style={{ fontSize: 22 }} />
                <span>{uploading.image > 0 ? `Uploading ${uploading.image}…` : "Add photos"}</span>
                <small>{photos.length === 0 ? "The first photo is the cover" : "JPG, PNG or WebP"}</small>
              </button>
            </Upload>
          )}
        </div>
      </Image.PreviewGroup>

      {photos.length === 0 && disabled && <Empty description="No photos" />}

      <Flex justify="space-between" align="baseline" style={{ marginTop: 24 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          <VideoCameraOutlined /> Videos
        </Typography.Title>
        <Typography.Text type="secondary">
          {videos.length} / {PROJECT_MEDIA_LIMITS.video}
        </Typography.Text>
      </Flex>
      {videos.map((video) => (
        <Flex key={video.id} align="center" justify="space-between" gap={12} style={{ padding: "6px 0" }}>
          <Typography.Link href={video.url} target="_blank" rel="noopener noreferrer" ellipsis>
            {video.url}
          </Typography.Link>
          {!disabled && (
            <Popconfirm title="Remove this video?" onConfirm={() => remove.mutate(video)}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label="Remove video" />
            </Popconfirm>
          )}
        </Flex>
      ))}
      {!disabled && videos.length < PROJECT_MEDIA_LIMITS.video && (
        <Input.Search
          placeholder="Paste a YouTube or Vimeo link"
          enterButton="Add video"
          value={videoUrl}
          loading={addVideo.isPending}
          onChange={(event) => setVideoUrl(event.target.value)}
          onSearch={(value) => value.trim() && addVideo.mutate(value.trim())}
          style={{ marginTop: 8 }}
        />
      )}

      <Flex justify="space-between" align="baseline" style={{ marginTop: 24 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          <FilePdfOutlined /> Brochures
        </Typography.Title>
        <Typography.Text type="secondary">
          {brochures.length} / {PROJECT_MEDIA_LIMITS.brochure}
        </Typography.Text>
      </Flex>
      {brochures.map((brochure) => (
        <Flex key={brochure.id} align="center" justify="space-between" gap={12} style={{ padding: "6px 0" }}>
          <Typography.Link href={brochure.url} target="_blank" rel="noopener noreferrer" ellipsis>
            <FilePdfOutlined /> {brochure.original_name ?? "Brochure.pdf"}
          </Typography.Link>
          {!disabled && (
            <Popconfirm title="Remove this brochure?" onConfirm={() => remove.mutate(brochure)}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label="Remove brochure" />
            </Popconfirm>
          )}
        </Flex>
      ))}
      {brochures.length === 0 && disabled && <Typography.Text type="secondary">No brochures</Typography.Text>}
      {!disabled && brochures.length < PROJECT_MEDIA_LIMITS.brochure && (
        <Upload accept="application/pdf" multiple showUploadList={false} customRequest={({ file, onSuccess, onError }) => upload("brochure", file as Blob, onSuccess, onError)}>
          <Button icon={<UploadOutlined />} loading={uploading.brochure > 0} style={{ marginTop: 8 }}>
            {uploading.brochure > 0 ? `Uploading ${uploading.brochure}…` : "Upload PDF brochure"}
          </Button>
        </Upload>
      )}
      {!disabled && brochures.length < PROJECT_MEDIA_LIMITS.brochure && (
        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 4 }}>
          PDF up to 20 MB, e.g. price list, payment plan or master plan.
        </Typography.Text>
      )}
    </Card>
  );
}
