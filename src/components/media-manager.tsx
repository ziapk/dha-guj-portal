"use client";

import { DeleteOutlined, DragOutlined, PictureOutlined, PlusOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Empty, Flex, Popconfirm, Typography, Upload } from "antd";
import { useState } from "react";
import { api, apiUpload } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";
import { thumbnailUrl } from "@/lib/media";
import { SortableThumbs, VideoLinkInput } from "@/components/listing-inputs";
import type { Collection, Project, ProjectMedia, Property, PropertyMedia, Resource } from "@/types/api";

/** Upload, preview and remove a listing's photos and video links. `bare` leaves out the card, e.g. inside a form section. */
export function MediaManager({ property, disabled, bare = false }: { property: Property; disabled: boolean; bare?: boolean }) {
  return <PhotoAndVideoManager endpoint={`portal/properties/${property.id}/media`} queryKey={["listing", String(property.id)]} media={property.media ?? []} disabled={disabled} bare={bare} />;
}

/** The same photo and video editor for a portfolio project, inside its form section. */
export function ProjectPhotoManager({ project, disabled }: { project: Project; disabled: boolean }) {
  return <PhotoAndVideoManager endpoint={`portal/projects/${project.id}/media`} queryKey={["project", String(project.id)]} media={project.media ?? []} disabled={disabled} bare listKey="projects" />;
}

type Media = PropertyMedia | ProjectMedia;

function PhotoAndVideoManager({
  endpoint,
  queryKey,
  media,
  disabled,
  bare,
  listKey,
}: {
  /** The owner's media endpoint, e.g. portal/properties/5/media. */
  endpoint: string;
  /** The query holding the owner, whose `media` is updated in place on reorder. */
  queryKey: string[];
  media: Media[];
  disabled: boolean;
  bare: boolean;
  /** A list query to refresh as well, so its cover photos stay current. */
  listKey?: string;
}) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(0);

  const photos = media.filter((item) => item.type === "image");
  const videos = media.filter((item) => item.type === "video");
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey });

    if (listKey) {
      queryClient.invalidateQueries({ queryKey: [listKey] });
    }
  };

  const addVideo = useMutation({
    mutationFn: (url: string) =>
      api<Resource<Media>>(endpoint, { method: "POST", body: { type: "video", url } }),
    onSuccess: () => {
      message.success("Video added");
      refresh();
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  /** Saves the new photo order at once; videos keep their place after the photos. */
  const reorder = useMutation({
    mutationFn: (photoIds: number[]) =>
      api<Collection<Media>>(`${endpoint}/order`, { method: "PUT", body: { ids: [...photoIds, ...videos.map((video) => video.id)] } }),
    onMutate: (photoIds) => {
      // Show the new order straight away.
      const byId = new Map(media.map((item) => [item.id, item]));
      const ordered = photoIds.map((id, index) => ({ ...byId.get(id)!, is_cover: index === 0 }));
      queryClient.setQueryData<{ media?: Media[] }>(queryKey, (current) => (current ? { ...current, media: [...ordered, ...videos] } : current));
    },
    onSuccess: () => message.success("Photo order saved"),
    onError: (error) => message.error(errorMessage(error)),
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: (item: Media) => api(`${endpoint}/${item.id}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError: (error) => message.error(errorMessage(error)),
  });

  const content = (
    <>
      {photos.length > 0 && (
        <>
          <SortableThumbs
            disabled={disabled || reorder.isPending}
            items={photos.map((photo) => ({ key: photo.id, src: thumbnailUrl(photo), alt: "Photo" }))}
            onReorder={(keys) => reorder.mutate(keys.map(Number))}
            onRemove={(key) => {
              const photo = photos.find((item) => item.id === key);

              if (photo) {
                modal.confirm({ title: "Remove this photo?", okText: "Remove", okButtonProps: { danger: true }, onOk: () => remove.mutateAsync(photo) });
              }
            }}
          />
          {!disabled && (
            <Typography.Paragraph type="secondary" style={{ margin: "8px 0 0", fontSize: 12 }}>
              <DragOutlined /> Drag photos (or use the arrows) to change their order. The first photo is the cover, and this order is the gallery on the website.
            </Typography.Paragraph>
          )}
        </>
      )}

      {!disabled && (
        <Upload
          accept="image/jpeg,image/png,image/webp"
          multiple
          showUploadList={false}
          customRequest={({ file, onSuccess, onError }) => {
            const formData = new FormData();
            formData.append("type", "image");
            formData.append("file", file as Blob);
            setUploading((count) => count + 1);

            apiUpload<Resource<Media>>(endpoint, formData)
              .then((response) => {
                onSuccess?.(response);
                refresh();
              })
              .catch((error: Error) => {
                message.error(errorMessage(error));
                onError?.(error);
              })
              .finally(() => setUploading((count) => count - 1));
          }}
        >
          <Button icon={<PlusOutlined />} loading={uploading > 0} className="lf-outline-btn" style={{ marginTop: 12 }}>
            {uploading > 0 ? `Uploading ${uploading}…` : "Add photos"}
          </Button>
        </Upload>
      )}

      {photos.length === 0 && disabled && <Empty description="No photos" />}

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        <VideoCameraOutlined /> Video
      </Typography.Title>
      {!disabled && videos.length === 0 && (
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          Upload a walkthrough to YouTube (or Vimeo) and paste its link here.
        </Typography.Paragraph>
      )}
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
      {!disabled && <VideoLinkInput loading={addVideo.isPending} onAdd={(url) => addVideo.mutateAsync(url)} />}
    </>
  );

  if (bare) {
    return <div style={{ marginBottom: 20 }}>{content}</div>;
  }

  return (
    <Card
      title={
        <Flex align="center" gap={8}>
          <PictureOutlined /> Photos & video
        </Flex>
      }
      extra={<Typography.Text type="secondary">{photos.length} photo(s)</Typography.Text>}
      style={{ marginBottom: 16 }}
    >
      {content}
    </Card>
  );
}
