"use client";

import { CheckOutlined, DeleteOutlined, PictureOutlined, PlusOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { App, Button, Flex, Input, Typography, Upload, type UploadFile } from "antd";
import { useState, type Dispatch, type SetStateAction } from "react";
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
  const [videoUrl, setVideoUrl] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);

  function addVideo() {
    const url = videoUrl.trim();

    if (url) {
      onChange((prev) => (prev.videos.includes(url) ? prev : { ...prev, videos: [...prev.videos, url] }));
    }

    setVideoUrl("");
    setAddingVideo(false);
  }

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
              <CheckOutlined /> The first photo is used as the cover.
            </li>
          </ul>
        </div>

        {value.photos.length > 0 && (
          <div className="lf-thumbs">
            {value.photos.map((photo, index) => (
              <div key={photo.uid} className="lf-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img src={photo.thumbUrl} alt={photo.name} />
                {index === 0 && <span className="lf-thumb-cover">Cover</span>}
                <button
                  type="button"
                  aria-label="Remove photo"
                  disabled={disabled}
                  onClick={() => onChange((prev) => ({ ...prev, photos: prev.photos.filter((item) => item.uid !== photo.uid) }))}
                >
                  <DeleteOutlined />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <QualityTip text={`Add at least ${Math.max(0, PHOTO_TARGET - value.photos.length)} more images`} current={value.photos.length} target={PHOTO_TARGET} />
        </div>
      </Field>

      <Field icon={<VideoCameraOutlined />} label="Add videos of your property" hint="Upload the video to YouTube and paste the link here.">
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
        {addingVideo ? (
          <Input.Search
            autoFocus
            placeholder="Paste a YouTube or Vimeo link"
            enterButton="Add"
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
            onSearch={addVideo}
            onBlur={() => !videoUrl && setAddingVideo(false)}
          />
        ) : (
          <Button icon={<PlusOutlined />} disabled={disabled} onClick={() => setAddingVideo(true)} className="lf-outline-btn">
            Add video
          </Button>
        )}
      </Field>
    </>
  );
}
