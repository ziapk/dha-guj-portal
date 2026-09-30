"use client";

import { CheckOutlined, DeleteOutlined, PictureOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { App, Button, Flex, Typography, Upload, type UploadFile } from "antd";
import type { Dispatch, SetStateAction } from "react";
import { SortableThumbs, VideoLinkInput } from "@/components/listing-inputs";
import { Field, QualityTip } from "@/components/listing-form";

const PHOTO_TARGET = 5;
/** Matches the API default (listings.max_photo_size_kb). */
const MAX_PHOTO_MB = 5;

export type PendingMedia = { photos: UploadFile[]; videos: string[] };

/**
 * Photos and video links picked before the listing exists. Nothing is uploaded here:
 * the page uploads them once the draft has been created.
 */
export function ListingMediaPicker({
  value,
  onChange,
  disabled,
}: {
  value: PendingMedia;
  onChange: Dispatch<SetStateAction<PendingMedia>>;
  disabled?: boolean;
}) {
  const { message } = App.useApp();
  return (
    <>
      <Field icon={<PictureOutlined />} label="Upload images of your property">
        <div className="lf-upload">
          <div className="lf-upload-actions">
            <PictureOutlined className="lf-upload-art" />
            <Upload
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={disabled}
              showUploadList={false}
              beforeUpload={(file) => {
                if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
                  message.warning(`${file.name} is larger than ${MAX_PHOTO_MB}MB and was skipped.`);
                  return Upload.LIST_IGNORE;
                }

                onChange((prev) => ({ ...prev, photos: [...prev.photos, { uid: file.uid, name: file.name, originFileObj: file, thumbUrl: URL.createObjectURL(file) }] }));
                return false;
              }}
            >
              <Button type="primary" disabled={disabled}>
                Upload images
              </Button>
            </Upload>
            <small>Max {MAX_PHOTO_MB}MB · JPG, PNG or WebP</small>
          </div>
          <ul className="lf-upload-tips">
            <li>
              <CheckOutlined /> Ads with pictures get far more views.
            </li>
            <li>
              <CheckOutlined /> Upload good quality pictures with proper lighting.
            </li>
            <li>
              <CheckOutlined /> The first photo is the cover; drag to reorder.
            </li>
          </ul>
        </div>

        {value.photos.length > 0 && (
          <>
            <SortableThumbs
              disabled={disabled}
              items={value.photos.map((photo) => ({ key: photo.uid, src: photo.thumbUrl, alt: photo.name }))}
              onReorder={(keys) => onChange((prev) => ({ ...prev, photos: keys.map((key) => prev.photos.find((photo) => photo.uid === key)!) }))}
              onRemove={(key) => onChange((prev) => ({ ...prev, photos: prev.photos.filter((photo) => photo.uid !== key) }))}
            />
            <div className="lf-field-hint" style={{ marginTop: 8 }}>
              Drag photos (or use the arrows) to set their order. It becomes the gallery order on the property page.
            </div>
          </>
        )}

        <div style={{ marginTop: 12 }}>
          <QualityTip text={`Add at least ${Math.max(0, PHOTO_TARGET - value.photos.length)} more images`} current={value.photos.length} target={PHOTO_TARGET} />
        </div>
      </Field>

      <Field icon={<VideoCameraOutlined />} label="Add a video of your property" hint="Upload the video to YouTube (or Vimeo) and paste the link here.">
        {value.videos.map((url) => (
          <Flex key={url} align="center" justify="space-between" gap={12} style={{ padding: "4px 0" }}>
            <Typography.Text ellipsis>{url}</Typography.Text>
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label="Remove video"
              disabled={disabled}
              onClick={() => onChange((prev) => ({ ...prev, videos: prev.videos.filter((item) => item !== url) }))}
            />
          </Flex>
        ))}
        <VideoLinkInput disabled={disabled} onAdd={(url) => onChange((prev) => (prev.videos.includes(url) ? prev : { ...prev, videos: [...prev.videos, url] }))} />
      </Field>
    </>
  );
}
