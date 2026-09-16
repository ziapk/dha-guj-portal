"use client";

import { DeleteOutlined, PictureOutlined, PlusOutlined, StarFilled, VideoCameraOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Empty, Flex, Image, Input, Popconfirm, Tag, Typography, Upload } from "antd";
import { useState } from "react";
import { api, apiUpload } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";
import { mediumUrl, thumbnailUrl } from "@/lib/media";
import type { Property, PropertyMedia, Resource } from "@/types/api";

/** Upload, preview and remove a listing's photos and video links. */
export function MediaManager({ property, disabled }: { property: Property; disabled: boolean }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(0);

  const media = property.media ?? [];
  const photos = media.filter((item) => item.type === "image");
  const videos = media.filter((item) => item.type === "video");
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["listing", String(property.id)] });

  const addVideo = useMutation({
    mutationFn: (url: string) =>
      api<Resource<PropertyMedia>>(`portal/properties/${property.id}/media`, { method: "POST", body: { type: "video", url } }),
    onSuccess: () => {
      message.success("Video added");
      setVideoUrl("");
      refresh();
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (item: PropertyMedia) => api(`portal/properties/${property.id}/media/${item.id}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError: (error) => message.error(errorMessage(error)),
  });

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
      <Image.PreviewGroup>
        <div className="media-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="media-tile">
              <Image src={thumbnailUrl(photo)} preview={{ src: mediumUrl(photo) }} alt="Listing photo" />
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

                apiUpload<Resource<PropertyMedia>>(`portal/properties/${property.id}/media`, formData)
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
              <button type="button" className="upload-tile">
                <PlusOutlined style={{ fontSize: 22 }} />
                <span>{uploading > 0 ? `Uploading ${uploading}…` : "Add photos"}</span>
                <small>JPG, PNG or WebP</small>
              </button>
            </Upload>
          )}
        </div>
      </Image.PreviewGroup>

      {photos.length === 0 && disabled && <Empty description="No photos" />}

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        <VideoCameraOutlined /> Video
      </Typography.Title>
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
      {!disabled && (
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
    </Card>
  );
}
